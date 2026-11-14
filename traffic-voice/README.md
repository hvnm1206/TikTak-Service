# NMH Traffic Voice AI V1 — bản thử độc lập

**Trạng thái 14/11/2026: mã nguồn và 16 kiểm thử mô phỏng đạt. CHƯA triển khai production, CHƯA xác nhận khóa Google/OpenAI, CHƯA có bằng chứng iPhone.**

Đây là ứng dụng **riêng**. Không import source, không đổi Worker, route, database, secrets, workflow hoặc deployment của Ngố/Ngáo/Mendo.

## 1. Kiến trúc

```
iPhone Safari (nút micro)
  → SpeechRecognition trên trình duyệt (vi-VN)
  → Worker /api/ask (Bearer-equivalent x-traffic-access)
  → OpenAI Chat Completions / gpt-4o-mini, cưỡng bức `traffic_action`
  → Google Places API (New) để xác thực địa danh
  → Google Routes Compute Routes (`TRAFFIC_AWARE`, `TRAFFIC_ON_POLYLINE`)
  → Worker so sánh thời gian/tuyến, tạo câu trả lời ngắn có số liệu
  → Safari speechSynthesis `vi-VN` hoặc OpenAI `gpt-4o-mini-tts` Marin
  → loa iPhone
```

Bộ nhớ hành trình tồn tại trong tab trình duyệt: điểm đến, điểm đi đã phân giải, GPS mới, tuyến, vài lượt hỏi. Chỉ gọi Maps theo câu hỏi, không polling tự động. GPS lấy mới mỗi lần hỏi, từ chối tọa độ cũ hơn 120 giây hoặc độ chính xác >= 500 m. Câu hỏi "kiểm tra lại" luôn gọi Routes mới. Nếu GPS không có, có ô khai báo điểm đi. Không thể xác minh tai nạn, công trường, cấm đường nếu API không cung cấp.

**Cần kiểm chứng trên iPhone:** `webkitSpeechRecognition` có thể bị hạn chế theo phiên bản Safari/quyền mic; thiết bị có thể thiếu giọng TTS tiếng Việt. V1 không nghe khi khóa màn hình, không bảo đảm chạy nền, không tự nhận biết tình huống khẩn cấp. Nút bấm để nói có thể hoạt động khi xe đỗ; tuyệt đối không chạm màn hình khi đang lái.

## 2. Mã nguồn

- `worker-core.mjs`: kết nối AI/Routes/Places, hành trình, quyền truy cập, giới hạn tốc độ, câu nói.
- `worker.mjs`: Worker entrypoint, trả trang và script.
- `index.html`, `client-source.txt`: UI PWA-ready theo hướng mobile-first, GPS, micro, TTS và bản đồ.
- `wrangler.jsonc`: Worker mới `nmh-traffic-voice-v1` cùng rate-limit namespace riêng.
- `tests/worker.test.mjs`: dữ liệu API mô phỏng kiểm thử từng luồng.
- `.github/workflows/traffic-voice-verify.yml`: kiểm thử CI độc lập, không deploy.

## 3. Chạy kiểm thử không tốn phí API

```bash
cd traffic-voice
npm test
npm run check
```

Bài test sử dụng mock Google/OpenAI. **PASS mock ≠ PASS dữ liệu thực/iPhone.**

## 4. Cấp quyền và triển khai thử khi đã sẵn sàng

Điều kiện tối thiểu:

1. Google Cloud project đã bật **Places API (New)** và **Routes API**, đồng ý chính sách và billing; hạn mức được chủ sở hữu phê duyệt và thiết lập quota phù hợp.
2. Google Maps **server key**, giới hạn API tới Routes/Places và hạn chế việc dùng trái phép. Secrets của backend không được đưa vào code hoặc GitHub public.
3. OpenAI API key riêng, giới hạn ngân sách nếu hạ tầng OpenAI hỗ trợ.
4. Mã truy cập cá nhân mạnh, không tái sử dụng từ Ngố.
5. Cloudflare Workers có quyền tạo Worker **mới**, không nâng cấp hoặc trỏ vào `nmh-voice-gpt-test`.

Ở thư mục `traffic-voice/` trên máy có Wrangler và đăng nhập đúng Cloudflare account:

```bash
npx wrangler@4.102.0 deploy --dry-run --config wrangler.jsonc
npx wrangler@4.102.0 secret put GOOGLE_MAPS_API_KEY --config wrangler.jsonc
npx wrangler@4.102.0 secret put OPENAI_API_KEY --config wrangler.jsonc
npx wrangler@4.102.0 secret put TRAFFIC_ACCESS_TOKEN --config wrangler.jsonc
# Tùy chọn, nếu cần bản đồ nhúng (không cần cho nút mở Google Maps):
npx wrangler@4.102.0 secret put MAPS_BROWSER_KEY --config wrangler.jsonc
# Chỉ triển khai sau khi đã kiểm tra đúng tên Worker MỚI và quota/billing được chấp nhận:
npx wrangler@4.102.0 deploy --config wrangler.jsonc
```

*Đây là lệnh hướng dẫn, **chưa được thực thi trong môi trường Cloudflare của chủ sở hữu**.*

Key browser chỉ được hạn chế bằng HTTP referrer đúng domain Worker và **Maps JavaScript API**; không dùng key server ở frontend. Mã truy cập cá nhân nhập trong phần Cài đặt, giữ bằng `sessionStorage` của tab hiện tại. Không gửi mã vào đoạn chat công khai. `MAPS_BROWSER_KEY` công khai theo nguyên tắc sử dụng key trình duyệt, không được có quyền gọi Routes/Places server.

`TRAFFIC_LIMITER` là bộ hạn chế tốc độ gần đúng 30 đơn vị/phút, một lời hỏi tính 3 đơn vị. **Đây không phải bộ khóa ngân sách cứng**; phải giới hạn quota Google APIs, Worker và chi phí OpenAI ở dashboard dịch vụ trước khi thử thật.

## 5. Tiêu chí và bằng chứng cần cho nghiệm thu

Một lượt thoại phải có dấu thời gian riêng: nhận giọng kết thúc → STT hoàn tất; AI tool selection; Places; Routes; thời gian Worker; TTS được tạo; thời điểm loa bắt đầu (khi browser có event). Dữ liệu trong `Chẩn đoán độ trễ` là thời gian đo theo mỗi lượt, không phải trung bình và không phải SLA. Trên iPhone phải ghi thiết bị, phiên bản iOS, Safari, thời điểm, nội dung yêu cầu, action, mã trả API, âm thanh nghe được và số lượt sử dụng/billing.

Kiểm tra tối thiểu:

- 10 lượt hỏi liên tiếp, không kẹt mic hay TTS;
- 3 lượt hỏi tiếp cùng hành trình, giữ đích và GPS mới;
- 2 lượt đổi điểm đến;
- 2 lượt yêu cầu kiểm tra lại, chứng minh request Google Routes mới;
- 1 lượt ngắt phát tiếng đang nói;
- 1 lượt có tiếng ồn xe trong điều kiện an toàn, xe đỗ/người ngồi ghế phụ;
- mất GPS, thiếu mạng, địa danh mơ hồ và nội dung API không cung cấp;
- kiểm tra chi phí Google Maps/OpenAI và trạng thái rate limit.

**Không coi HTTP 200, compile, mock test hoặc nhìn thấy UI là chứng cứ iPhone end-to-end.**

## 6. Giới hạn quan trọng

- AI chỉ dùng lời nói để chọn hành động; backend quyết định truy vấn và tính toán. Không có dữ liệu API thì không nói số liệu.
- Routes cho ETA và phân đoạn `NORMAL`/`SLOW`/`TRAFFIC_JAM` trên tuyến, không cung cấp danh sách tai nạn, công trường hay lệnh cấm đường toàn diện.
- So sánh "đi đường X" hiện chọn một điểm đại diện trên đường X làm waypoint. Không thể khẳng định đi **suốt đường X**; phải thông báo giới hạn.
- `TRAFFIC_ON_POLYLINE` có thể phát sinh phí Routes Pro. Places API Text Search cũng phát sinh yêu cầu riêng. Không tự tuyên bố hoàn toàn miễn phí.
- Google trả tuyến thay thế chỉ khi API cung cấp và không có waypoint trung gian. Giọng thiết bị không ổn định trên các bản iOS khác nhau; Marin có thêm phí.
- Độ trễ thực tế chưa đo trên iPhone. Người dùng không được thao tác điện thoại khi đang điều khiển xe.

## 7. Dự toán **giả định** Google Maps Routes Pro, chưa phải chi phí phát sinh

Tính cho tháng 30 ngày, giả định mỗi lượt hỏi **1 lần Compute Routes Pro**, không đổi đích, không kiểm tra đường thay thế, và không gọi Places, Dynamic Maps, AI, TTS.

| Kịch bản | Routes/tháng | Phí Routes Pro ước tính |
|---|---:|---:|
| 1 tài xế x 10 lượt/ngày | 300 | $0 nếu nằm trong quota miễn phí 5.000/tháng |
| 1 tài xế x 30 lượt/ngày | 900 | $0 nếu nằm trong quota miễn phí 5.000/tháng |
| 10 tài xế x 30 lượt/ngày | 9.000 | khoảng $40 cho 4.000 lượt vượt cap, giá $10/1.000 |

Nhiều lượt thử đi qua đường cụ thể dùng **2 calls Routes**, mỗi thay đổi điểm đến thường dùng Places; giá thực tế có thể cao hơn nhiều. Miễn phí phụ thuộc tài khoản, billing country, loại SKU và số lượt của **toàn bộ project**, không chỉ ứng dụng này. Nguồn đối chiếu 14/11/2026: https://developers.google.com/maps/billing-and-pricing/pricing ; https://developers.google.com/maps/documentation/routes/traffic_on_polylines .

Công thức tổng: **Maps Routes + Places + Dynamic Maps (nếu nhúng) + OpenAI input/output tokens + STT (nếu cần API) + TTS (nếu chọn Marin) + Cloudflare**. STT qua trình duyệt không tính phí STT của ứng dụng nhưng không bảo đảm miễn phí/khả dụng từ nhà cung cấp trình duyệt. Chưa có log billing nên **chưa báo phí thực tế**.

## 8. Khôi phục và cô lập

- Không dùng deployment chung với Ngố; rollback bằng Git commit của `traffic-voice/` và Cloudflare Worker riêng.
- Không liên kết bảng dữ liệu, D1 hoặc secret của Ngố. Khóa mới, quota riêng nếu có thể.
- Nếu Worker thử nghiệm gây lỗi: đưa Worker `nmh-traffic-voice-v1` về bản trước, hoặc tắt Worker mới; Ngố không bị ảnh hưởng.
- Sau khi triển khai phải lưu Git commit SHA, Worker version và kết quả thử thật; hiện **chưa có các định danh triển khai V1**.
