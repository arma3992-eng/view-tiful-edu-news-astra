"""승인된 버전의 기사·출처·승인 메타데이터를 휴대 가능한 파일로 만든다."""
import html
import json
from urllib.parse import urlsplit
from human_review import human_evidence_details
from evidence_catalog import evidence_catalog


def export_payload(article):
    report = article["final_verification_report"]
    used = {citation["source_id"] for check in report["checks"] for citation in check["evidence"]}
    resolutions = article["approval"].get("resolutions", [])
    used.update(citation["source_id"] for item in resolutions for citation in item["evidence"])
    content = article["draft"]["content"]
    used_items = {item_id for block in content["sections"] + content["key_facts"] + content["audience_guidance"]
                  for item_id in block["item_ids"]}
    used.update(source_id for item in article["draft"]["metadata"].get("items", [])
                if item["id"] in used_items for source_id in item["source_ids"])
    snapshots = {source["source_id"]: source for source in report["read_sources"]}
    sources = [{"id": source["id"], "name": source["name"], "kind": source["kind"],
                "url": snapshots.get(source["id"], {}).get("resolved_url") or source["url"],
                "locator": source["locator"], "interview": source.get("interview"),
                "attachment_name": source["material"]["title"] if source.get("material") else None}
               for source in evidence_catalog(article) if source["id"] in used]
    return {"format_version": 1, "status": "approved_for_export", "article_id": article["id"],
            "article": article["draft"]["content"],
            "original": {"title": article["original_text"].splitlines()[0], "url": article["original_url"]},
            "sources": sources, "approval": article["approval"],
            "human_review": {"resolutions": resolutions, "evidence": human_evidence_details(report, resolutions),
                             "note": "AI 판정은 원본으로 보존하고, 항목별 사람의 근거 확인·안내 및 분석 판단을 승인 기록에 함께 저장했습니다."},
            "verification": {key: report[key] for key in
                ("id", "checked_at", "model", "draft_hash", "checks", "coverage_count", "reviewed_count", "scope")},
            "web_research": report.get("web_research", {"enabled": False, "status": "off"}),
            "attachment_note": "첨부 PDF 파일은 포함하지 않습니다. 게시할 때 파일을 별도로 첨부하거나 공개 출처 주소를 연결하세요."}


def json_export(article):
    return json.dumps(export_payload(article), ensure_ascii=False, indent=2)


def html_export(article):
    data = export_payload(article)
    content = data["article"]
    esc = lambda value: html.escape(str(value), quote=True)
    def link(text, url):
        if url and urlsplit(url).scheme in ("http", "https"):
            return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>'
        return esc(text)
    audiences = {"student": "학생", "parent": "학부모", "teacher": "교사"}
    kinds = {"fact": "사실·배경", "analysis": "편집자 분석", "opinion": "기자 의견·주장", "guidance": "학습 제안", "interview": "인터뷰·취재"}
    body = ['<p class="category">' + esc(content["category"]) + '</p>', '<h1>' + esc(content["title"]) + '</h1>',
            '<div class="summary">' + ''.join('<p>' + esc(text) + '</p>' for text in content["summary"]) + '</div>']
    if content["key_facts"]:
        body.append('<div class="facts">' + ''.join('<div><strong>' + esc(item["label"]) + '</strong><p>' + esc(item["value"]) + '</p></div>'
                    for item in content["key_facts"]) + '</div>')
    for section in content["sections"]:
        body.append('<section><span class="kind">' + esc(kinds[section["kind"]]) + '</span><h2>' + esc(section["heading"]) +
                    '</h2><p>' + esc(section["text"]) + '</p></section>')
    if content["audience_guidance"]:
        body.append('<h2>이 기사를 읽은 뒤 · 편집자의 제안</h2><div class="audiences">' + ''.join(
            '<section><strong>' + esc(audiences[item["audience"]]) + '</strong><h3>' + esc(item["heading"]) +
            '</h3><p>' + esc(item["text"]) + '</p></section>' for item in content["audience_guidance"]) + '</div>')
    original = data["original"]
    body.append('<section class="sources"><h2>원문과 근거</h2><p>원문: ' + link(original["title"], original["url"]) +
                ('' if original["url"] else ' · 주소 미등록') + '</p>')
    for source in data["sources"]:
        body.append('<p>' + link(source["name"], source["url"]) + (' · ' + esc(source["locator"]) if source["locator"] else '') +
                    (' · 첨부 자료: ' + esc(source["attachment_name"]) if source["attachment_name"] else '') + '</p>')
        if source.get("interview"):
            interview = source["interview"]
            body.append('<p>취재 기록: ' + esc(interview["speaker"]) + ' · ' + esc(interview.get("role", "")) +
                        ' · ' + esc(interview["interviewed_on"]) + ' · ' + esc(interview["method"]) + '</p>')
    body.append('</section>')
    approval = data["approval"]
    body.append('<footer>검토: ' + esc(approval["reviewer"]) + ' · 승인 시각: ' + esc(approval["approved_at"]) +
                ' · 기사 버전: ' + str(approval["draft_revision"]) +
                (' · 사람의 항목별 확인: ' + str(len(approval["resolutions"])) + '개' if approval.get("resolutions") else '') + '</footer>')
    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(content["title"]) + '''</title>
<style>body{margin:0;background:#f5f7fb;color:#172b4a;font:16px/1.8 "Malgun Gothic",system-ui,sans-serif}article{max-width:900px;margin:30px auto;padding:32px;background:white;border-radius:12px}h1{font-size:30px;line-height:1.5}h2{font-size:20px;margin:28px 0 10px}h3{font-size:16px}p{white-space:pre-wrap;margin:8px 0}.summary{border-left:4px solid #245ddd;padding:12px 18px;background:#edf3ff}.facts,.audiences{display:grid;gap:12px;margin:24px 0}.facts{grid-template-columns:repeat(2,1fr)}.audiences{grid-template-columns:repeat(3,1fr)}.facts>div,.audiences>section{background:#f5f7fb;border-radius:8px;padding:16px}.category,.kind,footer,.sources{font-size:13px;color:#61728b}a{color:#245ddd}.sources,footer{border-top:1px solid #dce4ef;padding-top:16px;margin-top:28px}@media(max-width:640px){article{margin:0;padding:20px;border-radius:0}.facts,.audiences{grid-template-columns:1fr}h1{font-size:26px}}</style></head><body><article>''' + ''.join(body) + '</article></body></html>'
