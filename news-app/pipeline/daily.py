"""Pipeline hằng ngày của Bản tin NMH: lấy tin mới từ mọi nguồn đang bật, GPT tóm tắt + chấm điểm
TẤT CẢ bài mới (một lần cho mọi người dùng), ghi vào D1 nmh-news qua Cloudflare API.

Biến môi trường: CF_API_TOKEN, CF_ACCOUNT_ID, D1_ID, OPENAI_API_KEY. Tùy chọn: DRY_RUN=1 (không ghi D1, không gọi GPT).
Khóa không bao giờ được in ra log."""
import json, os, sys, time, uuid, urllib.request, urllib.error, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
from feeds import fetch, parse_feed, page_meta, parse_date

HERE = os.path.dirname(__file__)
NOW = dt.datetime.now(dt.timezone.utc)
NOW_MS = int(time.time() * 1000)
# Đơn giá gpt-6-luna đang dùng trong code Ngố (USD / 1 triệu token). Phải đối chiếu hóa đơn OpenAI sau 1 tuần.
PRICE_IN, PRICE_CACHED, PRICE_OUT = 0.10, 0.01, 0.50


class D1:
    def __init__(self):
        self.url = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CF_ACCOUNT_ID']}/d1/database/{os.environ['D1_ID']}/query"
        self.token = os.environ["CF_API_TOKEN"]
        self.calls = 0

    def q(self, sql, params=None):
        self.calls += 1
        req = urllib.request.Request(self.url, data=json.dumps({"sql": sql, "params": params or []}).encode(), method="POST",
                                     headers={"Authorization": "Bearer " + self.token, "Content-Type": "application/json", "User-Agent": "NMH-NEWS-PIPELINE"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    res = json.load(r)
                if not res.get("success"):
                    raise RuntimeError(json.dumps(res.get("errors"))[:300])
                return (res.get("result") or [{}])[0].get("results", [])
            except urllib.error.HTTPError as e:
                body = e.read()[:300].decode("utf-8", "replace")
                if e.code < 500 or attempt == 2:
                    raise RuntimeError(f"D1 HTTP {e.code}: {body}")
                time.sleep(2 * (attempt + 1))


def norm_url(u):
    return (u or "").split("#")[0].split("?")[0].rstrip("/")


def sync_sources(db, cfg):
    for s in cfg["sources"]:
        db.q("""INSERT INTO sources (id,name,lang,type,urls,wallclock_tz,sitemap_prefix,date_format,is_default,enabled,created_at)
                VALUES (?,?,?,?,?,?,?,?,1,?,?)
                ON CONFLICT(id) DO UPDATE SET name=excluded.name, lang=excluded.lang, type=excluded.type, urls=excluded.urls,
                  wallclock_tz=excluded.wallclock_tz, sitemap_prefix=excluded.sitemap_prefix, date_format=excluded.date_format, is_default=1, enabled=excluded.enabled""",
             [s["id"], s["name"], s.get("lang", "en"), s.get("type", "rss"), json.dumps(s["urls"]), s.get("wallclock_tz"),
              s.get("sitemap_prefix"), s.get("date_format"), 1 if s.get("enabled", True) else 0, NOW_MS])
    db.q("INSERT INTO settings (key,value,updated_at) VALUES ('categories',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
         [json.dumps(cfg["categories"], ensure_ascii=False), NOW_MS])


def collect_rss(src, window_h):
    out, errors = [], []
    for u in json.loads(src["urls"]):
        try:
            _, body, _, _ = fetch(u)
            items = parse_feed(body, src.get("wallclock_tz"), None, src.get("date_format"))
        except Exception as e:
            errors.append(f"{u}: {type(e).__name__} {str(e)[:120]}")
            continue
        for i in items:
            if i["link"] and i["date"] and 0 <= (NOW - i["date"]).total_seconds() <= window_h * 3600 + 3600:
                out.append(i)
    return out, errors


def collect_sitemap(db, src):
    """URL chưa từng gặp = bài mới. Lần đầu (chưa có URL nào) chỉ ghi nhận, không trả bài."""
    out, errors, new_urls = [], [], []
    seeded = db.q("SELECT COUNT(*) AS n FROM seen_urls WHERE source_id=?", [src["id"]])[0]["n"] > 0
    for u in json.loads(src["urls"]):
        try:
            _, body, _, _ = fetch(u)
            items = parse_feed(body, None, src.get("sitemap_prefix"))
        except Exception as e:
            errors.append(f"{u}: {type(e).__name__} {str(e)[:120]}")
            continue
        seen = {r["url"] for r in db.q("SELECT url FROM seen_urls WHERE source_id=?", [src["id"]])}
        new_urls += [i for i in items if i["link"] and i["link"] not in seen]
    for k in range(0, len(new_urls), 30):  # D1 giới hạn 100 tham số mỗi câu lệnh
        chunk = new_urls[k:k + 30]
        db.q("INSERT OR IGNORE INTO seen_urls (source_id,url,first_seen) VALUES " + ",".join(["(?,?,?)"] * len(chunk)),
             [v for i in chunk for v in (src["id"], i["link"], NOW_MS)])
    if not seeded:
        print(f"SITEMAP_SEED {src['id']} ghi nhận {len(new_urls)} URL, không đưa vào bản tin")
        return [], errors
    for i in new_urls[:40]:
        try:
            m = page_meta(i["link"])
        except Exception as e:
            errors.append(f"{i['link']}: meta {type(e).__name__}")
            continue
        pub = parse_date(m.get("date"))
        out.append({"title": m.get("title") or i["title"], "link": i["link"], "summary": m.get("summary", ""),
                    "date": pub if pub and (NOW - pub).total_seconds() < 14 * 86400 else NOW})
    return out, errors


SYSTEM = """Bạn là biên tập viên bản tin Công nghệ & AI cho người Việt.
Với MỖI bài (tiếng Anh hoặc tiếng Việt), viết bằng tiếng Việt tự nhiên, chuẩn báo chí, không dịch máy:
- tieu_de: tiêu đề tiếng Việt ngắn gọn, giữ nguyên tên riêng/tên sản phẩm.
- tom_tat: 2-3 câu nêu sự kiện chính, con số quan trọng và ý nghĩa. Chỉ dùng thông tin có trong bài; không bịa.
- nhom: đúng một nhóm trong danh sách được cho.
- muc_do: 1-5 theo giá trị tin tức với người theo dõi công nghệ và AI (5 = rất quan trọng; khuyến mãi, quảng cáo, mẹo đời sống, giải trí = 1).
- trung_voi: id của bài khác trong "Các bài" nói cùng sự kiện (chọn bài đầy đủ hơn làm bài chính), nếu không có thì null.
- trung_voi_bai_cu: nếu bài nói cùng sự kiện với một bài trong "Bài đã có" thì ghi id bài cũ đó, nếu không thì null.
Ưu tiên giá trị thực tiễn: ứng dụng AI vào công việc và đời sống thực tế, sự cố/lỗ hổng/tấn công bảo mật (nhất là liên quan AI) có ảnh hưởng tới người dùng hay doanh nghiệp là tin có giá trị cao.
Trả về đủ mọi bài theo đúng cấu trúc yêu cầu."""


def gpt_batch(items, cfg, recent=None):
    d = cfg["digest"]
    schema = {"type": "object", "additionalProperties": False, "required": ["bai"], "properties": {
        "bai": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                "required": ["id", "tieu_de", "tom_tat", "nhom", "muc_do", "trung_voi", "trung_voi_bai_cu"],
                "properties": {"id": {"type": "integer"}, "tieu_de": {"type": "string"}, "tom_tat": {"type": "string"},
                               "nhom": {"type": "string", "enum": cfg["categories"]}, "muc_do": {"type": "integer"},
                               "trung_voi": {"type": ["integer", "null"]}, "trung_voi_bai_cu": {"type": ["integer", "null"]}}}}}}
    payload = [{"id": n, "nguon": p["source_name"], "tieu_de_goc": p["title"], "noi_dung": p["summary"][:600]} for n, p in enumerate(items, 1)]
    body = {"model": d["model"], "reasoning": {"effort": d["reasoning"]}, "instructions": SYSTEM,
            "input": "Các nhóm: " + json.dumps(cfg["categories"], ensure_ascii=False)
                     + "\nBài đã có (36 giờ gần nhất, chỉ để nhận biết trùng sự kiện):\n" + json.dumps(recent or [], ensure_ascii=False)
                     + "\nCác bài:\n" + json.dumps(payload, ensure_ascii=False),
            "text": {"format": {"type": "json_schema", "name": "ban_tin", "strict": True, "schema": schema}}}
    req = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"OPENAI_HTTP {e.code} {e.read()[:300].decode('utf-8', 'replace')}")
    text = "".join(c.get("text", "") for o in res.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
    return json.loads(text)["bai"], res.get("usage", {}), res.get("model")


def main():
    cfg = json.load(open(os.environ.get("SOURCES_FILE") or os.path.join(HERE, "..", "sources.json"), encoding="utf-8"))
    dry = os.environ.get("DRY_RUN") == "1"
    db = D1()
    run_id = NOW.strftime("%Y%m%d-%H%M") + "-" + uuid.uuid4().hex[:6]
    sync_sources(db, cfg)
    db.q("INSERT INTO runs (id,started_at,note) VALUES (?,?,?)", [run_id, NOW_MS, "dry" if dry else None])
    sources = db.q("SELECT * FROM sources WHERE enabled=1 AND admin_disabled=0")
    pool, seen = [], set()
    for src in sources:
        if src["type"] == "sitemap":
            items, errors = collect_sitemap(db, src)
        else:
            items, errors = collect_rss(src, cfg["digest"]["window_hours"])
        db.q("UPDATE sources SET last_ok_at=?, last_error=? WHERE id=?",
             [NOW_MS if items or not errors else src["last_ok_at"], "; ".join(errors)[:500] or None, src["id"]])
        kept = 0
        for i in items:
            key = norm_url(i["link"])
            if key in seen:
                continue
            seen.add(key)
            pool.append({**i, "url": key, "source_id": src["id"], "source_name": src["name"]})
            kept += 1
        print(f"SOURCE {src['id']} items={len(items)} kept={kept} errors={len(errors)}", "; ".join(errors)[:300])
    # Bỏ bài đã có trong D1
    existing = set()
    urls = [p["url"] for p in pool]
    for k in range(0, len(urls), 80):
        chunk = urls[k:k + 80]
        rows = db.q(f"SELECT url FROM articles WHERE url IN ({','.join('?' * len(chunk))})", chunk)
        existing |= {r["url"] for r in rows}
    new = sorted([p for p in pool if p["url"] not in existing], key=lambda p: p["date"], reverse=True)[: cfg["digest"]["max_new_per_run"]]
    print("NEW_ARTICLES", len(new), "of pool", len(pool))
    tot = {"in": 0, "cached": 0, "out": 0}
    model = None
    bs = cfg["digest"]["batch_size"]
    written = 0
    recent_rows = db.q("SELECT id, title_vi FROM articles WHERE dup_of IS NULL AND title_vi IS NOT NULL AND published_at >= ? ORDER BY published_at DESC LIMIT 300",
                       [NOW_MS - 36 * 3600 * 1000])
    recent = [{"id": r["id"], "tieu_de": r["title_vi"][:120]} for r in recent_rows]
    for k in range(0, len(new), bs):
        batch = new[k:k + bs]
        if dry:
            continue
        res, usage, model = gpt_batch(batch, cfg, recent)
        tot["in"] += int(usage.get("input_tokens", 0)); tot["out"] += int(usage.get("output_tokens", 0))
        tot["cached"] += int((usage.get("input_tokens_details") or {}).get("cached_tokens", 0))
        by_id = {b["id"]: b for b in res}
        local_to_db = {}
        for n, p in enumerate(batch, 1):
            b = by_id.get(n)
            if not b:
                print("GPT_MISSING", p["url"])
                continue
            rows = db.q("""INSERT INTO articles (url,source_id,title_orig,published_at,fetched_at,title_vi,summary_vi,category,importance,run_id)
                           VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO NOTHING RETURNING id""",
                        [p["url"], p["source_id"], p["title"][:500], int(p["date"].timestamp() * 1000), NOW_MS,
                         b["tieu_de"][:300], b["tom_tat"][:1500], b["nhom"], max(1, min(5, int(b["muc_do"]))), run_id])
            if rows:
                local_to_db[n] = rows[0]["id"]
                written += 1
        recent_ids = {r["id"] for r in recent}
        for n, b in by_id.items():
            if n not in local_to_db:
                continue
            if b.get("trung_voi_bai_cu") in recent_ids:
                db.q("UPDATE articles SET dup_of=? WHERE id=?", [b["trung_voi_bai_cu"], local_to_db[n]])
            elif b.get("trung_voi") and b["trung_voi"] in local_to_db and b["trung_voi"] != n:
                db.q("UPDATE articles SET dup_of=? WHERE id=?", [local_to_db[b["trung_voi"]], local_to_db[n]])
        # bài mới (không trùng) của lượt này cũng thành "bài đã có" cho các mẻ sau
        recent += [{"id": local_to_db[n], "tieu_de": by_id[n]["tieu_de"][:120]} for n in local_to_db if not by_id[n].get("trung_voi") and not by_id[n].get("trung_voi_bai_cu")]
    usd = ((tot["in"] - tot["cached"]) * PRICE_IN + tot["cached"] * PRICE_CACHED + tot["out"] * PRICE_OUT) / 1e6
    db.q("UPDATE runs SET finished_at=?, new_articles=?, model=?, input_tokens=?, cached_tokens=?, output_tokens=?, est_usd=? WHERE id=?",
         [int(time.time() * 1000), written, model, tot["in"], tot["cached"], tot["out"], round(usd, 6), run_id])
    summary = {"run_id": run_id, "new_written": written, "model": model, "tokens": tot, "est_usd": round(usd, 6), "d1_calls": db.calls}
    print("RUN_SUMMARY", json.dumps(summary))
    out = os.environ.get("RUN_SUMMARY_FILE")
    if out:
        json.dump(summary, open(out, "w"))


if __name__ == "__main__":
    main()
