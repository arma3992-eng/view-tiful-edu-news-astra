"""실제 읽은 발췌 안에서 인용 위치를 찾는다. 사실 판정은 바꾸지 않는다."""
import re
import unicodedata


def normalized(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def quote_in_text(text, quote, pdf=False):
    """PDF의 공백·줄바꿈만 달라도 실제 자료의 문자열을 돌려준다.

    글자·숫자·문장부호의 변경이나 문장 순서 변경은 허용하지 않는다.
    반환값은 AI가 재작성한 인용이 아니라 실제 자료에서 잘라낸 발췌다.
    """
    source = unicodedata.normalize("NFC", text)
    needle = normalized(quote)
    if not needle:
        return None
    modes = (False, True) if pdf else (False,)
    for compact in modes:
        projected, positions = [], []
        for match in re.finditer(r"\s+|[^\s]", source):
            value = match.group()
            if value.isspace():
                if compact:
                    continue
                value = " "
            projected.append(value)
            positions.append((match.start(), match.end()))
        haystack = "".join(projected)
        target = re.sub(r"\s+", "", needle) if compact else needle
        if not target:
            continue
        position = haystack.find(target)
        while position >= 0:
            end = position + len(target)
            left_ok = not (target[0].isdigit() and position and haystack[position - 1].isdigit())
            right_ok = not (target[-1].isdigit() and end < len(haystack) and haystack[end].isdigit())
            if left_ok and right_ok:
                return source[positions[position][0]:positions[end - 1][1]]
            position = haystack.find(target, position + 1)
    return None


def resolve_citation(citation, pool, sources):
    """같은 자료의 실제 읽은 발췌에서만 인용을 복구한다."""
    source = sources.get(citation.source_id)
    declared = pool.get((citation.source_id, citation.chunk_id))
    if source:
        pdf = source.get("origin") == "uploaded_pdf" or source.get("media_type") == "application/pdf"
        candidates = ([declared] if declared else []) + [
            chunk for (source_id, chunk_id), chunk in pool.items()
            if source_id == citation.source_id and chunk_id != citation.chunk_id
        ]
        for chunk in candidates:
            actual = quote_in_text(chunk["text"], citation.quote, pdf=pdf)
            if actual is None:
                continue
            evidence = {"source_id": citation.source_id, "chunk_id": chunk["chunk_id"],
                        "source_name": source["name"], "url": source.get("resolved_url") or source.get("url"),
                        "origin": source["origin"], "locator": chunk["locator"], "quote": actual}
            reasons = []
            if chunk["chunk_id"] != citation.chunk_id:
                reasons.append("같은 자료에서 실제 인용이 있는 발췌로 위치를 연결했습니다.")
            if normalized(actual) != normalized(citation.quote):
                reasons.append("PDF의 띄어쓰기 차이를 확인하고 실제 자료의 인용으로 표시했습니다.")
            correction = {"source_id": citation.source_id, "requested_chunk_id": citation.chunk_id,
                          "chunk_id": chunk["chunk_id"], "ai_quote": citation.quote,
                          "quote": actual, "reason": " ".join(reasons)} if reasons else None
            return evidence, None, correction
    issue = {"source_id": citation.source_id, "chunk_id": citation.chunk_id, "quote": citation.quote,
             "reason": "등록 자료를 찾지 못함" if not source else
                       "실제 읽은 발췌에서 인용을 찾지 못함"}
    return None, issue, None
