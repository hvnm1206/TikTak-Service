"""Kiểm tra từng URL RSS trong sources.json: HTTP, số bài, bài mới nhất, tần suất cập nhật.
Ghi kết quả ra out/rss_probe.json và out/rss_probe.md. Chỉ đọc, không gọi API trả phí."""
import json, sys, time, urllib.request, email.utils, datetime as dt, xml.etree.ElementTree as ET, html, re, os

UA = "NMH-NewsFeed/0.1 (+https://nomahubvn.com)"
NOW = dt.datetime.now(dt.timezone.utc)


def parse_date(s):
    if not s:
        return None
    s = s.strip()
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


def parse_feed(raw, wallclock_tz=None, sitemap_prefix=None):
    """wallclock_tz: với nguồn ghi sai múi giờ, giữ giờ ghi trong feed và gán múi giờ này."""
    fix = dt.datetime.strptime(wallclock_tz.replace(":", ""), "%z").tzinfo if wallclock_tz else None
    root = ET.fromstring(raw)
    items = []
    for el in root.iter():
        name = local(el.tag)
        if name == "url":
            loc = next((x.text for x in el if local(x.tag) == "loc"), "") or ""
            lm = next((x.text for x in el if local(x.tag) == "lastmod"), None)
            if sitemap_prefix and loc.startswith(sitemap_prefix):
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
                rec["date"] = parse_date(c.text)
                if fix and rec["date"]:
                    rec["date"] = rec["date"].replace(tzinfo=fix)
            elif n in ("description", "summary", "content", "encoded") and not rec["summary"]:
                rec["summary"] = strip_html(c.text or "")[:800]
        items.append(rec)
    return items


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"})
    t = time.time()
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read()
        return r.status, body, round((time.time() - t) * 1000), r.headers.get("content-type", "")


def probe(url, wallclock_tz=None, sitemap_prefix=None):
    out = {"url": url}
    try:
        status, body, ms, ctype = fetch(url)
        out.update(http=status, ms=ms, bytes=len(body), content_type=ctype)
        items = parse_feed(body, wallclock_tz, sitemap_prefix)
        dates = sorted([i["date"] for i in items if i["date"]], reverse=True)
        out["items"] = len(items)
        out["with_date"] = len(dates)
        out["with_summary"] = sum(1 for i in items if len(i["summary"]) > 40)
        if dates:
            out["newest"] = dates[0].isoformat()
            out["oldest"] = dates[-1].isoformat()
            out["age_newest_h"] = round((NOW - dates[0]).total_seconds() / 3600, 1)
            out["last_24h"] = sum(1 for d in dates if (NOW - d).total_seconds() <= 86400)
            out["last_7d"] = sum(1 for d in dates if (NOW - d).total_seconds() <= 7 * 86400)
        out["sample"] = [{"title": i["title"][:120], "date": i["date"].isoformat() if i["date"] else None} for i in items[:3]]
        out["ok"] = bool(items) and bool(dates)
    except urllib.error.HTTPError as e:
        out.update(http=e.code, ok=False, error=str(e)[:200])
    except Exception as e:
        out.update(ok=False, error=f"{type(e).__name__}: {str(e)[:200]}")
    return out


def verdict(r):
    if not r.get("ok"):
        return "HỎNG"
    age = r.get("age_newest_h", 9999)
    if age <= 48 and r.get("last_7d", 0) >= 3:
        return "DÙNG ĐƯỢC"
    if age <= 24 * 14:
        return "ÍT CẬP NHẬT"
    return "NGỪNG CẬP NHẬT"


def main(cfg_path, out_dir):
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    res = []
    for s in cfg["sources"]:
        for u in s["urls"]:
            r = probe(u, s.get("wallclock_tz"), s.get("sitemap_prefix"))
            r["source"] = s["id"]
            r["verdict"] = verdict(r)
            res.append(r)
            print("RSS", s["id"], r["verdict"], r.get("http"), r.get("items"), r.get("last_24h"), r.get("last_7d"), r.get("age_newest_h"), u, r.get("error", ""))
    json.dump({"checked_at": NOW.isoformat(), "results": res}, open(f"{out_dir}/rss_probe.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    lines = [f"# Kiểm tra RSS — {NOW.isoformat()} (UTC, chạy từ GitHub Actions)", "",
             "| Nguồn | URL | Kết luận | HTTP | Số bài | 24h | 7 ngày | Bài mới nhất cách (giờ) | Có tóm tắt |",
             "|---|---|---|---|---|---|---|---|---|"]
    for r in res:
        lines.append(f"| {r['source']} | {r['url']} | {r['verdict']} | {r.get('http','-')} | {r.get('items','-')} | {r.get('last_24h','-')} | {r.get('last_7d','-')} | {r.get('age_newest_h','-')} | {r.get('with_summary','-')} |")
    open(f"{out_dir}/rss_probe.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
