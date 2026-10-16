"""Import a trusted editor-approved JSON into an existing site's article ID.
No publishing, networking, or overwrite of article/carousel/category data.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import tempfile

KINDS = {"impact", "check", "prepare", "action", "think"}

def known_ids(root):
    lead = (root / "lead-news.js").read_text(encoding="utf-8-sig")
    ids = set(re.findall(r"\bid\s*:\s*['\"]([^'\"]+)['\"]", lead))
    text = (root / "news-data.js").read_text(encoding="utf-8-sig")
    raw = text.split("window.CATEGORY_NEWS =", 1)[1].lstrip()
    groups, _ = json.JSONDecoder().raw_decode(raw)
    ids.update(row[3] for group in groups.values() for row in group["articles"])
    return ids

def public_guide(guide):
    if guide is None:
        return {"enabled": False, "audiences": []}
    if not isinstance(guide, dict) or type(guide.get("enabled")) is not bool:
        raise ValueError("독자 가이드 형식이 올바르지 않습니다.")
    audiences = []
    for a in guide.get("audiences", []):
        sections = []
        for s in a["sections"]:
            if s["type"] not in KINDS:
                raise ValueError("알 수 없는 안내 종류입니다.")
            items = [{"text": i["text"]} for i in s["items"] if isinstance(i.get("text"), str) and i["text"].strip()]
            if items:
                sections.append({"type": s["type"], "items": items})
        if sections and a["label"].strip():
            audiences.append({"label": a["label"], "title": a["title"], "sections": sections})
    if guide["enabled"] and not audiences:
        raise ValueError("사용할 가이드가 비어 있습니다.")
    return {"enabled": guide["enabled"], "audiences": audiences}

def import_export(source, site, article_id, replace_source=False):
    if article_id not in known_ids(site):
        raise ValueError("사이트에 없는 기사 ID입니다. 기존 기사 ID를 지정하세요.")
    data = json.loads(source.read_text(encoding="utf-8-sig"))
    if data.get("status") != "approved_for_export":
        raise ValueError("편집실에서 최종 승인 후 내보낸 JSON만 가져올 수 있습니다.")
    approval, verification, content = data["approval"], data["verification"], data["article"]
    digest = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if not approval.get("id") or not approval.get("reviewer") or not approval.get("approved_at"):
        raise ValueError("승인 기록이 없습니다.")
    if approval.get("draft_hash") != digest or verification.get("draft_hash") != digest or approval.get("final_report_id") != verification.get("id"):
        raise ValueError("기사 내용과 검증·승인 버전이 일치하지 않습니다.")
    guide = content.get("reader_guide")
    review = approval.get("reader_guide_review", {})
    if guide is not None and (review.get("approved") is not True or review.get("final") != guide):
        raise ValueError("독자 가이드의 승인 스냅샷이 일치하지 않습니다.")
    target = site / "data" / "reader-guides.json"
    registry = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"version": 1, "articles": {}}
    if registry.get("version") != 1:
        raise ValueError("지원하지 않는 가이드 데이터 버전입니다.")
    previous = registry["articles"].get(article_id)
    if previous and previous["editor_article_id"] != data["article_id"] and not replace_source:
        raise ValueError("다른 편집실 기사와 연결되어 있습니다. 의도한 교체일 때만 --replace-source를 사용하세요.")
    if previous and previous["editor_article_id"] == data["article_id"] and previous.get("draft_revision", 0) > approval["draft_revision"]:
        raise ValueError("이미 더 최신 기사 버전의 가이드가 등록되어 있습니다.")
    sources = [{"name": s["name"], "url": s["url"]} for s in data.get("sources", []) if s.get("url")]
    if data.get("original", {}).get("url"):
        sources.insert(0, {"name": "원문 기사", "url": data["original"]["url"]})
    registry["articles"][article_id] = {
        "editor_article_id": data["article_id"], "article_title": content["title"],
        "approval_id": approval["id"], "approved_at": approval["approved_at"],
        "draft_revision": approval["draft_revision"], "reader_guide": public_guide(guide), "sources": sources
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        target.with_suffix(".json.bak").write_bytes(target.read_bytes())
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=target.parent, delete=False) as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
        tmp = Path(f.name)
    tmp.replace(target)
    return target

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("approved_json", type=Path)
    parser.add_argument("--article-id", required=True)
    parser.add_argument("--site", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--replace-source", action="store_true")
    args = parser.parse_args()
    try:
        result = import_export(args.approved_json, args.site, args.article_id, args.replace_source)
        print("가이드 반영 완료:", result)
        print("로컬 사이트에서 확인한 뒤 기존 배포 절차로 게시하세요.")
    except (ValueError, KeyError, TypeError, OSError) as e:
        parser.exit(1, str(e) + "\n")
