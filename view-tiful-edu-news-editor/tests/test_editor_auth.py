"""Stateless editor auth integration tests. All Supabase HTTP is mocked."""
import base64
from dataclasses import replace
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
import main
from editor_auth import COOKIE_NAME, AuthSettings

USER_ID = "11111111-1111-4111-8111-111111111111"
MAIN = "http://127.0.0.1:5500"
EDITOR = "http://127.0.0.1:8002"
CSRF = {"Origin": EDITOR, "X-Viewtiful-Editor": "1"}


def token(exp=None):
    def encode(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    return encode({"alg": "RS256"}) + "." + encode({"exp": exp if exp is not None else int(time.time()) + 3600}) + ".mock-signature"


class EditorAuthTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.role = "reporter"
        self.auth_status = 200
        self.profile_status = 200
        self.profiles_missing = False
        self.timeout = False
        self.calls = []
        config = replace(main.app.state.editor_auth_settings,
                         supabase_url="https://auth-test.invalid", publishable_key="sb_publishable_test",
                         main_origin=MAIN, editor_origin=EDITOR,
                         main_site_url=MAIN + "/view-tiful-edu-news-design/", cookie_secure=False, cookie_samesite="lax")
        self.config_patch = patch.object(main.app.state, "editor_auth_settings", config)
        self.config_patch.start(); self.addCleanup(self.config_patch.stop)
        self.db_patch = patch.object(main, "DATABASE", Path(self.tmp.name) / "test.sqlite3")
        self.db_patch.start(); self.addCleanup(self.db_patch.stop)
        real_async_client = httpx.AsyncClient
        self.http_patch = patch.object(main.httpx, "AsyncClient", side_effect=lambda **kwargs:
            real_async_client(**kwargs, transport=httpx.MockTransport(self.upstream)))
        self.http_patch.start(); self.addCleanup(self.http_patch.stop)
        self.client = TestClient(main.app, base_url=EDITOR)
        self.client.__enter__(); self.addCleanup(self.client.__exit__, None, None, None)
        self.token = token()

    def upstream(self, request):
        self.calls.append(request)
        self.assertEqual(request.headers["apikey"], "sb_publishable_test")
        self.assertTrue(request.headers["authorization"].startswith("Bearer "))
        if self.timeout:
            raise httpx.ReadTimeout("mock timeout", request=request)
        if request.url.path == "/auth/v1/user":
            # Deliberately return admin metadata even for the user role.
            return httpx.Response(self.auth_status, json={"id": USER_ID, "user_metadata": {"role": "admin"}})
        self.assertEqual(request.url.path, "/rest/v1/profiles")
        self.assertEqual(request.url.params["id"], "eq." + USER_ID)
        self.assertEqual(request.url.params["select"], "role")
        self.assertEqual(request.headers["accept-profile"], "public")
        return httpx.Response(self.profile_status, json=[] if self.profiles_missing else [{"role": self.role}])

    def connect(self, value=None):
        return self.client.post("/api/auth/session", headers={
            "Origin": MAIN, "X-Viewtiful-Editor": "1", "Authorization": "Bearer " + (value or self.token)})

    def test_reporter_and_admin_get_cookie_and_access(self):
        for role in ("reporter", "admin"):
            with self.subTest(role=role):
                self.role = role
                response = self.connect()
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), {"role": role})
                cookie = response.headers["set-cookie"]
                self.assertIn("HttpOnly", cookie)
                self.assertIn("SameSite=lax", cookie)
                self.assertIn("Path=/", cookie)
                self.assertNotIn("Secure", cookie)
                self.assertNotIn(self.token, response.text)
                self.assertEqual(self.client.get("/").status_code, 200)
                self.assertEqual(self.client.get("/api/articles").status_code, 200)
                self.assertEqual(self.client.get("/api/health").status_code, 200)

    def test_anonymous_routes_blocked_before_business_handlers(self):
        for route in main.app.routes:
            if not getattr(route, "path", "").startswith("/api/") or route.path == "/api/auth/session":
                continue
            url = route.path.replace("{article_id}", "missing").replace("{material_id}", "missing").replace("{format}", "docx")
            for method in route.methods - {"OPTIONS", "HEAD"}:
                with self.subTest(method=method, path=url):
                    self.assertEqual(self.client.request(method, url, headers=CSRF).status_code, 401)
        self.assertEqual(self.client.get("/").status_code, 401)
        self.assertEqual(self.calls, [])

    def test_user_and_missing_profile_blocked_metadata_ignored(self):
        self.role = "user"
        self.assertEqual(self.connect().status_code, 403)
        self.profiles_missing = True
        self.assertEqual(self.connect().status_code, 403)
        self.assertNotIn(COOKIE_NAME, self.client.cookies)

    def test_invalid_expired_and_upstream_rejected_tokens(self):
        self.assertEqual(self.connect("invalid").status_code, 401)
        self.assertEqual(self.connect(token(int(time.time()) - 10)).status_code, 401)
        self.assertEqual(self.calls, [])
        self.auth_status = 401
        self.assertEqual(self.connect().status_code, 401)
        self.assertNotIn(COOKIE_NAME, self.client.cookies)

    def test_initial_handoff_only_accepts_authorization_header(self):
        self.client.cookies.set(COOKIE_NAME, self.token)
        response = self.client.post("/api/auth/session?access_token=" + self.token,
            headers=CSRF, json={"access_token": self.token})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.calls, [])

    def test_role_is_rechecked_on_each_cookie_request(self):
        self.connect()
        self.role = "user"
        response = self.client.get("/api/articles")
        self.assertEqual(response.status_code, 403)
        self.assertIn("Max-Age=0", response.headers["set-cookie"])

    def test_auth_outage_fails_closed_without_deleting_valid_cookie(self):
        self.connect()
        self.timeout = True
        response = self.client.get("/api/articles")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("set-cookie", response.headers)
        self.assertNotIn(self.token, response.text)

    def test_expired_cookie_is_rejected(self):
        self.client.cookies.set(COOKIE_NAME, token(int(time.time()) - 10))
        self.assertEqual(self.client.get("/api/health").status_code, 401)
        self.assertEqual(self.calls, [])

    def test_delete_without_cookie_or_with_expired_cookie_never_calls_supabase(self):
        for value in (None, token(int(time.time()) - 10), "tampered"):
            self.client.cookies.clear()
            if value:
                self.client.cookies.set(COOKIE_NAME, value)
            response = self.client.delete("/api/auth/session", headers=CSRF)
            self.assertEqual(response.status_code, 204)
            self.assertIn("Max-Age=0", response.headers["set-cookie"])
            self.assertIn("HttpOnly", response.headers["set-cookie"])
        self.assertEqual(self.calls, [])

    def test_csrf_rejects_missing_or_wrong_origin_or_header_without_cookie_change(self):
        self.connect()
        for headers in ({}, {"Origin": MAIN}, {"Origin": "http://127.0.0.1:9999", "X-Viewtiful-Editor": "1"}):
            for method, url in (("DELETE", "/api/auth/session"), ("POST", "/api/articles")):
                response = self.client.request(method, url, headers=headers)
                self.assertEqual(response.status_code, 403)
                self.assertNotIn("set-cookie", response.headers)
        self.assertIn(COOKIE_NAME, self.client.cookies)

    def test_cookie_mutation_and_pdf_export_authentication(self):
        self.connect()
        response = self.client.post("/api/articles", headers=CSRF, json={"original_text": "인증된 테스트 기사"})
        self.assertEqual(response.status_code, 201)
        article_id = response.json()["id"]
        self.assertEqual(self.client.get("/api/materials/missing/file").status_code, 404)
        # Reaching 409 proves the existing approval gate still runs after authentication.
        self.assertEqual(self.client.get(f"/api/articles/{article_id}/export/docx?approval_id=missing").status_code, 409)

    def test_static_html_aliases_blocked_assets_public_docs_disabled(self):
        for url in ("/static/index.html", "/static/./index.html", "/static/%69ndex.html", "/static/index.html/", "/static/index.html.", "/static/index.html%20", "/static/index.html::$DATA"):
            self.assertEqual(self.client.get(url, follow_redirects=False).status_code, 404)
        self.assertEqual(self.client.get("/static/app.js").status_code, 200)
        for url in ("/docs", "/redoc", "/openapi.json"):
            self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.get("/healthz").json(), {"status": "ok"})

    def test_cors_preflight_and_error_headers(self):
        headers={"Origin": MAIN, "Access-Control-Request-Method": "POST",
                 "Access-Control-Request-Headers": "authorization,x-viewtiful-editor"}
        response=self.client.options("/api/auth/session", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], MAIN)
        self.assertEqual(response.headers["access-control-allow-credentials"], "true")
        self.assertEqual(self.calls, [])
        headers["Origin"] = "http://127.0.0.1:9999"
        self.assertEqual(self.client.options("/api/auth/session", headers=headers).status_code, 400)
        response=self.client.get("/api/articles", headers={"Origin": MAIN})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["access-control-allow-origin"], MAIN)

    def test_secure_samesite_settings_validation(self):
        with patch.dict("os.environ", {"EDITOR_COOKIE_SECURE": "true", "EDITOR_COOKIE_SAMESITE": "none"}):
            config = AuthSettings.from_env()
            self.assertTrue(config.cookie_secure)
            self.assertEqual(config.cookie_samesite, "none")
        with patch.dict("os.environ", {"EDITOR_COOKIE_SECURE": "false", "EDITOR_COOKIE_SAMESITE": "none"}):
            with self.assertRaises(ValueError):
                AuthSettings.from_env()


if __name__ == "__main__":
    unittest.main()