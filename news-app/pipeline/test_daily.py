"""Kiểm thử pipeline với D1 giả lập SQLite, nguồn và GPT giả. Chạy: python3 -m unittest news-app/pipeline/test_daily.py"""
import json, os, sqlite3, sys, unittest, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
import daily, feeds

MIG = open(os.path.join(os.path.dirname(__file__), "..", "migrations", "0001_init.sql"), encoding="utf-8").read()
MIG2 = open(os.path.join(os.path.dirname(__file__), "..", "migrations", "0002_admin.sql"), encoding="utf-8").read()
now = dt.datetime.now(dt.timezone.utc)
rfc = lambda h: (now - dt.timedelta(hours=h)).strftime("%a, %d %b %Y %H:%M:%S +0000")


class FakeD1:
    def __init__(self):
        self.c = sqlite3.connect(":memory:"); self.c.row_factory = sqlite3.Row; self.c.executescript(MIG); self.c.executescript(MIG2); self.calls = 0

    def q(self, sql, params=None):
        self.calls += 1
        cur = self.c.execute(sql, params or [])
        rows = [dict(r) for r in cur.fetchall()] if cur.description else []
        self.c.commit()
        return rows


def rss(*items):
    return ("<rss><channel>" + "".join(f"<item><title>{t}</title><link>{l}</link><pubDate>{d}</pubDate><description>Nội dung {t} đủ dài để tóm tắt.</description></item>" for t, l, d in items) + "</channel></rss>").encode()


def sitemap(*urls):
    return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(f"<url><loc>{u}</loc><lastmod>2026-11-01</lastmod></url>" for u in urls) + "</urlset>").encode()


class T(unittest.TestCase):
    def setUp(self):
        self.db = FakeD1()
        daily.D1 = lambda: self.db
        self.pages = {}
        def fake_fetch(url):
            return 200, self.pages[url], 1, "text/xml"
        feeds.fetch = daily.fetch = fake_fetch
        daily.page_meta = lambda url: {"title": "Trang " + url.rsplit("/", 1)[-1], "summary": "Mô tả", "date": None}
        self.gpt_calls = []
        def fake_gpt(items, cfg):
            self.gpt_calls.append(len(items))
            out = [{"id": n, "tieu_de": "VI " + p["title"], "tom_tat": "Tóm tắt", "nhom": cfg["categories"][0], "muc_do": 3,
                    "trung_voi": 1 if (n == 2 and "trùng" in p["title"]) else None} for n, p in enumerate(items, 1)]
            return out, {"input_tokens": 1000, "output_tokens": 500, "input_tokens_details": {"cached_tokens": 0}}, "gpt-6-luna"
        daily.gpt_batch = fake_gpt
        cfg = {"sources": [{"id": "tc", "name": "TC", "type": "rss", "urls": ["https://tc/feed"]},
                           {"id": "an", "name": "Anthropic", "type": "sitemap", "urls": ["https://an/sitemap.xml"]}],
               "categories": ["AI", "Khác"], "digest": {"window_hours": 48, "max_new_per_run": 200, "batch_size": 40, "model": "m", "reasoning": "low"}}
        self.cfgpath = os.path.join(os.path.dirname(__file__), "_test_sources.json")
        json.dump(cfg, open(self.cfgpath, "w"))
        os.environ["SOURCES_FILE"] = self.cfgpath

    def run_daily(self):
        daily.main()

    def tearDown(self):
        os.remove(self.cfgpath)

    def test_rss_window_dedupe_and_dup(self):
        self.pages["https://tc/feed"] = rss(("Tin A", "https://tc/a?utm=1", rfc(2)), ("Tin A trùng", "https://tc/b", rfc(3)), ("Cũ", "https://tc/old", rfc(100)))
        self.pages["https://an/sitemap.xml"] = sitemap("https://an/news/x")
        self.run_daily()
        arts = self.db.q("SELECT url,dup_of,title_vi FROM articles ORDER BY id")
        self.assertEqual([a["url"] for a in arts], ["https://tc/a", "https://tc/b"])
        self.assertEqual(arts[1]["dup_of"], self.db.q("SELECT id FROM articles WHERE url='https://tc/a'")[0]["id"])
        self.assertEqual(self.db.q("SELECT COUNT(*) n FROM seen_urls")[0]["n"], 1, "sitemap lần đầu chỉ ghi nhận")
        run = self.db.q("SELECT * FROM runs")[0]
        self.assertEqual(run["new_articles"], 2)
        self.assertAlmostEqual(run["est_usd"], (1000 * 0.10 + 500 * 0.50) / 1e6)
        # chạy lại: không gọi GPT cho bài đã có; sitemap có URL mới -> thành bài
        self.pages["https://an/sitemap.xml"] = sitemap("https://an/news/x", "https://an/claude-moi")
        self.gpt_calls.clear()
        self.run_daily()
        self.assertEqual(self.gpt_calls, [1])
        self.assertIn("https://an/claude-moi", [a["url"] for a in self.db.q("SELECT url FROM articles")])

    def test_admin_disabled_source_skipped_and_kept_after_sync(self):
        self.pages["https://tc/feed"] = rss(("Tin A", "https://tc/a", rfc(2)))
        self.pages["https://an/sitemap.xml"] = sitemap()
        self.run_daily()
        self.db.q("UPDATE sources SET admin_disabled=1 WHERE id='tc'")
        self.pages["https://tc/feed"] = rss(("Tin B", "https://tc/b", rfc(1)))
        self.run_daily()
        self.assertNotIn("https://tc/b", [a["url"] for a in self.db.q("SELECT url FROM articles")])
        self.assertEqual(self.db.q("SELECT admin_disabled FROM sources WHERE id='tc'")[0]["admin_disabled"], 1, "đồng bộ sources.json không ghi đè lựa chọn admin")

    def test_source_error_recorded_not_fatal(self):
        self.pages["https://an/sitemap.xml"] = sitemap()
        self.run_daily()  # tc/feed không có -> KeyError trong fetch giả
        err = self.db.q("SELECT last_error FROM sources WHERE id='tc'")[0]["last_error"]
        self.assertIn("https://tc/feed", err)


if __name__ == "__main__":
    unittest.main()
