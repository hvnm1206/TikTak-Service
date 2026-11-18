"""Đọc RSS/Atom/sitemap và thẻ meta trang. Chỉ dùng thư viện chuẩn."""
import json, sys, time, urllib.request, email.utils, datetime as dt, xml.etree.ElementTree as ET, html, re, os

UA = "NMH-NewsFeed/0.1 (+https://nomahubvn.com)"
NOW = dt.datetime.now(dt.timezone.utc)


def parse_date(s, date_format=None):
    """date_format: định dạng riêng của nguồn (strptime), ví dụ Tuổi Trẻ '%m/%d/%Y %I:%M:%S %p'."""
    if not s:
        return None
    s = s.strip()
    if date_format:
        try:
            d = dt.datetime.strptime(s, date_format)
            return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
        except ValueError:
            pass
    try:
        d = email.utils.parsedate_to_datetime(s)
    except Exception:
        d = None
    if d is None:
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d


def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def local(tag):
    return tag.rsplit("}", 1)[-1]


def parse_feed(raw, wallclock_tz=None, sitemap_prefix=None, date_format=None):
    """wallclock_tz: với nguồn ghi sai múi giờ, giữ giờ ghi trong feed và gán múi giờ này."""
    fix = dt.datetime.strptime(wallclock_tz.replace(":", ""), "%z").tzinfo if wallclock_tz else None
    root = ET.fromstring(raw)
    items = []
    for el in root.iter():
        name = local(el.tag)
        if name == "url":
            loc = next((x.text for x in el if local(x.tag) == "loc"), "") or ""
            lm = next((x.text for x in el if local(x.tag) == "lastmod"), None)
            if loc and (not sitemap_prefix or loc.startswith(sitemap_prefix)):
                items.append({"title": loc.rstrip("/").rsplit("/", 1)[-1].replace("-", " "), "link": loc, "date": parse_date(lm), "summary": ""})
            continue
        if name not in ("item", "entry"):
            continue
        rec = {"title": "", "link": "", "date": None, "summary": ""}
        for c in el:
            n = local(c.tag)
            if n == "title":
                rec["title"] = strip_html(c.text or "")
            elif n == "link":
                rec["link"] = (c.get("href") or c.text or "").strip() or rec["link"]
            elif n in ("pubDate", "published", "updated", "date") and rec["date"] is None:
                rec["date"] = parse_date(c.text, date_format)
                if fix and rec["date"]:
                    rec["date"] = rec["date"].replace(tzinfo=fix)
            elif n in ("description", "summary", "content", "encoded") and not rec["summary"]:
                rec["summary"] = strip_html(c.text or "")[:800]
        items.append(rec)
    return items


META_KEYS = {
    "title": ["og:title", "twitter:title"],
    "summary": ["og:description", "description", "twitter:description"],
    "date": ["article:published_time", "datePublished", "publish_date", "date"],
}


def page_meta(url):
    """Đọc thẻ meta chuẩn của một trang: tiêu đề, mô tả, ngày đăng (meta hoặc JSON-LD)."""
    _, body, _, _ = fetch(url)
    h = body[:400000].decode("utf-8", "replace")
    tags = {}
    for m in re.finditer(r"<meta\s+[^>]*>", h, re.I):
        t = m.group(0)
        k = re.search(r'(?:property|name|itemprop)\s*=\s*["\']([^"\']+)', t, re.I)
        v = re.search(r'content\s*=\s*["\']([^"\']*)', t, re.I)
        if k and v:
            tags.setdefault(k.group(1).strip(), html.unescape(v.group(1)).strip())
    for m in re.finditer(r'"datePublished"\s*:\s*"([^"]+)"', h):
        tags.setdefault("datePublished", m.group(1))
    out = {}
    for field, keys in META_KEYS.items():
        for k in keys:
            if tags.get(k):
                out[field] = tags[k]
                out[field + "_from"] = k
                break
    if "title" not in out:
        m = re.search(r"<title[^>]*>(.*?)</title>", h, re.I | re.S)
        if m:
            out["title"], out["title_from"] = strip_html(m.group(1)), "<title>"
    return out


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"})
    t = time.time()
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
        return r.status, body, round((time.time() - t) * 1000), r.headers.get("content-type", "")


