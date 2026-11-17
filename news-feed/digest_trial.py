"""Chạy thử bản tin hôm nay: lấy bài từ các URL RSS đã qua kiểm tra, gọi GPT (Responses API) một lần
để tóm tắt + phân loại tiếng Việt, ghi out/digest.md và out/digest.json (kèm token và ước phí).
Khóa OpenAI lấy từ biến môi trường OPENAI_API_KEY (GitHub secret), không in ra log."""
import json, os, sys, urllib.request, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
from probe_rss import fetch, parse_feed

NOW = dt.datetime.now(dt.timezone.utc)
VN = dt.timezone(dt.timedelta(hours=7))
# Đơn giá đang dùng trong agent-v2.js của Ngố (USD / 1 triệu token). Chưa đối chiếu hóa đơn.
PRICE_IN, PRICE_CACHED, PRICE_OUT = 0.10, 0.01, 0.50


def collect(cfg, probe):
    usable = {}
    for r in probe["results"]:
        if r["verdict"] in ("DÙNG ĐƯỢC", "ÍT CẬP NHẬT"):
            usable.setdefault(r["source"], []).append(r["url"])
    names = {s["id"]: s["name"] for s in cfg["sources"] if s.get("enabled", True)}
    tzs = {s["id"]: s.get("wallclock_tz") for s in cfg["sources"]}
    smp = {s["id"]: s.get("sitemap_prefix") for s in cfg["sources"]}
    pool, seen = [], set()
    for sid, urls in usable.items():
        if sid not in names:
            continue
        for u in urls:
            try:
                _, body, _, _ = fetch(u)
                items = parse_feed(body, tzs.get(sid), smp.get(sid))
            except Exception as e:
                print("FETCH_FAIL", u, e)
                continue
            for i in items:
                key = (i["link"] or i["title"]).split("?")[0]
                if not i["date"] or key in seen:
                    continue
                seen.add(key)
                pool.append({**i, "source": names[sid], "sid": sid})
    return pool


def select(pool, d):
    def window(h):
        return [p for p in pool if (NOW - p["date"]).total_seconds() <= h * 3600]
    items = window(d["window_hours"])
    if len(items) < d["min_items"]:
        items = window(d["fallback_window_hours"])
    items.sort(key=lambda p: p["date"], reverse=True)
    out, per = [], {}
    for p in items:
        if per.get(p["sid"], 0) >= d["max_per_source"]:
            continue
        per[p["sid"]] = per.get(p["sid"], 0) + 1
        out.append(p)
        if len(out) >= d["max_items"]:
            break
    return out


SYSTEM = """Bạn là biên tập viên bản tin Công nghệ & AI cho người Việt bận rộn.
Với mỗi bài (có thể tiếng Anh hoặc tiếng Việt), viết bằng tiếng Việt tự nhiên, chuẩn báo chí, không dịch máy:
- "tieu_de": tiêu đề tiếng Việt ngắn gọn, giữ nguyên tên riêng/tên sản phẩm.
- "tom_tat": 2-3 câu nêu sự kiện chính, con số quan trọng và ý nghĩa. Chỉ dùng thông tin có trong bài; không bịa.
- "nhom": đúng một nhóm trong danh sách được cho.
- "muc_do": 1-5 (5 = rất quan trọng với người theo dõi AI/công nghệ).
Gộp các bài trùng sự kiện: bài trùng ghi "trung_voi" = id bài chính, vẫn trả về.
Sau đó viết "diem_tin": 5 tin nổi bật nhất trong ngày, mỗi tin 1 câu, giọng nói tự nhiên để đọc thành tiếng.
Trả về JSON duy nhất: {"diem_tin":[...], "bai":[{"id":..,"tieu_de":..,"tom_tat":..,"nhom":..,"muc_do":..,"trung_voi":null}]}"""


def call_gpt(items, cfg):
    d = cfg["digest"]
    payload_items = [{"id": n + 1, "nguon": p["source"], "tieu_de_goc": p["title"], "noi_dung": p["summary"][:600]} for n, p in enumerate(items)]
    body = {
        "model": d["model"],
        "reasoning": {"effort": d["reasoning"]},
        "instructions": SYSTEM,
        "input": "Các nhóm: " + json.dumps(cfg["categories"], ensure_ascii=False) + "\nCác bài:\n" + json.dumps(payload_items, ensure_ascii=False),
        "text": {"format": {"type": "json_object"}},
    }
    req = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            res = json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"OPENAI_HTTP {e.code} {e.read()[:400].decode('utf-8','replace')}")
    text = "".join(c.get("text", "") for o in res.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
    return json.loads(text), res.get("usage", {}), res.get("model")


def main(cfg_path, out_dir):
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    probe = json.load(open(f"{out_dir}/rss_probe.json", encoding="utf-8"))
    items = select(collect(cfg, probe), cfg["digest"])
    print("SELECTED", len(items), {s: sum(1 for i in items if i["sid"] == s) for s in {i["sid"] for i in items}})
    data, usage, model = call_gpt(items, cfg)
    it = int(usage.get("input_tokens", 0)); ot = int(usage.get("output_tokens", 0))
    ct = int((usage.get("input_tokens_details") or {}).get("cached_tokens", 0))
    usd = ((it - ct) * PRICE_IN + ct * PRICE_CACHED + ot * PRICE_OUT) / 1e6
    meta = {"model": model, "items": len(items), "input_tokens": it, "cached_tokens": ct, "output_tokens": ot,
            "est_usd_per_run": round(usd, 6), "est_usd_30_days": round(usd * 30, 4)}
    print("USAGE", json.dumps(meta))
    by_id = {b["id"]: b for b in data.get("bai", [])}
    L = [f"# Bản tin Công nghệ & AI — {NOW.astimezone(VN):%d/%m/%Y} (bản chạy thử)", "",
         f"_Mô hình: {model} · {len(items)} bài · token vào {it} / ra {ot} · ước phí {usd:.4f} USD/lượt ≈ {usd*30:.3f} USD/tháng (theo đơn giá trong code Ngố, chưa đối chiếu hóa đơn)_", "",
         "## Điểm tin", ""] + [f"- {x}" for x in data.get("diem_tin", [])] + [""]
    for cat in cfg["categories"]:
        rows = [(n, p) for n, p in enumerate(items, 1) if by_id.get(n, {}).get("nhom") == cat and not by_id[n].get("trung_voi")]
        if not rows:
            continue
        L += [f"## {cat}", ""]
        for n, p in sorted(rows, key=lambda x: -int(by_id[x[0]].get("muc_do") or 0)):
            b = by_id[n]
            L += [f"**{b.get('tieu_de','')}** ({p['source']}, mức {b.get('muc_do')})  ", f"{b.get('tom_tat','')}  ", f"<{p['link']}>", ""]
    missing = [n for n in range(1, len(items) + 1) if n not in by_id]
    dup = [n for n, b in by_id.items() if b.get("trung_voi")]
    L += ["---", f"Bài trùng sự kiện đã gộp: {len(dup)} · Bài GPT bỏ sót: {missing or 'không'}"]
    open(f"{out_dir}/digest.md", "w", encoding="utf-8").write("\n".join(L) + "\n")
    json.dump({"meta": meta, "items": [{"n": n, "source": p["source"], "title": p["title"], "link": p["link"], "date": p["date"].isoformat()} for n, p in enumerate(items, 1)], "gpt": data},
              open(f"{out_dir}/digest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
