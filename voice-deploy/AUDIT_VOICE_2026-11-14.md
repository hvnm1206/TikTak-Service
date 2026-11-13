# NMH VOICE GPT — AUDIT HẬU SỰ CỐ MIC / TRA WEB
**Ngày kiểm tra:** 14/11/2026 (giờ Việt Nam)  
**Phạm vi:** Cloudflare Worker production, browser iPhone Voice lifecycle, GPT/Tools, Marin TTS, Google Auth, D1, Setup, bảo trì, CI và release.  
**Nguyên tắc:** phân biệt mã nguồn, mô phỏng tự động, HTTP runtime và kiểm tra thiết bị thật.

## 1. KẾT QUẢ ỨNG CỨU ĐÃ XÁC MINH

- Người dùng báo sau khi nâng cấp tìm web, iPhone NÓI/hỏi không phản ứng. **Không có log STT/tin nhắn từ chính lần bị lỗi**, nên không thể khẳng định rằng search patch trực tiếp làm hỏng micro. Nguồn code search sửa phần payload gửi GPT và SETUP, không đổi API SpeechRecognition.
- **Đã khôi phục ngay Worker production** bằng `wrangler rollback` từ version search `6fde090a-6b0e-46e5-b922-4e20f2c8b2f6` về **`8cc6032c-0035-414c-8217-7ea5e91825e5`**, bản trước đợt tìm kiếm đã được người dùng xác nhận sử dụng được. [Actions rollback 43483716480](https://github.com/hvnm1206/TikTak-Service/actions/runs/43483716480): `NMH_ROLLBACK_SMOKE=PASS`, 100% traffic trên Worker cũ.
- Kiểm tra GET độc lập trên URL chính thức: `/health` HTTP 200, `/` HTTP 200 có avatar/NÓI/TIẾP TỤC và **không có** checkbox tìm web có phí; `/api/v3/config` HTTP 200 với D1 `ready=true`, `/api/v3/me` chưa đăng nhập HTTP 401. Không thay URL, dữ liệu D1 hoặc API key người dùng.
- CI đọc active Worker [run 43485493753](https://github.com/hvnm1206/TikTak-Service/actions/runs/43485493753) trả `ACTIVE_VERSION_ID=8cc6032c-0035-414c-8217-7ea5e91825e5`. Bản sửa nguồn đang ở nhánh GitHub **không phải** bản đang chạy trên iPhone.

## 2. PHÁT HIỆN LỖI VÀ ĐỐI SÁCH

| Mức | Khu vực | Lỗi / bằng chứng | Đã sửa | Trạng thái |
|---|---|---|---|---|
| **P0** | STT Safari | Chỉ gọi GPT khi `recognition.onend`; nếu đã có kết quả `isFinal` nhưng iPhone không phát `onend` thì **không gửi câu hỏi**. Test mô phỏng [43484381951](https://github.com/hvnm1206/TikTak-Service/actions/runs/43484381951) FAIL | `presence-ui.js`: xử lý final ngay một lần, chặn gửi trùng, abort mic cũ; watchdog khi mic treo 18 giây, hiển thị lỗi và nút TIẾP TỤC | **Mã nguồn + simulated test PASS, chưa deploy hotfix** |
| **P0** | Marin AudioContext | `speechWatch` từng được khai báo nhưng không tạo timer. Khi `AudioBufferSource.onended` không tới, audio ngừng mà Voice không quay về nghe. Test [43485026050](https://github.com/hvnm1206/TikTak-Service/actions/runs/43485026050) FAIL | `presence-ui.js`: watchdog thời lượng + 3,5 giây, tối đa 65 giây; hủy timer đúng lúc phát xong | **Mã nguồn + simulated test PASS, chưa deploy hotfix** |
| **P1** | Release/QA | CI trước đó PASS cú pháp/mocks nhưng **không chạy sự kiện người dùng bấm NÓI → STT → GPT → Marin**; CI PASS không đảm bảo iPhone dùng được | Thêm `browser-voice-contract.test.mjs` chạy script giao diện thật trong Node VM, giả lập STT/browser và lỗi. Thêm gate vào CI | **CI PASS** |
| **P1** | Search | Trước upgrade chỉ có giờ/Open-Meteo/Wikipedia/Google News RSS. Thêm OpenAI Web Search có phí, chưa nghiệm thu thật bằng GPT-6 Luna. Việc deploy đồng thời với UI/mic tiềm ẩn nguy cơ regression và chi phí | Rollback production; **tách bản thử sang nhánh `nmh-voice-search-lab`**, đồng thời trả `worker.js`, `agent-v2.js`, `v3-ui.js` trên nhánh chính Voice về cấu hình ổn định không tìm web có phí | **Cách ly** |
| **P1** | User E2E | Không có đo lường Safari iPhone thật xuyên STT → GPT → TTS sau bản rollback | Phải thử thật trên máy người dùng; mô phỏng không thay được quyền mic, nền Safari, route radio/5G | **CHƯA NGHIỆM THU** |
| **P2** | Tài liệu | TXT/Markdown lưu D1 và truy vấn theo từ khóa; PDF/DOCX/OCR chưa trích xuất, không phải full knowledge search | Giữ rõ trong bảo trì; không nhận đạt | **CHƯA ĐẠT** |
| **P2** | Sync/cost | Google Sign-In hai thiết bị và chi phí OpenAI/TTS thực chưa được kiểm tra E2E đầy đủ | Cần test thật có tài khoản, đối chiếu Usage; không dùng CI giả lập thay bằng chứng thật | **CHƯA ĐẠT** |

## 3. KIỂM THỬ HẬU SỰ CỐ

[CI run 43485493753](https://github.com/hvnm1206/TikTak-Service/actions/runs/43485493753) trên commit nguồn **`ed472ca266da29858877da21b97a0712c02b09b4`**:
- Voice V2/GPT/Marin/UI: **26/26 PASS**.
- Browser logic giả lập: **8/8 PASS** (click NÓI, event STT cuối, không có onend, không cho quyền mic, lỗi API, không có audio onended, timeout mic và STOP/cancel, search experimental không lọt vào payload ổn định).
- V3 D1/Google mock: **7/7 PASS**.
- SQLite migration và YAML workflows: **PASS**.
- Deploy CI: **SKIPPED** theo cơ chế an toàn. Không gắn nhãn iPhone E2E PASS.

Các run thất bại [43484381951](https://github.com/hvnm1206/TikTak-Service/actions/runs/43484381951) và [43485026050](https://github.com/hvnm1206/TikTak-Service/actions/runs/43485026050) là **test phát hiện lỗi có chủ đích (red tests)**; chỉ các run sau khi sửa được dùng làm bằng chứng PASS.

## 4. QUY ĐỊNH PHÁT HÀNH BẮT BUỘC

1. Giữ production ở `8cc6032c-0035-414c-8217-7ea5e91825e5` cho đến khi iPhone thực tế xác nhận lại NÓI/GPT/Marin. **Không tự tái deploy bản search vào production.**
2. Bản STT/Audio watchdog hiện nằm trong source nhánh `nmh-voice-gpt-v1`, chưa deploy. Khi release: chụp active Cloudflare version, chạy đủ 41 tests, code smoke, deploy đúng Worker hiện hữu, test iPhone hai lượt gồm nói bình thường và nói xong Safari không báo end, có rollback ngay nếu fail.
3. Nâng cấp tìm web được bảo lưu tại `nmh-voice-search-lab`, không mất mã nguồn; chỉ hợp nhất sau khi có test browser/mic và một lượt GPT Web Search thật, source trích dẫn được, chi phí được chấp thuận.
4. Không suy luận web search gây lỗi nhận dạng chỉ từ tương quan thời gian. **Sự kiện lỗi trên iPhone chưa có client trace**; hai lỗi STT/Audio được phát hiện bằng mô phỏng là lỗi tiềm ẩn trong code, không tự chứng minh chính chúng là nguyên nhân trên iPhone.
5. **Không ghi ĐẠT TOÀN BỘ** cho đến khi iPhone E2E, Google login, đồng bộ hai thiết bị, tài liệu theo định dạng đã chốt và chi phí được kiểm nghiệm.

**Trạng thái:** Production đã rollback và API smoke PASS. Source hotfix + regression CI PASS. iPhone vật lý sau rollback vẫn chưa có kết quả từ người dùng; giữ NO-GO cho lần deploy mới.
