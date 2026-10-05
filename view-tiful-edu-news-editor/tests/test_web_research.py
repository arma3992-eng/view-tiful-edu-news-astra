"""웹 검색 provenance·실제 본문·교차 대조 한계. 외부 네트워크는 모의 처리한다."""
import unittest
from unittest.mock import patch
from web_research import (MAX_WEB_PAGES, attach_research, canonical_url, read_candidate, research_sources,
                          search_candidates, site_group)


def search_response(urls=None):
    urls = urls or ["https://school.example.edu/notice", "https://press.example.com/report"]
    return {"status": "completed", "usage": {"input_tokens": 10, "output_tokens": 10}, "output": [
        {"type": "web_search_call", "status": "completed", "action": {
            "type": "search", "queries": ["기관 실시일 공식 안내", "실시일 별개 취재 확인"],
            "sources": [{"type": "url", "url": url} for url in urls]}},
        {"type": "message", "content": [{"type": "output_text", "text": "이 검색 요약은 근거로 사용하지 않는다.",
            "annotations": [{"type": "url_citation", "url": url, "title": "검색 출처"} for url in urls]}]}]}


def read_fixture(url):
    return {"title": "실제 읽은 공지" if "school." in url else "실제 읽은 취재 기사", "media_type": "text/html",
            "source_url": url, "warning": "", "pages": [{"page": 1, "locator": "본문",
            "text": ("기관 안내: " if "school." in url else "독자 확인 자료: ") + "실시일은 10월 3일이다."}]}, None


class WebResearchTests(unittest.TestCase):
    def test_plain_assistant_urls_are_not_search_evidence(self):
        response = search_response()
        response["output"] = response["output"][1:]
        self.assertEqual(search_candidates(response), ([], [], 0))

    def test_failed_web_search_call_is_not_provenance(self):
        response = search_response()
        response["output"][0]["status"] = "failed"
        self.assertEqual(search_candidates(response), ([], [], 0))

    def test_tracking_duplicates_are_removed_without_deleting_article_id(self):
        self.assertEqual(canonical_url("https://example.com/view?id=3&utm_source=chat#section"), "https://example.com/view?id=3")
        response = search_response(["https://example.com/view?id=3&utm_source=x", "https://example.com/view?id=3"])
        self.assertEqual(len(search_candidates(response)[0]), 1)

    def test_invalid_schemes_credentials_and_ports_are_not_candidates(self):
        for url in ("javascript:alert(1)", "file:///tmp/x", "https://user:password@example.com", "https://example.com:8000"):
            self.assertIsNone(canonical_url(url))

    def test_university_subdomains_are_grouped_as_one_site(self):
        self.assertEqual(site_group("https://admission.university.ac.kr/view"), "university.ac.kr")
        self.assertEqual(site_group("https://news.university.ac.kr/view"), "university.ac.kr")

    def test_sources_are_diversified_before_page_limit(self):
        urls = ["https://school.example.edu/" + str(i) for i in range(8)] + ["https://press.example.com/report"]
        candidates, _, _ = search_candidates(search_response(urls))
        self.assertEqual(site_group(candidates[1][0]), "example.com")

    def test_actual_source_body_is_kept_instead_of_search_summary(self):
        with patch("web_research.request_response", return_value=search_response()), patch("web_research.read_url", side_effect=read_fixture):
            sources, research = research_sources("실시일은 10월 3일이다.")
        self.assertEqual(research["read_pages"], 2)
        self.assertEqual(research["status"], "read")
        self.assertTrue(all("실시일" in source["chunks"][0]["text"] for source in sources))
        self.assertFalse(any("검색 요약" in source["chunks"][0]["text"] for source in sources))

    def test_blocked_private_url_is_not_read_or_accepted(self):
        answers = [(2, 1, 6, "", ("127.0.0.1", 80))]
        with patch("document_reader.socket.getaddrinfo", return_value=answers):
            source, record = read_candidate(("http://127.0.0.1/private", "사설 주소"), set())
        self.assertIsNone(source)
        self.assertEqual(record["status"], "unread")
        self.assertIn("내부", record["error"])

    def test_duplicate_contents_are_not_multiple_site_corroboration(self):
        with patch("web_research.request_response", return_value=search_response()), patch("web_research.read_url", side_effect=read_fixture):
            sources, research = research_sources("실시일")
        sources[1]["comparison_hash"] = sources[0]["comparison_hash"]
        check = {"evidence": [{"source_id": source["source_id"]} for source in sources]}
        report = attach_research({"read_sources": sources, "checks": [check]}, research)
        self.assertEqual(report["checks"][0]["cross_check"]["status"], "single_source")
        self.assertEqual(len(report["checks"][0]["cross_check"]["sites"]), 2)

    def test_manual_interview_url_does_not_count_as_read_public_site(self):
        sources = [{"source_id": "interview", "origin": "interview", "url": "https://private.example.net/transcript", "content_hash": "a"},
                   {"source_id": "public", "origin": "web_search", "resolved_url": "https://school.example.edu/notice", "content_hash": "b"}]
        report = attach_research({"read_sources": sources, "checks": [{"evidence": [{"source_id": "interview"}, {"source_id": "public"}]}]}, {})
        self.assertEqual(report["checks"][0]["cross_check"]["sites"], ["example.edu"])

    def test_url_redirect_duplicates_have_one_snapshot(self):
        def redirected(url):
            document, raw = read_fixture(url)
            document["source_url"] = "https://school.example.edu/notice"
            return document, raw
        with patch("web_research.request_response", return_value=search_response()), patch("web_research.read_url", side_effect=redirected):
            sources, research = research_sources("실시일")
        self.assertEqual(len(sources), 1)
        self.assertEqual(research["read_pages"], 1)

    def test_page_reads_are_bounded(self):
        urls = ["https://publisher" + str(i) + ".example.com/report" for i in range(20)]
        with patch("web_research.request_response", return_value=search_response(urls)), patch("web_research.read_url", side_effect=read_fixture) as fetch:
            _, research = research_sources("실시일")
        self.assertEqual(fetch.call_count, MAX_WEB_PAGES)
        self.assertEqual(len(research["sources"]), MAX_WEB_PAGES)


if __name__ == "__main__":
    unittest.main()
