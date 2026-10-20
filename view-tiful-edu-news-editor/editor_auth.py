"""Stateless editor access: validated Supabase JWT in an HttpOnly cookie."""
import base64
from dataclasses import dataclass
from html import escape
import json
import os
import posixpath
import time
from urllib.parse import unquote, urlsplit
from uuid import UUID

import httpx
from fastapi import HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

COOKIE_NAME = "editor_access_token"
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@dataclass(frozen=True)
class AuthSettings:
    supabase_url: str
    publishable_key: str
    main_origin: str
    editor_origin: str
    main_site_url: str
    cookie_secure: bool
    cookie_samesite: str

    @classmethod
    def from_env(cls):
        main_origin = os.getenv("MAIN_SITE_ORIGIN", "http://127.0.0.1:5500").rstrip("/")
        editor_origin = os.getenv("EDITOR_ORIGIN", "http://127.0.0.1:8002").rstrip("/")
        secure_value = os.getenv("EDITOR_COOKIE_SECURE", "false").lower()
        if secure_value not in {"true", "false"}:
            raise ValueError("EDITOR_COOKIE_SECURE must be true or false")
        samesite = os.getenv("EDITOR_COOKIE_SAMESITE", "lax").lower()
        if samesite not in {"lax", "strict", "none"}:
            raise ValueError("Invalid EDITOR_COOKIE_SAMESITE")
        secure = secure_value == "true"
        if samesite == "none" and not secure:
            raise ValueError("SameSite=None requires Secure cookies")
        for origin in (main_origin, editor_origin):
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
                raise ValueError("Authentication origins must be exact HTTP(S) origins")
        main_site_url = os.getenv("MAIN_SITE_URL", main_origin + "/view-tiful-edu-news-design/")
        parsed_site = urlsplit(main_site_url)
        if f"{parsed_site.scheme}://{parsed_site.netloc}" != main_origin:
            raise ValueError("MAIN_SITE_URL must belong to MAIN_SITE_ORIGIN")
        return cls(os.getenv("SUPABASE_URL", "").rstrip("/"),
                   os.getenv("SUPABASE_PUBLISHABLE_KEY", ""), main_origin,
                   editor_origin, main_site_url, secure, samesite)


def settings(request):
    return request.app.state.editor_auth_settings


def check_origin(request, config):
    if (request.headers.get("origin") not in {config.main_origin, config.editor_origin}
            or request.headers.get("x-viewtiful-editor") != "1"):
        raise HTTPException(403, "허용되지 않는 요청입니다.")


def token_expiry(token):
    # This only bounds expiry; identity/signature are ALWAYS verified by Supabase.
    try:
        if not token or len(token) > 8192 or len(token.split(".")) != 3:
            raise ValueError()
        payload = token.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        expiry = claims["exp"]
        if isinstance(expiry, bool) or not isinstance(expiry, int) or expiry <= time.time():
            raise ValueError()
        return expiry
    except (ValueError, KeyError, TypeError, UnicodeError):
        raise HTTPException(401, "인증이 만료되었거나 올바르지 않습니다. 메인에서 편집실을 다시 연결해 주세요.") from None


async def verify_token(request, token):
    expiry = token_expiry(token)
    config = settings(request)
    if not config.supabase_url.startswith("https://") or not config.publishable_key.startswith("sb_publishable_"):
        raise HTTPException(503, "편집실 인증 설정을 확인해 주세요.")
    headers = {"apikey": config.publishable_key, "Authorization": "Bearer " + token}
    try:
        client = request.app.state.editor_auth_http
        user_response = await client.get(config.supabase_url + "/auth/v1/user", headers=headers)
        if user_response.status_code in {401, 403}:
            raise HTTPException(401, "인증이 만료되었거나 올바르지 않습니다. 메인에서 편집실을 다시 연결해 주세요.")
        if user_response.status_code != 200:
            raise HTTPException(503, "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.")
        user_id = str(UUID(user_response.json()["id"]))
        profile_response = await client.get(config.supabase_url + "/rest/v1/profiles",
            headers={**headers, "Accept-Profile": "public"},
            params={"select": "role", "id": "eq." + user_id})
        if profile_response.status_code == 401:
            raise HTTPException(401, "인증이 만료되었습니다. 메인에서 편집실을 다시 연결해 주세요.")
        if profile_response.status_code == 403:
            raise HTTPException(403, "편집실 접근 권한을 확인할 수 없습니다.")
        if profile_response.status_code != 200:
            raise HTTPException(503, "권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.")
        profiles = profile_response.json()
        if not isinstance(profiles, list) or len(profiles) != 1 or profiles[0].get("role") not in {"reporter", "admin"}:
            raise HTTPException(403, "기자 또는 관리자만 편집실을 사용할 수 있습니다.")
        if expiry <= time.time():
            raise HTTPException(401, "인증이 만료되었습니다. 메인에서 편집실을 다시 연결해 주세요.")
        return {"id": user_id, "role": profiles[0]["role"]}, expiry
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError):
        raise HTTPException(503, "인증 또는 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.") from None


def delete_cookie(response, config):
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True,
                           secure=config.cookie_secure, samesite=config.cookie_samesite)


async def create_session(request: Request):
    # Only the Authorization header is accepted for the initial handoff.
    auth = request.headers.get("authorization", "").split()
    if len(auth) != 2 or auth[0].lower() != "bearer":
        raise HTTPException(401, "로그인 후 메인에서 편집실을 연결해 주세요.")
    user, expiry = await verify_token(request, auth[1])
    config = settings(request)
    response = JSONResponse({"role": user["role"]}, headers={"Cache-Control": "no-store"})
    response.set_cookie(COOKIE_NAME, auth[1], max_age=max(0, int(expiry - time.time())),
                        path="/", httponly=True, secure=config.cookie_secure,
                        samesite=config.cookie_samesite)
    return response


async def remove_session(request: Request):
    # Deliberately does not require a cookie or a valid access token.
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    delete_cookie(response, settings(request))
    return response


def normalized_path(path):
    # StaticFiles resolves dot segments; do not allow an equivalent HTML alias.
    for _ in range(4):
        decoded = unquote(path)
        if decoded == path:
            break
        path = decoded
    return "/" + posixpath.normpath(path.replace("\\", "/")).lstrip("/")


class EditorAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        config = settings(request)
        path = normalized_path(request.url.path)
        if request.method == "OPTIONS":
            return Response(status_code=204)
        static_html = path.lower().startswith("/static/") and any(
            part.split(":", 1)[0].rstrip(" .").lower().endswith((".html", ".htm"))
            for part in path.split("/")[2:])
        if static_html:
            return JSONResponse({"detail": "이 경로로는 편집실을 열 수 없습니다."}, status_code=404,
                                headers={"Cache-Control": "no-store"})
        protected = path == "/" or path == "/api" or path.startswith("/api/")
        exempt = ((path == "/api/auth/session" and request.method in {"POST", "DELETE"})
                  or (path == "/healthz" and request.method in {"GET", "HEAD"}))
        if protected and request.method in MUTATING_METHODS:
            try:
                check_origin(request, config)
            except HTTPException as error:
                # An untrusted Origin must not be able to clear an existing cookie.
                return JSONResponse({"detail": error.detail}, status_code=error.status_code,
                                    headers={"Cache-Control": "no-store"})
        try:
            if protected and not exempt:
                request.state.editor_user, _ = await verify_token(request, request.cookies.get(COOKIE_NAME))
        except HTTPException as error:
            if path == "/":
                link = escape(config.main_site_url, quote=True)
                response = HTMLResponse('<!doctype html><html lang="ko"><meta charset="utf-8">'
                    '<title>편집실 접근 안내</title><h1>편집실 접근 안내</h1><p>' + escape(error.detail)
                    + '</p><a href="' + link + '">메인으로 돌아가기</a></html>', status_code=error.status_code)
            else:
                response = JSONResponse({"detail": error.detail}, status_code=error.status_code)
            if error.status_code in {401, 403}:
                delete_cookie(response, config)
            response.headers["Cache-Control"] = "no-store"
            return response
        response = await call_next(request)
        if protected or path == "/healthz":
            response.headers["Cache-Control"] = "no-store"
        return response
