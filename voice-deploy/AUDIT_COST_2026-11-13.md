# NMH VOICE GPT — AUDIT V2.1 VÀ CHI PHÍ VẬN HÀNH
**Ngày:** 13/11/2026. **Phạm vi:** GitHub `hvnm1206/TikTak-Service`, branch `nmh-voice-gpt-v1`, files `worker.js`, `agent-v2.js`, `wrangler.jsonc`, Actions workflow, tests, implementation notes; production Cloudflare Magical Budget.

## CẬP NHẬT SAU RELEASE 13/11/2026
- Đây là **bản audit gốc**, giữ nguyên kết quả và các kịch bản tại thời điểm audit, không ghi đè bằng chứng lịch sử.
- Khắc phục đã deploy: F11 (rollback snapshot active), F07 (đơn giá GPT Standard short/cached), F13 (link bàn giao), F15 (timeout OpenAI một phần), F02 (thống kê **ước phí** local một phần).
- Release run **43431996366** SUCCESS, verify **20/20 PASS**, Cloudflare version **004087d6-f0ea-4084-bd9b-3b09d5d076e2**; smoke HEALTH/UI/DOCS/SECURITY và Guarded Operator live GET PASS.
- F01, F03, F06 và phí hóa đơn F02 **chưa đạt**. Số liệu mới trên thiết bị chỉ là ước tính, không phải token TTS OpenAI hay Usage/Costs thực.
- Thứ tự ưu tiên, tiêu chí nghiệm thu và bằng chứng theo file [VOICE_V21_REMEDIATION_2026-11-13.md](VOICE_V21_REMEDIATION_2026-11-13.md).

## Tình trạng thực tế
- Runtime chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev
- GET `/health` HTTP 200: `v2-tts-audioctx`, `gpt-6-luna`; GET `/` HTTP 200, ba phong cách và `THỬ GIỌNG AI MARIN` hiển thị. Kiểm chứng read-only NMH Guarded Operator.
- Release https://github.com/hvnm1206/TikTak-Service/actions/runs/43427854906 SUCCESS. Verify 18/18 pass (run 43427730110), release smoke PASS. Đã có bằng chứng rollback Cloudflare V3 trong hai lần kiểm tra smoke gặp lỗi trước đó.
- Người dùng đã nghe giọng thử và nhận xét “nghe cũng được”. Chưa có số liệu đo chất lượng STT, độ trễ đầu-cuối, độ chính xác câu trả lời, logs thực tế hoặc chi phí hóa đơn.

## Findings — ưu tiên và tác động
| ID | Mức | Phát hiện xác minh | Tác động / xử lý |
|---|---|---|---|
| F01 | CRITICAL | `gpt-4o-mini-tts` đang dùng `/v1/audio/speech` bị ngừng 06/01/2027 theo tài liệu chính thức | Phải chuyển TTS sang tuyến còn được hỗ trợ, kiểm thử giọng và tổng chi phí trước ngày ngừng |
| F02 | HIGH | TTS không ghi `usage`, số token âm thanh, độ dài audio tạo, chi phí/lượt; `estimatedModelUsd` chỉ tính GPT | Không thể kiểm chứng mục tiêu 50–150đ/lượt hay phát hiện chi phí tăng |
| F03 | HIGH | Không có hạn mức mỗi ngày / mỗi phiên / mỗi tài khoản OpenAI; người dùng tự lưu key trên iPhone | Chi phí có thể vượt mong muốn; cần spend limit và thống kê |
| F04 | HIGH | TTS serial, gửi từng câu/chunk; không có stream overlap/buffer sẵn | Độ trễ phát và khoảng ngắt tăng ở câu dài |
| F05 | HIGH | Tra cứu chỉ Open-Meteo, Wikipedia, Google News RSS; không phải Internet rộng | Câu hỏi thị trường, giá, văn bản mới, website cụ thể không có nguồn phù hợp |
| F06 | HIGH | Không có live end-to-end tests: API OpenAI thật, TTS thật, Safari microphone→AI→audio→tự nghe; 18 tests sử dụng upstream mocks | CI PASS không chứng minh chất lượng thực tế |
| F07 | MEDIUM | `estimatedModelUsd` tính bằng $0.10 input / $0.50 output / 1M, gấp 2 bảng giá Standard short context hiện thời ($0.05/$0.25) | Số báo phí GPT bị cao; cần đối chiếu service tier / context dài |
| F08 | MEDIUM | TTS giọng trẻ: `speed=0.756` tạo âm thanh rồi `playbackRate=1.455` làm nhanh lại | Số audio tokens tính phí có thể cao hơn so với giây nghe; cần đo qua usage thực |
| F09 | MEDIUM | API key giữ dạng plaintext trong `localStorage` người dùng, không có kho bí mật, không mã hóa ứng dụng | Rủi ro nếu thiết bị bị truy cập / script cùng origin bị lộ; cần giải thích và kiểm soát |
| F10 | MEDIUM | Cloudflare `observability.enabled=false`; không có backend lưu trạng thái hội thoại hoặc telemetry chi phí | Không có nhật ký truy gốc lỗi, sản phẩm chưa đáp ứng đầy đủ yêu cầu backend lưu trữ |
| F11 | MEDIUM | Workflow rollback được chốt cứng ở version `9f10411e...`, sau release V2.1 đang chạy sẽ không qua gate cho lần phát hành kế tiếp nếu không cập nhật | Dễ gây block deploy sau; cần lấy active version và snapshot bảo đảm rollback |
| F12 | MEDIUM | Open-Meteo Free non-commercial only; Wikipedia/Google RSS phụ thuộc nguồn công khai không SLA | Nếu thương mại hóa phải kiểm tra quyền sử dụng/chi phí |
| F13 | LOW | Tài liệu `V2_IMPLEMENTATION.md` phần đầu vẫn ghi NOT DEPLOYED và thiếu token dù cuối tài liệu cập nhật | Dễ bàn giao sai; cần bản trạng thái duy nhất |
| F14 | MEDIUM | Giọng STT là Safari SpeechRecognition trên iPhone; web không bảo đảm nghe liên tục khi ứng dụng nền hoặc khóa máy | Không đạt use case thoại rảnh tay 24/7 nếu mở rộng yêu cầu |
| F15 | MEDIUM | Các lần gọi công cụ tối đa 3 vòng, tối đa 3 calls mỗi vòng; tool timeout 22 giây bị bỏ qua khi dùng abort signal từ outer request | Có thể chậm 55 giây, không có phân bổ thời gian tối ưu |
| F16 | LOW | Weather geocoding lấy kết quả thứ nhất khi tên địa điểm trùng; RSS parsing bằng regex | Dữ liệu có thể nhầm địa điểm hoặc trống khi schema thay đổi |

## Chi phí niêm yết kiểm chứng 13/11/2026
- GPT-6 Luna API Standard short context: **$0.05/1M input tokens, $0.25/1M output tokens**. Model trong code là `gpt-6-luna`; service tier không quy định rõ nhưng giả định Standard và short context. Ngưỡng long context sẽ khác.
- GPT-4o-mini-TTS: **$0.60/1M input text tokens, $12/1M output audio tokens**, OpenAI ước lượng **$0.015/phút audio sinh**. Số audio tokens và phí thực tế chưa thể đọc từ backend đang chạy.
- Browser SpeechRecognition trên thiết bị: không có hóa đơn OpenAI STT cho tuyến hiện tại; không đồng nghĩa Apple/Safari bảo đảm SLA.
- Cloudflare Workers Free: 100.000 requests/ngày, 10ms CPU/request; hiện không có bằng chứng phải trả phí Cloudflare. Mỗi câu thường ~2 Worker POST + các lần tải trang / test.
- Công cụ Open-Meteo/Wikipedia/Google News RSS không đăng ký API trả phí trong source; Open-Meteo giới hạn Free phi thương mại.
- Quy đổi mô hình: **1 USD = 25.675 VND** (tỷ giá tham chiếu thị trường ngày 13/11/2026; không phải tỷ giá thanh toán thực tế).

## Công thức có thể kiểm tra
```
GPT = ((input_tokens*0.05)+(output_tokens*0.25))/1_000_000 * 25_675
TTS_text = text_input_tokens*0.60/1_000_000 * 25_675
TTS_audio_approx = generated_audio_minutes * 0.015 * 25_675
Tổng = GPT + TTS_text + TTS_audio_approx + phần phát sinh
```
Chú ý: thời lượng phát trên iPhone có thể khác thời lượng audio **được tạo và tính phí**, nhất là với `speed=0.756` + `playbackRate=1.455`.

## Kịch bản chi phí (GIẢ ĐỊNH, không phải thực chi)
Giọng Nghiêm túc là audio phát bình thường; hai giọng trẻ dùng hệ số quy đổi chi phí âm thanh x1,455 **chỉ để lập ngân sách** — chưa xác minh đúng với billing OpenAI.

| Mức | GPT input/output | Âm thanh phát nghe | Nghiêm túc VND/lượt | Đanh đá/Chém gió VND/lượt |
|---|---:|---:|---:|---:|
| Ngắn | 1.000/100 token | 8 giây | 55 | 78 |
| Thường | 2.500/170 token | 15 giây | 103 | 147 |
| Dài | 5.000/300 token | 30 giây | 206 | 293 |

100 lượt/ngày, 30 ngày, thời lượng phát 15 giây/lượt: **~310.000đ/tháng Nghiêm túc** hoặc **~441.000đ/tháng giọng trẻ**, nếu kịch bản khớp giả định.
60 phút hội thoại/ngày, nếu AI chỉ nói 20 phút/ngày: riêng TTS **~7.703đ/ngày (Nghiêm túc)** hoặc **~11.207đ/ngày (giọng trẻ)**, tương ứng **231.075đ–336.214đ/tháng**, chưa gồm GPT, chưa tính phí ngoài dự kiến. Nếu AI nói 30 phút/ngày: TTS khoảng 346.613đ–504.321đ/tháng.
Chi phí thực có thể cao hơn do thử giọng, sinh lại câu, lặp request, giọng tốc độ khác, giá/số token khác.

## Ưu tiên hành động
1. Trước tiên thay TTS bị ngừng 06/01/2027 bằng phương án duy trì chất giọng và chi phí, không phá pipeline đang hoạt động.
2. Ghi đo thực tế từng lượt: tokens GPT, số câu TTS, thời lượng audio sinh/phát, lỗi, ước tính chi phí và tổng tháng; không log API key, không ghi toàn bộ hội thoại nếu không cần.
3. Thêm cap chi phí và theo dõi vượt ngưỡng; có kiểm thử API thực và iPhone. Sau đó quyết định có đủ 50–150đ/lượt hay không.
4. Cải thiện khả năng truy vấn thông tin và dữ liệu trực tiếp trên nền kiến trúc gọi công cụ, với quyền nguồn rõ ràng.
5. Rà soát Cloudflare monitoring, geocoding/parse RSS, workflow chốt baseline và cập nhật tài liệu trạng thái.

## Nguồn giá chính thức
https://developers.openai.com/api/docs/pricing
https://developers.openai.com/api/docs/models/gpt-4o-mini-tts
https://developers.openai.com/api/docs/deprecations
https://developers.cloudflare.com/workers/platform/pricing/
https://open-meteo.com/en/pricing

## Giới hạn kiểm chứng
Đã đọc GitHub source/workflow/tests và dùng Operator GET production; chưa truy cập hóa đơn OpenAI, Usage API của user's key, dashboard quota Cloudflare, hay hệ thống phát giọng trên iPhone từ xa. Do đó bảng VND là dự báo theo kịch bản, không phải số chi tiêu đã xác nhận.
