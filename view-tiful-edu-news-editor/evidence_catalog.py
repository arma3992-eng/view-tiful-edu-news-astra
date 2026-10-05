"""직접 등록한 자료와 현재 검증 보고서에 보관한 웹 근거 목록."""


def evidence_catalog(article):
    catalog = {source["id"]: dict(source) for source in article.get("sources", [])}
    reports = []
    if article.get("verification_status") in ("completed", "partial"):
        reports.append(article.get("verification_report"))
    if article.get("final_verification_status") in ("completed", "partial"):
        reports.append(article.get("final_verification_report"))
    for report in reports:
        for source in (report or {}).get("read_sources", []):
            if source.get("origin") != "web_search":
                continue
            catalog[source["source_id"]] = {
                "id": source["source_id"], "name": source["name"], "kind": source["kind"],
                "url": source.get("resolved_url") or source.get("url"), "locator": "자동 웹 검색 · 본문 대조",
                "excerpt": "", "material": None, "material_id": None, "auto_found": True,
                "created_at": source["read_at"], "interview": None,
            }
    return list(catalog.values())


def linked_web_snapshots(article, ids):
    result = {}
    for key in ("verification_report", "final_verification_report"):
        for source in (article.get(key) or {}).get("read_sources", []):
            if source["source_id"] in ids and source.get("origin") == "web_search":
                result[source["source_id"]] = source
    return list(result.values())
