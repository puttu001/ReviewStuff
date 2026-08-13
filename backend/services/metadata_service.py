"""Best-effort Open Graph enrichment for saved URLs.

Runs in a FastAPI BackgroundTask *after* the save is committed: a slow, dead or
hostile site must never delay or fail `POST /save`. Every failure path here is
silent — an item whose metadata could not be fetched renders exactly as it did
before this module existed, which is the normal case for login-walled sites
(Instagram, X) that serve a login page to server-side fetches.
"""

import ipaddress
import logging
import re
import socket
from html import unescape
from urllib.parse import urljoin, urlparse

import requests

from database.client import SessionLocal
from database.models import SavedItem

logger = logging.getLogger(__name__)

# Deliberately tight: this runs on a free Render instance, and a link preview is
# never worth holding a worker on.
CONNECT_TIMEOUT_SECONDS = 3
READ_TIMEOUT_SECONDS = 5
MAX_RESPONSE_BYTES = 256 * 1024
MAX_REDIRECTS = 3

MAX_TEXT_LENGTH = 300
MAX_URL_LENGTH = 2000

USER_AGENT = (
    "Mozilla/5.0 (compatible; ReviewStuffBot/1.0; +https://reviewstuff.pankajk.dev)"
)

_HEAD_RE = re.compile(r"<head\b[^>]*>(.*?)</head>", re.IGNORECASE | re.DOTALL)
_META_RE = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)
_TITLE_RE = re.compile(r"<title\b[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_LINK_RE = re.compile(r"<link\b[^>]*>", re.IGNORECASE)
_CHARSET_HEADER_RE = re.compile(r"charset=([\w-]+)", re.IGNORECASE)
_CHARSET_META_RE = re.compile(rb"""<meta[^>]+charset=["']?([\w-]+)""", re.IGNORECASE)


def is_http_url(content: str) -> bool:
    """Cheap scheme check — safe to call in the request path (no DNS)."""
    try:
        parsed = urlparse(content.strip())
    except ValueError:
        return False
    return parsed.scheme in ("http", "https") and bool(parsed.hostname)


def needs_metadata(item: SavedItem) -> bool:
    """Skip plain notes, and anything already enriched.

    A re-share of an item that previously yielded nothing does retry — sites
    change, and the cost of one more failed fetch is nil.
    """
    if not is_http_url(item.content):
        return False
    return not (
        item.fetched_title
        or item.fetched_image
        or item.fetched_site_name
        or item.fetched_favicon
    )


def enrich_item(item_id: int, url: str) -> None:
    """Background entry point. Never raises."""
    try:
        metadata = fetch_metadata(url)
        if not metadata:
            return
        _store(item_id, url, metadata)
    except Exception:  # noqa: BLE001 - a background task must not surface anything
        logger.warning("Metadata enrichment failed for %s", url, exc_info=True)


def fetch_metadata(url: str) -> dict[str, str] | None:
    fetched = _fetch_html(url)
    if fetched is None:
        return None

    final_url, html = fetched
    return _parse_metadata(html, final_url)


def _store(item_id: int, url: str, metadata: dict[str, str]) -> None:
    db = SessionLocal()
    try:
        item = db.get(SavedItem, item_id)
        # The item may have been deleted, or re-saved with different content,
        # between the response and this task running.
        if item is None or item.content != url:
            return

        item.fetched_title = metadata.get("title")
        item.fetched_image = metadata.get("image")
        item.fetched_site_name = metadata.get("site_name")
        item.fetched_favicon = metadata.get("favicon")
        db.commit()
    finally:
        db.close()


# --- fetching ---------------------------------------------------------------


def _is_safe_url(url: str) -> bool:
    """Guard against SSRF: http(s) only, and never a private/loopback address.

    Checked on every redirect hop, not just the URL the user gave us — a public
    host redirecting to 169.254.169.254 is the whole trick.
    """
    if not is_http_url(url):
        return False

    host = urlparse(url).hostname
    try:
        addresses = socket.getaddrinfo(host, None)
    except (socket.gaierror, UnicodeError):
        return False

    for info in addresses:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if not ip.is_global:
            return False
    return bool(addresses)


def _fetch_html(url: str) -> tuple[str, str] | None:
    """Returns `(final_url, html)`, or None if anything at all goes wrong."""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en",
    }
    current = url

    with requests.Session() as session:
        for _ in range(MAX_REDIRECTS + 1):
            if not _is_safe_url(current):
                return None

            try:
                # Redirects are followed by hand so each hop can be re-validated.
                response = session.get(
                    current,
                    headers=headers,
                    timeout=(CONNECT_TIMEOUT_SECONDS, READ_TIMEOUT_SECONDS),
                    allow_redirects=False,
                    stream=True,
                )
            except requests.RequestException:
                return None

            with response:
                if response.is_redirect or response.is_permanent_redirect:
                    location = response.headers.get("location")
                    if not location:
                        return None
                    current = urljoin(current, location)
                    continue

                if response.status_code != 200:
                    return None

                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower():
                    return None

                try:
                    body = _read_capped(response)
                except requests.RequestException:
                    return None

            return current, _decode(body, content_type)

    return None


def _read_capped(response: requests.Response) -> bytes:
    body = bytearray()
    for chunk in response.iter_content(8192):
        body.extend(chunk)
        if len(body) >= MAX_RESPONSE_BYTES:
            break
    return bytes(body[:MAX_RESPONSE_BYTES])


def _decode(body: bytes, content_type: str) -> str:
    """`requests` defaults text/* with no charset to latin-1, which mangles
    every non-ASCII title, so resolve the charset ourselves."""
    match = _CHARSET_HEADER_RE.search(content_type) or _CHARSET_META_RE.search(body[:4096])
    charset = match.group(1) if match else b"utf-8"
    if isinstance(charset, bytes):
        charset = charset.decode("ascii", "ignore")

    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


# --- parsing ----------------------------------------------------------------
#
# A regex over <head> rather than a real parser: the tags we want are simple and
# near the top of the document, and this avoids adding an HTML-parser dependency
# for a cosmetic feature.


def _attr(tag: str, name: str) -> str | None:
    pattern = (
        rf"""\s{re.escape(name)}\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))"""
    )
    match = re.search(pattern, tag, re.IGNORECASE)
    if not match:
        return None
    value = next((g for g in match.groups() if g is not None), "")
    return unescape(value).strip() or None


def _meta_tags(head: str) -> dict[str, str]:
    tags: dict[str, str] = {}
    for match in _META_RE.finditer(head):
        tag = match.group(0)
        key = _attr(tag, "property") or _attr(tag, "name")
        content = _attr(tag, "content")
        if key and content:
            # First occurrence wins, matching how og: duplicates are read.
            tags.setdefault(key.lower(), content)
    return tags


def _document_title(head: str) -> str | None:
    match = _TITLE_RE.search(head)
    if not match:
        return None
    return unescape(re.sub(r"\s+", " ", match.group(1))).strip() or None


def _icon_href(head: str, base_url: str) -> str | None:
    for match in _LINK_RE.finditer(head):
        tag = match.group(0)
        rel = (_attr(tag, "rel") or "").lower().split()
        if not any(token in ("icon", "shortcut", "apple-touch-icon") for token in rel):
            continue
        href = _attr(tag, "href")
        if href:
            return href
    return None


def _absolute(url: str | None, base_url: str) -> str | None:
    if not url:
        return None
    try:
        resolved = urljoin(base_url, url)
    except ValueError:
        return None
    return resolved if is_http_url(resolved) else None


def _trim(value: str | None, limit: int) -> str | None:
    if not value:
        return None
    value = value.strip()
    return value[:limit] or None


def _parse_metadata(html: str, final_url: str) -> dict[str, str] | None:
    head_match = _HEAD_RE.search(html)
    head = head_match.group(1) if head_match else html[:MAX_RESPONSE_BYTES]

    meta = _meta_tags(head)

    title = meta.get("og:title") or meta.get("twitter:title") or _document_title(head)
    image = meta.get("og:image") or meta.get("og:image:url") or meta.get("twitter:image")
    site_name = meta.get("og:site_name") or meta.get("application-name")

    # No declared icon is normal; /favicon.ico is what a browser would try, and
    # a 404 simply renders as no icon on the frontend.
    favicon = _absolute(_icon_href(head, final_url), final_url) or _absolute(
        "/favicon.ico", final_url
    )

    metadata = {
        "title": _trim(title, MAX_TEXT_LENGTH),
        "image": _trim(_absolute(image, final_url), MAX_URL_LENGTH),
        "site_name": _trim(site_name, MAX_TEXT_LENGTH),
        "favicon": _trim(favicon, MAX_URL_LENGTH),
    }
    found = {key: value for key, value in metadata.items() if value}

    # A bare favicon guess on its own is not worth a write.
    if not any(key in found for key in ("title", "image", "site_name")):
        return None
    return found
