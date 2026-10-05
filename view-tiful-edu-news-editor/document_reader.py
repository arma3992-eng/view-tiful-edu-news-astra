"""공개 URL과 첨부 PDF를 읽는다. 추출 성공은 사실 확인을 의미하지 않는다."""
import gzip
import http.client
import io
import ipaddress
import re
import socket
import ssl
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from bs4 import BeautifulSoup
from pypdf import PdfReader

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_DOCUMENT_CHARS = 500000
MAX_PAGES = 200


class DocumentError(ValueError):
    pass


def clean_filename(value):
    name = re.split(r"[/\\]", value or "document.pdf")[-1]
    return re.sub(r"[\x00-\x1f]", "", name)[:180] or "document.pdf"


def read_pdf(data, filename="document.pdf"):
    if len(data) > MAX_FILE_BYTES:
        raise DocumentError("PDF는 20MB 이하로 올려주세요.")
    if not data.lstrip().startswith(b"%PDF-"):
        raise DocumentError("PDF 형식의 파일을 선택해주세요.")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise DocumentError("암호가 설정된 PDF입니다. 암호를 해제한 사본을 선택해주세요.")
        if not 1 <= len(reader.pages) <= MAX_PAGES:
            raise DocumentError("PDF는 1~200쪽 범위로 선택해주세요.")
        pages, size = [], 0
        for number, page in enumerate(reader.pages, 1):
            contents = page.get_contents()
            if contents is not None and len(contents.get_data()) > 16 * 1024 * 1024:
                raise DocumentError("이 PDF의 한 페이지가 너무 복잡합니다. 필요한 쪽만 나눈 파일을 선택해주세요.")
            text = (page.extract_text() or "").strip()
            size += len(text)
            if size > MAX_DOCUMENT_CHARS:
                raise DocumentError("PDF 내용이 너무 많습니다. 확인할 쪽만 나눈 파일을 선택해주세요.")
            pages.append({"page": number, "locator": "PDF " + str(number) + "쪽", "text": text})
    except DocumentError:
        raise
    except Exception as error:
        raise DocumentError("PDF 내용을 읽지 못했습니다. 파일을 열 수 있는지 확인해주세요.") from error
    empty = sum(not p["text"] for p in pages)
    warning = ""
    if empty:
        warning = str(empty) + "쪽에서 텍스트를 추출하지 못했습니다. 스캔 PDF는 OCR이 필요할 수 있습니다. 이번 버전은 OCR을 지원하지 않습니다."
    return {
        "title": clean_filename(filename), "media_type": "application/pdf",
        "pages": pages, "warning": warning, "source_url": None,
    }


def public_target(url):
    """DNS를 확인하고 연결할 공개 IP를 선택한다. 요청에서도 이 IP를 그대로 쓴다."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password:
        raise DocumentError("공개 웹페이지의 http 또는 https 주소를 입력해주세요.")
    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError as error:
        raise DocumentError("주소의 포트 형식이 올바르지 않습니다.") from error
    if port not in (80, 443):
        raise DocumentError("일반 웹페이지의 주소를 입력해주세요.")
    try:
        host = parts.hostname.encode("idna").decode("ascii")
    except UnicodeError as error:
        raise DocumentError("웹사이트 주소 형식을 확인해주세요.") from error
    try:
        addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except OSError as error:
        raise DocumentError("웹사이트 주소를 찾지 못했습니다.") from error
    ips = list(dict.fromkeys(item[4][0] for item in addresses))
    if not ips or any(not ipaddress.ip_address(ip).is_global for ip in ips):
        raise DocumentError("PC 내부 주소나 사설 네트워크 주소는 가져올 수 없습니다.")
    return parts, host, port, ips[0]


def download_public(url):
    """리디렉션마다 공개 주소를 확인한다. 자격 증명·쿠키는 보내지 않는다."""
    current = url
    for attempt in range(5):
        parts, host, port, address = public_target(current)
        context = ssl.create_default_context()
        connection = (http.client.HTTPSConnection(host, port, timeout=12, context=context)
                      if parts.scheme == "https" else http.client.HTTPConnection(host, port, timeout=12))

        def pinned_connect():
            sock = socket.create_connection((address, port), timeout=12)
            if parts.scheme == "https":
                try:
                    sock = context.wrap_socket(sock, server_hostname=host)
                except Exception:
                    sock.close()
                    raise
            connection.sock = sock

        connection.connect = pinned_connect
        path = quote(parts.path or "/", safe="/%:@")
        if parts.query:
            path += "?" + quote(parts.query, safe="=&%+/:?@")
        try:
            connection.request("GET", path, headers={
                "User-Agent": "Mozilla/5.0 EducationNewsEditor/2.0",
                "Accept": "text/html,application/pdf;q=0.9,text/plain;q=0.8",
                "Accept-Encoding": "identity",
            })
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                if not location:
                    raise DocumentError("이 주소의 이동 위치를 찾지 못했습니다.")
                current = urljoin(current, location)
                continue
            if response.status != 200:
                raise DocumentError("자료를 가져오지 못했습니다(HTTP " + str(response.status) + "). 본문을 붙여넣거나 PDF를 첨부해주세요.")
            length = response.getheader("Content-Length", "")
            if length.isdigit() and int(length) > MAX_FILE_BYTES:
                raise DocumentError("자료는 20MB 이하로 가져올 수 있습니다.")
            body = response.read(MAX_FILE_BYTES + 1)
            if len(body) > MAX_FILE_BYTES:
                raise DocumentError("자료는 20MB 이하로 가져올 수 있습니다.")
            if response.getheader("Content-Encoding", "").lower() == "gzip":
                with gzip.GzipFile(fileobj=io.BytesIO(body)) as stream:
                    body = stream.read(MAX_FILE_BYTES + 1)
                if len(body) > MAX_FILE_BYTES:
                    raise DocumentError("압축을 푼 자료가 너무 큽니다.")
            return body, response.getheader("Content-Type", ""), current
        except DocumentError:
            raise
        except (OSError, http.client.HTTPException, ValueError) as error:
            raise DocumentError("웹사이트 연결에 실패했습니다. 본문을 붙여넣거나 PDF를 첨부해주세요.") from error
        finally:
            connection.close()
    raise DocumentError("주소 이동이 너무 많아 가져오지 못했습니다.")


def read_html(data, url, content_type="text/html"):
    if "text/plain" in content_type.lower():
        match = re.search(r"charset=([A-Za-z0-9_-]+)", content_type, re.I)
        try:
            text = data.decode(match.group(1) if match else "utf-8", errors="replace").strip()
        except LookupError:
            text = data.decode("utf-8", errors="replace").strip()
        title = next((line.strip() for line in text.splitlines() if line.strip()), "웹 자료")[:200]
    else:
        soup = BeautifulSoup(data, "html.parser")
        title = soup.title.get_text(" ", strip=True) if soup.title else "웹 자료"
        meta = soup.select_one('meta[property="og:title"]')
        if meta and meta.get("content"):
            title = str(meta["content"])
        for element in soup.select("script,style,noscript,nav,header,footer,aside,form,button"):
            element.decompose()
        selectors = [
            "#article-view-content-div", '[itemprop="articleBody"]',
            '[data-testid="article-body"]', ".article-body", ".article_view",
            ".view_cont", ".board-view", "article", "main", "body",
        ]
        area = next((soup.select_one(s) for s in selectors if soup.select_one(s)), soup)
        text = area.get_text("\n", strip=True)
    if not text.strip():
        raise DocumentError("이 페이지에서 본문을 읽지 못했습니다. 본문을 붙여넣거나 PDF를 첨부해주세요.")
    if len(text) > MAX_DOCUMENT_CHARS:
        raise DocumentError("페이지 내용이 너무 많습니다. 필요한 내용을 직접 붙여넣어주세요.")
    return {
        "title": title[:200], "media_type": "text/html",
        "pages": [{"page": 1, "locator": "웹 본문", "text": text}],
        "warning": "추출한 본문에 메뉴가 섞이거나 내용이 빠질 수 있으므로 저장 전에 확인해주세요.",
        "source_url": url,
    }


def read_url(url):
    data, content_type, final_url = download_public(url)
    if "application/pdf" in content_type.lower() or data.lstrip().startswith(b"%PDF-"):
        document = read_pdf(data, urlsplit(final_url).path.split("/")[-1] or "document.pdf")
    elif any(t in content_type.lower() for t in ("text/html", "text/plain", "application/xhtml")):
        document = read_html(data, final_url, content_type)
        data = None
    else:
        raise DocumentError("HTML 페이지나 PDF 주소를 입력해주세요. 공지의 첨부 PDF는 별도로 선택할 수 있습니다.")
    document["source_url"] = final_url
    return document, data
