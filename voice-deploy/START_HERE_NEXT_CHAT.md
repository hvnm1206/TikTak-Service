# NMH VOICE GPT — ĐIỂM BÀN GIAO DUY NHẤT CHO CỬA MỚI

## 14/11/2026 — WEB SEARCH HOSTED: CHỈ STAGE/PREVIEW, CHƯA DEPLOY PRODUCTION (MỚI NHẤT)

**Production tuyệt đối chưa thay đổi:** Worker `nmh-voice-gpt-test`, active version `8cc6032c-0035-414c-8217-7ea5e91825e5` được GitHub Actions kiểm tra bằng Cloudflare API trước và sau upload. URL production giữ nguyên `https://nmh-voice-gpt-test.magical-budget.workers.dev/`. **Production hiện CHƯA có Web Search tổng quát.**

**Mã nguồn đang ở nhánh `nmh-voice-gpt-v1`, chưa phát hành:** `voice-deploy/agent-v2.js` thêm hosted `web_search` Responses API cho `gpt-6-luna`; parse `web_search_call` + `url_citation`; giới hạn tối đa 1 hosted call mỗi lượt; trả `estimatedWebSearchUsd` (0,01 USD/call cơ bản, chưa tính token nội dung); sửa đơn giá ước phí GPT Luna theo tài liệu OpenAI Standard 0,10/0,01/0,50 USD cho 1M token input/cached/output. `worker.js` chỉ cộng khoản Web Search vào sổ ước phí giao diện đang có, giữ nguyên STT/SpeechRecognition, Marin, Presence, D1/OAuth. Các nguồn công cụ thời tiết/Wikipedia/RSS cũ được giữ.

**Bằng chứng CI:** [Actions 43534668517](https://github.com/hvnm1206/TikTak-Service/actions/runs/43534668517) `verify=SUCCESS`, `31/31 Voice PASS`, `7/7 V3 PASS`, `deploy=SKIPPED`. [Actions upload preview 43535038784](https://github.com/hvnm1206/TikTak-Service/actions/runs/43535038784): `verify=SUCCESS`, `nmh-web-search-version-preview=SUCCESS`, `deploy=SKIPPED`, `PRODUCTION_VERSION_UNCHANGED=PASS`.

**Bản preview phiên bản trên CHÍNH Worker (không tạo Worker/branch mới):** version `c0b6d225-2f0f-4217-9fa3-d39e8d292fe7`, URL `https://c0b6d225-nmh-voice-gpt-test.magical-budget.workers.dev/`. Guarded Operator đọc trực tiếp /health 200, /api/v3/config 200 `ready=true`, trang / 200 chứa giao diện Presence và sổ phí mới. Bản này dùng binding D1 V3 và Google Web Client hiện hành; **Google OAuth origin trên Version URL khác production nên không coi đăng nhập Google preview là đã nghiệm thu**. Workflow upload preview dùng một lần đã được gỡ khỏi source; phiên bản đã upload vẫn tồn tại để kiểm thử. Không deploy hoặc rollback production.

**ĐIỀU KIỆN CHƯA ĐẠT:** chưa có thử nghiệm Web Search với API key người dùng thực (key chỉ lưu trên iPhone/SETUP), chưa có kết quả địa điểm Mỹ Đình có nguồn qua API thật, chưa kiểm thử micro → search → Marin → nghe tiếp trên iPhone, chưa đối chiếu chi phí OpenAI Usage. Các bài test dùng response giả lập; không công bố nâng cấp hoàn thành. Không được promote version preview lên production khi chưa có bằng chứng E2E trên iPhone và đủ cổng rollback.

---

## 14/11/2026 — CHỐT DỌN DẸP SAU SỰ CỐ TÌM KIẾM (TRẠNG THÁI HIỆN HÀNH)

**PRODUCTION GIỮ NGUYÊN.** Cloudflare Worker `nmh-voice-gpt-test`, URL https://nmh-voice-gpt-test.magical-budget.workers.dev/, active version **`8cc6032c-0035-414c-8217-7ea5e91825e5`** đã kiểm chứng bằng Cloudflare API và HTTP sau dọn dẹp. Không deploy hay rollback Worker production trong đợt dọn dẹp này.

**DỌN XONG VÀ CÓ BẰNG CHỨNG:** [GitHub Actions 43531780452](https://github.com/hvnm1206/TikTak-Service/actions/runs/43531780452) **SUCCESS**:
- Xóa **chỉ** Cloudflare staging Worker `nmh-voice-search-lab-v2`; Cloudflare API đọc lại trả HTTP 404.
- Xóa **chỉ** hai nhánh thí nghiệm `nmh-voice-search-lab`, `nmh-voice-search-isolated-v2`; GitHub đọc lại trả HTTP 404.
- Xóa `.github/workflows/nmh-voice-rollback-search.yml`, mã test Safari tạm `voice-deploy/browser-voice-contract.test.mjs`, tài liệu lab `SEARCH_WEB_V2_LAB_2026-11-14.md`. Workflow dọn dẹp dùng một lần đã tự được gỡ khỏi source sau khi chạy; không còn workflow nào có thể tự dựng lại staging.
- Khôi phục `voice-deploy/presence-ui.js` **đúng blob SHA `4f9e5ad1e8826aed7b2ba1a714e197a9d39ba8d1`** của commit production baseline `3a40173817ab9f8bc4e93ce2c73bfd9d75ac1a03`; `worker.js`, `agent-v2.js`, `v3-ui.js` trước đó đã trùng byte-for-byte baseline. Loại bỏ CI test liên quan watchdog chưa phát hành.
- Giữ nguyên tài nguyên đã được người dùng dùng từ trước: Google Web Client, D1 `nmh-voice-v3`, tính cách Prompt, ghi nhớ, tài liệu TXT/Markdown, bộ nút NÓI/TIẾP TỤC, Marin TTS và bản Presence. **Không xóa D1, không thu hồi token, không xóa GitHub branch `nmh-voice-gpt-v1`, không đụng `main`**.
- Sau cleanup: GET `/health` PASS, GET `/api/v3/config` PASS (`ready=true, Cloudflare D1`), GET `/` có `avatar/start/resume`, không có `v3WebSearch`; HTTPS production `/search-lab` HTTP 404.

**TRẠNG THÁI TÌM KIẾM:** Không tồn tại Web Search nâng cao trong production. Các bộ thử bị bỏ và không được coi là phần đã triển khai. Chỉ còn công cụ công khai cũ (Open-Meteo, Wikipedia, Google News RSS). Nhu cầu tìm kiếm web thực sự **chưa được hoàn thành**.

**GIỚI HẠN NGHIỆM THU:** HTTP/API/CI và xác minh source **không** thay thế việc nghe–nói thực trên iPhone. Người dùng trước đó xác nhận bản rollback giao tiếp bình thường; sau cleanup không thay đổi production, nhưng chưa có lượt thử trực tiếp mới trong cùng thời điểm. Không tuyên bố E2E đã kiểm nghiệm trong lượt dọn dẹp.

**Những mục “ĐÃ DEPLOY TÌM KIẾM”, “STAGING ĐANG CÓ”, “HOTFIX WATCHDOG CHỜ DEPLOY” trong nhật ký trước đây đều là lịch sử và đã bị thay thế bởi kết luận trên.** Không lấy lại nhánh, Worker hay file thử nghiệm từ commit cũ nếu chưa có yêu cầu mới.

---

## 14/11/2026 — NMH VOICE V3 D1-ONLY: ĐÃ DEPLOY (ĐỌC TRƯỚC MỌI NHẬT KÝ CŨ)

**URL production giữ nguyên:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — Worker `nmh-voice-gpt-test` trên Cloudflare account Magical Budget. **Version production đã kiểm chứng:** `8cc6032c-0035-414c-8217-7ea5e91825e5`; source release commit `3a40173817ab9f8bc4e93ce2c73bfd9d75ac1a03`; [Actions release 43470633928](https://github.com/hvnm1206/TikTak-Service/actions/runs/43470633928) **SUCCESS** (verify + deploy đều PASS).

- **Google Web Client:** người dùng tự tạo OAuth Client loại Web application, Authorized JavaScript Origin là URL Worker, sau đó đặt `NMH_V3_GOOGLE_CLIENT_ID` vào GitHub Actions Secret. [Read-only capability 43469417270](https://github.com/hvnm1206/TikTak-Service/actions/runs/43469417270) chứng minh `V3_GOOGLE_WEB_CLIENT=CONFIGURED_VALID_FORMAT`, D1 HTTP 200, R2 không yêu cầu. Client ID chưa được thử bằng phiên đăng nhập Google của người dùng thực tế.
- **D1:** cơ sở dữ liệu `nmh-voice-v3`, id `3ce295cb-a84d-4a50-abee-d14fdd903514`; migration 0001 và 0002 (`v3_documents.raw_text`) đã chạy PASS trên Cloudflare. V3 lưu Prompt, ghi nhớ, tài liệu TXT/Markdown và đoạn chỉ mục trực tiếp trong D1; không dùng R2, không cần kích hoạt thanh toán.
- **Giao diện/Voice:** tích hợp V3 trong SETUP, Prompt tính cách tự sửa + mẫu, ghi nhớ chỉ lưu khi nhập tay hoặc ra lệnh rõ (có thêm/sửa/xóa), kho TXT/Markdown, hiển thị nguồn; vẫn dùng giao diện Canvas Presence, browser STT, GPT API và Marin.
- **Bảo mật:** Google ID token được backend xác minh RS256 + JWKS + audience/issuer/expiry; phiên cookie HttpOnly/Secure và hash phiên D1; truy vấn riêng theo chủ tài khoản, thao tác cập nhật kiểm soát origin. Các test cô lập dữ liệu giữa hai tài khoản là **test giả lập**, chưa phải E2E Google thực.
- **Sự cố và cách xử lý:** release [43470042637](https://github.com/hvnm1206/TikTak-Service/actions/runs/43470042637) upload version `8e52b401-a5fa-4780-b242-2ec420f2bfdf` nhưng smoke đọc V3 khi routing còn trả V2 (404); workflow **rollback thành công** về `abcac5e5-0749-45ac-8c94-1d1bed49df82`. Sau đó thêm `/health.v3Version="d1-only-google-v3"` và kiểm thử polling health + V3 config trên mỗi lần triển khai.
- **Bản phát hành cuối:** snapshot rollback `abcac5e5-0749-45ac-8c94-1d1bed49df82`, release `43470633928`: `V3_EDGE_READY_AT_ATTEMPT=1`, `V3_SMOKE=HEALTH_UI_D1_CONFIG_UNAUTH_LOGIN_INVALID_TOKEN_DOCS_OK`, `V3_DEPLOY_FINAL=SUCCESS`. Workflow `.github/workflows/nmh-voice-v3-release.yml` sau release đã **khóa lại về chỉ workflow_dispatch chủ động**, không auto-deploy khi push thông thường.
- **Đối chiếu độc lập bằng NMH Guarded Operator:** `GET /health` HTTP 200, `v3Version=d1-only-google-v3`; `GET /api/v3/config` HTTP 200, `ready=true, sync=true, storage=Cloudflare D1, r2Required=false`; trang `/` HTTP 200 có `avatar`, `v3Prompt`, `v3Memories`, `v3Documents`, Google GIS script và onload callback; `GET /api/v3/me` và `/api/v3/profile` khi chưa đăng nhập đều HTTP 401; `/api/docs/maintenance` HTTP 200.
- **Chưa nghiệm thu:** Google Sign-In bằng tài khoản thật và đồng bộ giữa iPhone với máy tính; voice ra lệnh ghi nhớ thực; trả lời trên tài liệu thực; PDF/DOCX/OCR; so sánh phí GPT/Marin thực, iPhone Voice E2E. `ready=true` là backend D1/OAuth cấu hình đúng, **không phải bằng chứng người dùng đã đăng nhập hoặc đồng bộ E2E**. Cần người dùng thực hiện một phiên đăng nhập Google, sau đó kiểm tra trên hai thiết bị mới được đóng các mục này. Google Consent External/Testing có thể cần thêm tài khoản vào danh sách Test users nếu Google từ chối đăng nhập.

**Trạng thái:** PHÁT HÀNH / HTTP SMOKE **PASS**; NGHIỆM THU NGƯỜI DÙNG & TÀI LIỆU PDF/DOCX **CHƯA ĐẠT**. Giữ tiêu chuẩn không đánh đồng một lần CI thành nghiệm thu toàn bộ.

---


## V3 — THAY THẾ R2 BẰNG D1-ONLY (13/11/2026, TRẠNG THÁI MỚI NHẤT)

**QUYẾT ĐỊNH:** R2 chưa kích hoạt được vì lỗi thanh toán của Cloudflare. Không tiếp tục yêu cầu đăng ký/thẻ. Dùng D1 đã tồn tại để lưu cả Prompt, ghi nhớ, tài liệu văn bản và chỉ mục. Giữ Google Sign-In như phương án người dùng đã duyệt; chưa cấu hình Web Client, nên V3 **chưa triển khai production**.

**Đã thực hiện trên Cloudflare thật:**
- D1 `nmh-voice-v3`, ID `3ce295cb-a84d-4a50-abee-d14fdd903514`, migration gốc PASS.
- Schema D1-only bổ sung cột `v3_documents.raw_text TEXT` đã thực hiện trực tiếp qua Cloudflare API và đọc lại: [Actions 43466192818](https://github.com/hvnm1206/TikTak-Service/actions/runs/43466192818), `V3_D1_DOC_TEXT_COLUMN=CREATED`, `V3_D1_TEXT_ONLY_MIGRATION=PASS`, số tài liệu ở lúc kiểm tra = 0. Không xóa hoặc di chuyển dữ liệu người dùng.
- Source `voice-deploy/v3-backend.js` lưu nội dung nguyên văn và các đoạn chỉ mục trực tiếp vào D1 trong batch; GET danh mục, xem nội dung theo chủ tài khoản, xóa metadata + segments; bỏ mọi lệnh `NMH_DOCS.put/delete`, không yêu cầu R2 binding.
- `voice-deploy/v3-ui.js` ghi rõ kho TXT/Markdown lưu D1; có thao tác XEM, XÓA; PDF/DOCX/OCR chưa trích xuất và không được công bố đã hỗ trợ.
- Workflow `nmh-voice-v3-provision.yml`, `nmh-voice-v3-release.yml` đã loại bỏ R2 gate và binding; `nmh-voice-v3-capability.yml` chỉ cần D1.
- SQL migration `voice-deploy/migrations/0002_v3_d1_only.sql` đã được sửa ký tự xuống dòng chuẩn sau một lần test schema phát hiện lỗi định dạng.
- [CI 43466750674](https://github.com/hvnm1206/TikTak-Service/actions/runs/43466750674): V2 **26/26 PASS**, V3 **7/7 PASS**, SQLite schema 0001+0002 PASS, workflow YAML PASS, Worker deploy SKIPPED. Worker production cũ vẫn version `abcac5e5-0749-45ac-8c94-1d1bed49df82`.
- Tài khoản Cloudflare vẫn không có R2 subscription; không còn phụ thuộc R2 đối với tài liệu văn bản. Theo Cloudflare D1 Free: giới hạn 500MB/database và 5GB/account; lưu ý read/write daily quotas.

**Chưa đạt / bước phải tiếp tục:**
1. **Google OAuth Web Client:** tạo ứng dụng web cho origin `https://nmh-voice-gpt-test.magical-budget.workers.dev` và lưu Client ID vào GitHub Secret `NMH_V3_GOOGLE_CLIENT_ID`; OAuth của Operator không thể tự coi là web client này.
2. Khi Google Web Client đã được xác minh, deploy theo `.github/workflows/nmh-voice-v3-release.yml` (snapshot Worker cũ + rollback), test login thực, đồng bộ Prompt/ghi nhớ giữa 2 thiết bị, tài liệu TXT/MD, cô lập 2 tài khoản và STT/Marin/Presence regression.
3. PDF/DOCX/OCR chưa hoàn thành: phải thực hiện bước trích xuất chữ theo giới hạn D1 trước khi có thể tuyên bố hỗ trợ những định dạng này.
4. Chưa có bằng chứng Voice V3 E2E trên iPhone hoặc hóa đơn GPT/TTS; không gắn PASS.

**Kết luận:** Giải quyết dứt điểm **phụ thuộc R2/billing cho kho văn bản**, nhưng dự án V3 nói chung còn cổng Google Web Client + nghiệm thu thực; **không deploy khi chưa đủ cổng**.

---


## V3 — CẬP NHẬT HẠ TẦNG 13/11/2026 SAU KHI CẤP TOKEN (ƯU TIÊN TRƯỚC CÁC GHI CHÚ V3 CŨ)

**D1 ĐÃ ĐẠT VỀ HẠ TẦNG; V3 CHƯA PHÁT HÀNH.** Người dùng đã tự cấu hình Secret `NMH_V3_CF_PROVISION_TOKEN` trong GitHub và không gửi giá trị token vào chat. Không sửa token Worker cũ.

- **Đối chiếu token mới:** [Actions 43459324694](https://github.com/hvnm1206/TikTak-Service/actions/runs/43459324694) qua Cloudflare API, D1 `GET /d1/database` HTTP 200/AUTHORIZED, R2 `GET /r2/buckets` HTTP 403 mã **10042**; Google Web Client `NMH_V3_GOOGLE_CLIENT_ID` chưa cấu hình.
- **Kết luận lỗi R2:** mã **10042 / NotEntitled** theo tài liệu chính thức Cloudflare nghĩa là tài khoản chưa có R2 subscription/entitlement, **không kết luận là token R2 thiếu quyền**. Cloudflare yêu cầu chủ tài khoản vào `Storage & databases → R2 → Overview` và hoàn thành kích hoạt R2; có bước billing nên **không được AI tự đồng ý chi phí**.
- **Cấp phát D1 độc lập đã thành công:** [Actions 43459579821](https://github.com/hvnm1206/TikTak-Service/actions/runs/43459579821) job `d1-bootstrap` SUCCESS; resource `nmh-voice-v3`, UUID **`3ce295cb-a84d-4a50-abee-d14fdd903514`**. Tạo bằng API Cloudflare với token cấp mới và đúng Account ID `769c2ab4af5ad50700039d473a72d48e`.
- D1 migration `voice-deploy/migrations/0001_v3.sql` đã chạy **11 SQL statements**, sau đó truy vấn từ D1 remote bảng `v3_sessions`: `V3_D1_MIGRATION=PASS`, `V3_D1_PROVISIONED_AND_VERIFIED=PASS`. Không tạo dữ liệu cá nhân thực; không thay Worker production.
- Workflow cấp D1 an toàn/idempotent được lưu `.github/workflows/nmh-voice-v3-d1-bootstrap.yml`. Chạy tự động theo push thay đổi chính file này, KHÔNG auto-deploy ứng dụng.
- **Còn phải làm:** (1) chủ tài khoản kích hoạt R2 subscription theo điều khoản Cloudflare; (2) chạy lại kiểm tra R2 và provision bucket `nmh-voice-v3-docs`; (3) tạo Google OAuth **Web Client** dành riêng ứng dụng, JavaScript Origin `https://nmh-voice-gpt-test.magical-budget.workers.dev`, thiết lập `NMH_V3_GOOGLE_CLIENT_ID`; (4) chạy pre-deploy/guarded release đúng Worker, test đăng nhập và đồng bộ hai thiết bị thật, ghi nhớ có lệnh, tài liệu. PDF/DOCX/OCR chưa được hiện thực hóa; không gắn PASS.
- **Giới hạn nghiệm thu:** D1 database/schema PASS là kết quả hạ tầng, **không phải** xác nhận người dùng đã đồng bộ thực tế. Production vẫn NMH Presence V2, chưa kích hoạt V3.

---

## CẬP NHẬT NHÁNH V3 13/11/2026 — CHƯA DEPLOY
- Người dùng chốt Google Sign-In + D1/R2 đồng bộ, Prompt chỉnh tự do, ghi nhớ **chỉ theo lệnh/nhập tay**, kho tài liệu có nguồn. ĐÃ VIẾT SOURCE + PASS MOCK CI, CHƯA CÓ PROD V3.
- Đọc đầu file `MAINTENANCE.md` và `voice-deploy/V3_STATUS_2026-11-13.md` để có bằng chứng. Cloudflare token hiện tại D1 HTTP 401 / R2 HTTP 403, `NMH_V3_GOOGLE_CLIENT_ID` thiếu; Operator Google OAuth không tự đồng nghĩa Google Web Client trên workers.dev.
- Code mới: `v3-backend.js`, `v3-ui.js`, `migrations/0001_v3.sql`; tích hợp vào Worker source trên nhánh `nmh-voice-gpt-v1` và CI. **Không** có PDF/DOCX/OCR hoàn chỉnh, chỉ TXT/Markdown.
- Không deploy Worker V3 trước khi khắc phục scope, cấu hình Google OAuth và test trên thiết bị; chuẩn hóa bằng workflow V3 provision/release có rollback.



## BẢO TRÌ MỚI NHẤT — 13/11/2026 (ƯU TIÊN HƠN GHI CHÚ CŨ)
- Chính thức `https://nmh-voice-gpt-test.magical-budget.workers.dev/`, Worker `nmh-voice-gpt-test`, `/health` trả `uiVersion=presence-canvas-v1`. AI và giọng giữ `gpt-6-luna` / `marin`.
- **Cloudflare version đang chạy:** `abcac5e5-0749-45ac-8c94-1d1bed49df82`; source release commit `e2b08266120df63840c516cc05e9f48cab7ac1a1`. [Actions run 43440716438](https://github.com/hvnm1206/TikTak-Service/actions/runs/43440716438) SUCCESS, **26/26 tests PASS**, smoke HEALTH/UI PRESENCE/DOCS/SECURITY PASS; rollback snapshot trước deploy `e6cb6c6d-064c-413e-8a12-93cf4873fa00`.
- Trong tab BẢO TRÌ: tài liệu `MAINTENANCE.md` đã được cập nhật commit `ac14f06c3df133642621b286ef7b8efd0413c63b`. Có phần tổng hợp hiện trạng, 16 findings, phản hồi giao diện “Tao thấy khá tốt đấy”, nguồn code, chi phí, đối sách, bản ghi lịch sử. Đây là file **chuẩn hiện trạng**, không xem các đoạn cũ trong handover này là bản production.
- Đã xử lý lỗi Github Raw cache cũ và GitHub Contents API ẩn danh đôi lúc trả 403 → Worker 502: dùng Cloudflare edge cache TTL 120 giây + raw fallback **có kiểm tra marker**, lỗi rõ nếu không lấy được. Sau release, 5 lượt probe độc lập BẢO TRÌ liên tiếp HTTP 200 và đúng nội dung 22.422 ký tự. Commit tài liệu sau đó có thể chưa xuất hiện tại edge trong tối đa ~120 giây.
- Người dùng **đánh giá tích cực sơ bộ về UI Presence**, không có cơ sở tuyên bố nghiệm thu micro/giọng liên tục toàn chuỗi trên iPhone ở release này. F01 TTS deprecation, F02 phí thực, F03 budget cap, F06 E2E còn mở; xem đầy đủ F01–F16 trong `MAINTENANCE.md`.
- Chỉ ghi hoàn thành theo bằng chứng: source SHA, Workflow CI, Cloudflare version, smoke, probe đọc app; không có hóa đơn OpenAI thật thì không kết luận đạt 50–150đ/lượt. Không tạo Worker mới, không sửa `main`, không dùng `--temporary`.
**Chốt:** 13/11/2026. **Mục đích:** tiếp tục từ trạng thái thực tế, không dựng lại, không hỏi lại thông tin đã có, không làm hỏng production.



## FINAL 13/11/2026 — Sửa cache BẢO TRÌ sau release Presence
- Phát hiện: GitHub có bàn giao mới nhưng Worker GET /api/docs/handover tạm trả bản cũ do cache của raw.githubusercontent.com.
- Fix: thêm tham số chống cache `?v=Date.now()` khi Worker fetch GitHub raw; **không thay API Voice, model, giọng hoặc giao diện**.
- Release cuối: `121629381f7fb298f57c70c36ab51f28c8c2f52a` · Actions https://github.com/hvnm1206/TikTak-Service/actions/runs/43436827356 **SUCCESS**, 22/22 PASS, HEALTH/UI/DOCS/SECURITY smoke PASS.
- Cloudflare Worker current version `7ea82e92-5933-4421-be9d-39c5ca00351e`, rollback baseline predeploy `926e2435-0d19-4383-8b45-631f1107a032` (HEALTH_VERIFIED).
- Kiểm tra independent NMH Guarded Operator: GET /health HTTP 200 `uiVersion=presence-canvas-v1`; GET / HTTP 200 đầy đủ Canvas/Nhật ký/AudioAnalyser; GET /api/docs/handover HTTP 200 **đã thấy thông tin release 43435921467 mới**.
- Chưa có bằng chứng thao tác trực tiếp trên iPhone sau release; CI/HTTP không thay thế kiểm thử micro/giọng và cảm nhận người dùng trên thiết bị.

## CẬP NHẬT GIAO DIỆN NMH PRESENCE — RELEASE 13/11/2026
- **Live production:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — `GET /health` HTTP 200 trả `version=v2-tts-audioctx`, `uiVersion=presence-canvas-v1`.
- **Release:** https://github.com/hvnm1206/TikTak-Service/actions/runs/43435921467 — SUCCESS; source commit `ccfc91ef0d759849aeabe1e6c504fc0114ab9356`, Cloudflare version `926e2435-0d19-4383-8b45-631f1107a032`.
- **Backup/rollback baseline:** `004087d6-f0ea-4084-bd9b-3b09d5d076e2`, chốt và health-verified trước deploy. Rollback không kích hoạt vì smoke PASS; đường rollback sẵn trong workflow nhưng chưa diễn tập với bản UI này.
- **Verify:** 22/22 automated tests PASS (mock API); smoke production HEALTH/UI PRESENCE/DOCS/SECURITY PASS; probe read-only NMH Guarded Operator cho /health, /, /api/docs/handover HTTP 200, đủ marker Canvas, audio analyser, Nhật ký, Phụ đề, 3 phong cách, nút Marin.
- UI từ module `voice-deploy/presence-ui.js`: khuôn mặt Canvas 2D, biểu cảm theo trạng thái/phong cách, con ngươi nhìn theo chạm, nháy mắt, miệng theo **audio thật** qua Web Audio AnalyserNode. Không mở thêm API hoặc mic thứ hai.
- Hội thoại chữ được chuyển vào **NHẬT KÝ** mặc định đóng; PHỤ ĐỀ mặc định tắt có thể bật. Các nút NÓI, KẾT THÚC, NGẮT AI, TIẾP TỤC, SETUP, BẢO TRÌ và sổ ước phí còn nguyên.
- Bàn giao đầy đủ: [UI_PRESENCE_RELEASE_2026-11-13.md](UI_PRESENCE_RELEASE_2026-11-13.md).
- **Giới hạn xác minh:** chưa có kiểm thử thao tác/chất lượng trực quan trên Safari iPhone thực cho bản UI mới; chưa đo end-to-end qua micro + OpenAI + Marin trên bản này. Chưa coi toàn bộ trải nghiệm là nghiệm thu bởi người dùng; F01–F16 vẫn theo bảng remediation trước đó.

## 1. Trạng thái hiện tại
- **App đang hoạt động:** https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare account **Magical Budget**, Account ID `769c2ab4af5ad50700039d473a72d48e`; Worker **`nmh-voice-gpt-test`**.
- URL `/health` đã được kiểm tra HTTP 200, trả `version=v2-tts-audioctx`, `agent=gpt-6-luna`, `voice=browser-stt+marin-tts`.
- **Release mới nhất đã kiểm chứng:** GitHub Actions run **43431996366** SUCCESS, CI **20/20 PASS** (OpenAI mock), smoke HEALTH/UI/DOCS/SECURITY PASS; source commit `a9c4a569499d47481bc7e1b7387d434735dec315`, Cloudflare version `004087d6-f0ea-4084-bd9b-3b09d5d076e2`. TTS AudioContext trước đó: run `43427854906`.
- Người dùng đã nghe giọng mới trên iPhone và nhận xét **“nghe cũng được”**. Không được lặp lại tuyên bố “chưa ai nghe thực tế”; cũng **không** suy diễn rằng đã nghiệm thu mọi luồng hoặc giống chính xác giọng Ngáo.
- Giọng cũ Safari fallback được bỏ khỏi source V2.1; âm thanh Marin có nút **SETUP → THỬ GIỌNG AI MARIN**, lỗi TTS được báo cụ thể.

## 2. GitHub nguồn sự thật
- Repository: https://github.com/hvnm1206/TikTak-Service
- **Chỉ sửa branch `nmh-voice-gpt-v1`, KHÔNG sửa main.**
- `voice-deploy/worker.js`: Cloudflare Worker + embedded Safari UI, nhận dạng giọng Safari, AudioContext, /api/chat, /api/tts, /api/test, /health, /api/docs.
- `voice-deploy/agent-v2.js`: OpenAI Responses API `gpt-6-luna`, 3 phong cách, auto function calling; 4 tool: time, weather (Open-Meteo), Wikipedia, Google News RSS.
- `voice-deploy/wrangler.jsonc`: cấu hình Worker name và entrypoint.
- `.github/workflows/nmh-voice-preview.yml`: Node test on push, release gated by commit message `release(voice): V2 approved...` hoặc workflow_dispatch, Cloudflare token qua GitHub Secret `NMH_CF_API_TOKEN`, rollback on smoke failure.
- `voice-deploy/worker-v2.test.mjs`, `agent-v2.test.mjs`: tests có upstream mocks.
- `HANDOVER.md`, `MAINTENANCE.md`: lịch sử bàn giao/bảo trì, có cả trạng thái cũ. **Tài liệu này là điểm hiện trạng ưu tiên khi mâu thuẫn với các đoạn cũ.**

## 3. Kết quả audit vừa hoàn thành
**BẮT BUỘC ĐỌC** `voice-deploy/AUDIT_COST_2026-11-13.md` trước khi sửa. Audit có 16 findings (F01–F16), chi phí theo kịch bản, phương án và giới hạn bằng chứng.
- Rủi ro cấp bách: tuyến `gpt-4o-mini-tts` cần kiểm tra lifecycle/deprecation trước khi tiếp tục phát triển dài hạn, chọn phương án thay thế không làm mất chất giọng đang dùng.
- **Đã có** sổ chi phí ước tính theo ngày/tháng ngay trên iPhone: usage GPT Standard short/cached, số lượt TTS và giây audio giải mã. **Chưa có** Usage/Costs hóa đơn, token TTS thực, hard budget caps hoặc backend telemetry; con số hiển thị KHÔNG PHẢI chi tiêu thực.
- Công cụ tìm kiếm giới hạn ở Open-Meteo, Wikipedia, Google News RSS: không được nói là đã tra cứu toàn Internet.
- CI không thử nghiệm OpenAI thật; chưa đo latency, độ chính xác hay hóa đơn thật.
- Cloudflare observability đang tắt, không có storage hội thoại hay telemetry đủ để truy nguyên lỗi.
- **F11 đã xử lý và deploy:** workflow lấy active Cloudflare version động, kiểm tra 100% traffic và app identity, chốt rollback version trước khi deploy. Đợt release vừa qua đã xác minh baseline `aa8866ec-09e4-4ee7-8234-6e62682cca15`; version mới `004087d6-f0ea-4084-bd9b-3b09d5d076e2`. Kết quả rollback thực tế của đợt mới chưa được kích hoạt vì smoke PASS; phải kiểm tra lại trước mỗi release.
- Đọc giá nguồn chính thức tại thời điểm quyết định; chi phí trong audit là **phép tính giả định**, không phải phí đã được trừ.

## 4. Chi phí từ audit (CHỈ THAM KHẢO)
Theo giả định 1 USD ≈ 25.675 VND, giá GPT/TTS trong report và chi phí âm thanh theo thời gian tạo:
- Trả lời ~8 giây: Nghiêm túc **~55đ/lượt**, Đanh đá/Chém gió **~78đ/lượt**.
- ~15 giây: **~103đ** / **~147đ/lượt**.
- ~30 giây: **~206đ** / **~293đ/lượt**.
- 100 lượt/ngày trong 30 ngày ở kịch bản ~15 giây: **~310.000đ** / **~441.000đ/tháng**.
- TTS là hạng mục chính; nếu dùng giọng trẻ, playbackRate/speed làm tỷ lệ giá khác, **phải đo audio usage thực**.
- Mục tiêu khoảng **50–150đ/lượt**, không tính giả định là đã đạt.
- **Không sử dụng bảng này để lập báo giá thương mại trước khi đối chiếu giá OpenAI và token hóa đơn.**

## 5. Thứ tự việc tiếp theo
1. **F01 P0:** Chuyển `gpt-4o-mini-tts` (ngừng 06/01/2027) sang Realtime API với `gpt-realtime-2.1-mini`, phải thử đúng giọng/tốc độ/chi phí. `gpt-realtime-2.1-mini` KHÔNG dùng trực tiếp ở `/v1/audio/speech`. Giữ tuyến cũ cho đến khi có đường thay thế nghiệm thu.
2. **F02/F03:** Đối chiếu OpenAI Organization Usage/Costs thực với sổ **ước tính cục bộ**; xây dựng metadata request ID không chứa key/nội dung, số lượt audio, ngưỡng cảnh báo/hard cap ở nơi phù hợp. Không coi ước tính TTS 0,015 USD/phút là billing.
3. Thiết lập cap, thông báo chi phí và công cụ chẩn đoán; xác minh iPhone và API thật; kiểm tra chất giọng không suy giảm.
4. Sửa các findings còn lại từ F01–F16 theo ưu tiên, chạy CI và smoke; kiểm tra rollback thực tế trước deploy tiếp.
5. Cập nhật lại file này, MAINTENANCE.md và báo cáo audit sau mỗi đợt triển khai.

## 6. Quy tắc bàn giao / quyền thao tác
- Mục tiêu là app chạy thật, không phải chỉ viết prompt/báo cáo. Tuân theo Guard và dùng đúng Operator/GitHub/Cloudflare tools khi có.
- Không hard-code câu hỏi, không tự tạo Worker/URL mới, không dùng `wrangler deploy --temporary`, không làm mất chức năng đang chạy.
- Chỉ kết luận PASS khi có nguồn, log CI, mã phiên bản và kiểm chứng production; tách nguồn/CI mock và kiểm thử thiết bị thật.
- Không yêu cầu người dùng dán token API/Cloudflare vào chat. GitHub Actions secret đã được cấp; các quyền công cụ cần được kiểm tra ngay trong phiên mới.
- **Không coi gói source Ngáo là repository NMH Voice; Ngáo chỉ là chuẩn tham khảo về giọng và điều phối AI.**

## 7. Link kiểm chứng chính
- Production: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Live health: https://nmh-voice-gpt-test.magical-budget.workers.dev/health
- Release mới nhất SUCCESS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43431996366
- Release TTS AudioContext trước đó: https://github.com/hvnm1206/TikTak-Service/actions/runs/43427854906
- Sửa chữa và thứ tự F01–F16: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/VOICE_V21_REMEDIATION_2026-11-13.md
- Audit: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/AUDIT_COST_2026-11-13.md
- Implementation history: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/V2_IMPLEMENTATION.md

**Giới hạn nghiệm thu:** HTML/health/docs/security đã PASS production; chưa chạy API GPT/TTS thật và chưa đo hóa đơn hoặc nghe bản release này trên iPhone. Người dùng đã nghe bản Marin trước đó; không tự phủ nhận bằng chứng ấy.

**Nghiệm thu bàn giao này:** cửa mới đọc tài liệu này và audit, kiểm tra HEAD commit, health, Actions và quyền tool; sau đó làm các bước kỹ thuật cần thiết theo findings. Không hỏi lại địa chỉ repo, Worker, account, nhánh, model, giọng hoặc nội dung audit đã ghi.
