"""첨부 화면의 출입 통제·입실 시각 인용 오류 재현. 유료 API는 호출하지 않는다."""
import copy
import unittest

from citation_matching import quote_in_text, resolve_citation
from final_review import FinalAIReport, validate_final_report
from verification import AIReport, Evidence, collect_sources, validate_report


CONTROL_ARTICLE = "고사 당일에는 학부모를 포함한 외부인과 차량의 교내 출입이 전면 통제된다."
CONTROL_TEXT = "수험생 및 고사 관계자 외 외부인(학부모 포함) 및 차량 출입을 전면 통제하오니,"
ENTRY_ARTICLE = "입실은 09:30까지 마쳐야 한다."


def sources_and_chunks():
    source = {"source_id": "notice", "name": "수험생 안내 PDF", "url": "", "resolved_url": None,
              "origin": "uploaded_pdf", "media_type": "application/pdf"}
    chunks = [
        {"source_id": "notice", "chunk_id": "notice_p1_c1", "locator": "PDF 1쪽 · 발췌 1",
         "text": "2027학년도 수시모집 논술고사 주요사항 안내\n" + CONTROL_TEXT},
        {"source_id": "notice", "chunk_id": "notice_p1_c2", "locator": "PDF 1쪽 · 발췌 2",
         "text": "고사일시\n입실완료\n해당 모집단위\n10:00~12:00\n09:30까지\n자연계열"},
    ]
    source["chunks"] = chunks
    return [source], chunks


def claim(article, citations):
    return {"original_quote": article, "claim": article, "category": "condition", "verdict": "match",
            "reason": "같은 대상과 조건의 자료로 확인", "suggestion": "", "evidence": citations}


class CitationMatchingTests(unittest.TestCase):
    def setUp(self):
        self.sources, self.chunks = sources_and_chunks()
        self.pool = {(row["source_id"], row["chunk_id"]): row for row in self.chunks}
        self.names = {row["source_id"]: row for row in self.sources}

    def citation(self, **overrides):
        fields = {"source_id": "notice", "chunk_id": "notice_p1_c1",
                  "quote": "수험생 및 고사관계자 외 외부인(학부모포함) 및 차량 출입을 전면 통제하오니"}
        fields.update(overrides)
        return Evidence(**fields)

    def test_pdf_spacing_restores_actual_control_quote(self):
        evidence, issue, correction = resolve_citation(self.citation(), self.pool, self.names)
        self.assertIsNone(issue)
        self.assertEqual(evidence["quote"], CONTROL_TEXT[:-1])
        self.assertIn("띄어쓰기", correction["reason"])
        self.assertIn(evidence["quote"], self.chunks[0]["text"])

    def test_pdf_nonbreaking_space_and_newline_do_not_change_entry_time(self):
        actual = "입실\u00a0완료\n09:30까지"
        self.assertEqual(quote_in_text(actual, "입실완료 09:30까지", pdf=True), actual)

    def test_regular_manual_text_keeps_word_spacing_check(self):
        self.sources[0]["origin"] = "manual"
        self.sources[0]["media_type"] = "text/plain"
        evidence, issue, _ = resolve_citation(self.citation(), self.pool, self.names)
        self.assertIsNone(evidence)
        self.assertIsNotNone(issue)

    def test_wrong_chunk_id_is_linked_only_to_same_read_source(self):
        evidence, issue, correction = resolve_citation(self.citation(chunk_id="notice_p1_c2"), self.pool, self.names)
        self.assertIsNone(issue)
        self.assertEqual(evidence["chunk_id"], "notice_p1_c1")
        self.assertEqual(evidence["locator"], "PDF 1쪽 · 발췌 1")
        self.assertEqual(correction["requested_chunk_id"], "notice_p1_c2")

    def test_same_source_with_unknown_chunk_can_find_actual_read_chunk(self):
        evidence, issue, _ = resolve_citation(self.citation(chunk_id="mistyped-id"), self.pool, self.names)
        self.assertIsNone(issue)
        self.assertEqual(evidence["chunk_id"], "notice_p1_c1")

    def test_foreign_source_is_not_repaired_using_another_documents_text(self):
        evidence, issue, _ = resolve_citation(self.citation(source_id="foreign"), self.pool, self.names)
        self.assertIsNone(evidence)
        self.assertIsNotNone(issue)

    def test_unread_source_chunk_is_not_a_citation_candidate(self):
        pool = {key: value for key, value in self.pool.items() if key[1] == "notice_p1_c2"}
        evidence, issue, _ = resolve_citation(self.citation(), pool, self.names)
        self.assertIsNone(evidence)
        self.assertIsNotNone(issue)

    def test_changed_time_words_punctuation_or_order_are_not_repaired(self):
        for text, quote in [("입실완료 09:30까지", "입실완료 09:40까지"),
                            (CONTROL_TEXT, CONTROL_TEXT.replace("통제하오니", "통제하지 않으니")),
                            ("09:30까지", "0930까지"),
                            (CONTROL_TEXT, "차량 및 외부인(학부모 포함)")]:
            with self.subTest(quote=quote):
                self.assertIsNone(quote_in_text(text, quote, pdf=True))

    def test_partial_numeric_value_is_not_a_match(self):
        for text, quote in [("입실은 109:30까지", "09:30까지"), ("시간은 300", "30")]:
            self.assertIsNone(quote_in_text(text, quote, pdf=True))

    def test_saved_url_pdf_also_uses_spacing_recovery(self):
        self.sources[0]["origin"] = "saved_url"
        evidence, issue, _ = resolve_citation(self.citation(), self.pool, self.names)
        self.assertIsNone(issue)
        self.assertEqual(evidence["quote"], CONTROL_TEXT[:-1])

    def test_original_validation_keeps_model_match_with_real_pdf_quote(self):
        parsed = AIReport(checks=[claim(CONTROL_ARTICLE, [self.citation().model_dump()])], coverage_notes=[])
        report = validate_report(parsed, CONTROL_ARTICLE, self.chunks, self.sources, "mock", {})
        check = report["checks"][0]
        self.assertEqual(check["verdict"], "match")
        self.assertEqual(check["model_verdict"], "match")
        self.assertEqual(check["evidence"][0]["quote"], CONTROL_TEXT[:-1])
        self.assertTrue(check["citation_corrections"])

    def final_report(self, checks):
        segments = [{"id": "section_1_body_1", "location": "세부 항목 1 · 본문", "kind": "fact",
                     "text": CONTROL_ARTICLE + " " + ENTRY_ARTICLE}]
        parsed = FinalAIReport(segments=[{"segment_id": segments[0]["id"], "reviewed_text": segments[0]["text"],
                                "classification": "factual", "all_claims_checked": True, "checks": checks}], coverage_notes=[])
        return validate_final_report(parsed, segments, self.chunks, self.sources, {"text": segments[0]["text"]}, "mock", {})

    def test_final_validation_accepts_control_and_table_citations(self):
        control = claim(CONTROL_ARTICLE, [self.citation(chunk_id="notice_p1_c2").model_dump()])
        entry = claim(ENTRY_ARTICLE, [self.citation(chunk_id="notice_p1_c2", quote="입실 완료").model_dump(),
                                      self.citation(chunk_id="notice_p1_c1", quote="09:30까지").model_dump()])
        report = self.final_report([control, entry])
        self.assertTrue(report["approval_eligible"])
        self.assertEqual([row["verdict"] for row in report["checks"]], ["match", "match"])
        self.assertEqual(report["checks"][1]["evidence"][0]["quote"], "입실완료")
        self.assertEqual(report["checks"][1]["evidence"][1]["chunk_id"], "notice_p1_c2")

    def test_invented_article_adverb_is_excluded_from_final_facts(self):
        check = claim("자연계열 응시자는 이 규정을 특히 확인해야 한다.", [])
        report = self.final_report([check])
        self.assertEqual(report["checks"], [])
        self.assertEqual(len(report["unanchored_checks"]), 1)
        self.assertFalse(report["approval_eligible"])

    def test_valid_citation_does_not_hide_an_additional_invented_citation(self):
        citations = [self.citation().model_dump(), self.citation(quote="모든 사람은 입실할 수 없다.").model_dump()]
        report = self.final_report([claim(CONTROL_ARTICLE, citations)])
        self.assertEqual(report["checks"][0]["verdict"], "unverifiable")
        self.assertFalse(report["approval_eligible"])
        self.assertEqual(len(report["checks"][0]["evidence"]), 1)

    def test_correct_citation_does_not_change_unverifiable_semantic_verdict(self):
        check = claim(CONTROL_ARTICLE, [self.citation().model_dump()])
        check["verdict"] = "unverifiable"
        report = self.final_report([check])
        self.assertEqual(report["checks"][0]["verdict"], "unverifiable")
        self.assertFalse(report["approval_eligible"])

    def test_pdf_header_is_kept_even_with_lower_keyword_rank(self):
        pages = [{"page": 1, "locator": "PDF 1쪽", "text": "외부인 및 차량 출입을 통제합니다."}]
        pages += [{"page": number, "locator": "PDF " + str(number) + "쪽", "text": "입실 준비물 전자기기 규정 " * 100}
                  for number in range(2, 22)]
        class FixtureStore:
            def get_material(self, material_id):
                return {"pages": copy.deepcopy(pages), "media_type": "application/pdf", "source_url": None,
                        "created_at": "2026-10-05T00:00:00Z", "warning": ""}
        article = {"original_text": "입실 준비물 전자기기 규정", "sources": [
            {"id": "notice", "name": "안내", "kind": "official", "material_id": "pdf", "url": "", "excerpt": "", "locator": ""}]}
        sources, chunks = collect_sources(article, FixtureStore())
        self.assertEqual(chunks[0]["text"], pages[0]["text"])
        self.assertLessEqual(sum(len(row["text"]) for row in chunks), 12000)
        self.assertLess(sources[0]["selected_chunks"], sources[0]["total_chunks"])


if __name__ == "__main__":
    unittest.main()
