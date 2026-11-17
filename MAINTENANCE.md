# NMH VOICE GPT — BẢO TRÌ HIỆN HÀNH (14/11/2026)

## 17/11/2026 — Giọng Google khi trả lời tra đường + gom nút tra đường
- Ảnh 07:21: câu trả lời đường đi đọc bằng OpenAI Marin (Google lỗi → dự phòng). Chuỗi tên đường dài không dấu chấm. Sửa: '→' thành dấu phẩy; câu >160 ký tự tách ở dấu phẩy (chỉ cho Google); lý do lỗi Google ghi log + header x-nmh-tts-google-error.
- Kiểm chứng production: câu đường đi dài ~300 ký tự → source=google-chirp3-leda, không lỗi.
- Dòng so sánh che header, nút Maps che KẾT THÚC/NGẮT AI → gom vào 1 thanh dưới đáy (chip canh đường, so sánh ngắn — chạm để xem chi tiết, Google Maps). Test 183/183.
- Production e4f9310c-279c-43b3-bdea-74fc6915f0e8; rollback 5197e1e8-b933-4774-93c3-9f746ff4931a.

## 17/11/2026 — Vietmap thành nguồn chính
- 07:03 chủ app thêm VIETMAP_KEY (bản Cloudflare 8e4057ca). 07:14 yêu cầu Ngố đọc theo Vietmap.
- Ngố đọc Vietmap; TomTom thành dòng so sánh (1 lần gọi cùng tọa độ); canh đường dọc đường dùng Vietmap. NGO_ROUTE_PROVIDER=tomtom để quay lại. Test 181/181.
- Production 5197e1e8-b933-4774-93c3-9f746ff4931a; rollback 8e4057ca-6525-481f-999f-ff1512dbed68.

## 17/11/2026 — Vietmap chạy song song TomTom để so sánh
- Chủ app duyệt thử Vietmap (miễn phí 60.000 transactions, 1.500/ngày cho routing). Secret mới: VIETMAP_KEY.
- TomTom vẫn chính; thêm 1 lần gọi Vietmap route v4 cùng tọa độ → dòng xanh 'So sánh' trên màn hình. Vietmap thành nguồn chính khi là khóa duy nhất hoặc NGO_ROUTE_PROVIDER=vietmap; NGO_ROUTE_COMPARE=off tắt so sánh. Test 179/179.
- Production 13c8323d-0f0d-4793-8edb-a057a6951bb8; rollback efea5d4d-4b70-437c-90bc-8a0b07526aad.

## 17/11/2026 — Canh giao thông dọc đường (hướng 2)
- Google Maps dẫn đường/nhắc rẽ; Ngố (đang mở) mỗi 4 phút gọi /api/route-check (1 lần TomTom, không GPT) từ vị trí hiện tại.
- Chỉ nói khi: chậm thêm ≥5 phút (tên đường + giờ đến mới), đóng đường/công trình, đường khác nhanh hơn ≥4 phút (cập nhật nút Google Maps). Im lặng 6 phút giữa 2 lần báo, không lặp.
- Kết thúc: chạm chip xanh, tắt công tắc tra đường, cách đích <400 m, quá 3 giờ. Test 177/177.
- Production efea5d4d-4b70-437c-90bc-8a0b07526aad; rollback 35b2a264-916f-4634-879e-7e22b42c5646.

## 17/11/2026 — Tra đường chạy được; trả lời chi tiết hơn
- 01:07 chủ app thay TOMTOM_KEY đúng (lần trước dán nhầm ID khóa → 401). Bản e9896c86 do Cloudflare tạo.
- 01:10 phản hồi: chạy nhưng quá sơ lược/không chính xác. Thêm path (đường theo thứ tự), arrive_at, cho phép 3–5 câu với câu hỏi đường; nói điểm đến đã hiểu để phát hiện tìm nhầm. Test 174/174.
- Production 35b2a264-916f-4634-879e-7e22b42c5646; rollback e9896c86-bb62-4031-a98e-c3c52e416e4a.

## 17/11/2026 — TomTom từ chối khóa: cắt khoảng trắng + báo chi tiết
- Ảnh màn hình 00:16: TomTom 401/403. Worker trim TOMTOM_KEY (khoảng trắng/xuống dòng/ngoặc); lỗi ghi bước Search/Routing, HTTP và thông điệp TomTom (che khóa). Test 174/174.
- Production 6944be49-4dfc-4831-9892-eed639596f62; rollback 8f03f784-aead-480c-9668-12279f90219f.

## 17/11/2026 — Tra đường: hiện đúng lý do lỗi
- Ngố chỉ nói "công cụ chỉ đường đang lỗi". Thêm result.routeError (che khóa), banner đỏ trên màn hình khi bật tra đường, và yêu cầu model nói đúng lý do. Test 174/174.
- Production 8f03f784-aead-480c-9668-12279f90219f; rollback 92493af4-53bc-477c-b48e-4fa4cfe4cab9.

## 17/11/2026 — Tra đường TomTom: sửa tham số bị từ chối
- Triệu chứng: có vị trí iPhone nhưng Ngố vẫn báo chưa lấy được bản đồ, hỏi điểm xuất phát.
- Nguyên nhân gốc: gửi instructionsType cùng routeRepresentation=none, TomTom không cho phép (tài liệu Guidance instructions) → mọi calculateRoute lỗi.
- Sửa: bỏ routeRepresentation=none + language; lỗi 400 thì thử lại bản tối giản; lỗi trả về che khóa. Test 173/173.
- Production 92493af4-53bc-477c-b48e-4fa4cfe4cab9; rollback 34de5f34-b093-458b-a4af-e74510a12860. Chờ UAT trên iPhone.

## 16/11/2026 (23:55) — NGỐ: TRA ĐƯỜNG CHỜ VỊ TRÍ IPHONE (MỚI NHẤT)

**Lỗi:** hỏi đường đi Hồ Tây, Ngố báo chưa lấy được bản đồ và hỏi điểm xuất phát. **Nguyên nhân:** câu hỏi được gửi với `origin=null` khi `watchPosition` chưa có vị trí (vừa bật công tắc) hoặc Safari bị chặn vị trí. **Sửa:** trước khi gửi câu hỏi (công tắc bật), dùng vị trí < 10 phút, nếu không có thì gọi `getCurrentPosition` một lần và chờ tối đa 6 giây; SETUP hiện trạng thái vị trí, nếu bị chặn thì hướng dẫn mở Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị → Trang web Safari. 172/172 test PASS. [Release 43912198219](https://github.com/hvnm1206/TikTak-Service/actions/runs/43912198219) SUCCESS; version **`34de5f34-b093-458b-a4af-e74510a12860`**, rollback **`745306dc-c8b9-41bf-9671-783ef1833619`**.

---

## 16/11/2026 (23:46) — NGỐ: ĐÃ CÓ TOMTOM_KEY (MỚI NHẤT)

Người dùng tạo key TomTom (MyTomTom, gói Evaluation, chọn Navigation/Places/Traffic) và thêm secret `TOMTOM_KEY` trên dashboard → version mới **`745306dc-c8b9-41bf-9671-783ef1833619`**. [Probe](https://github.com/hvnm1206/TikTak-Service/actions) xác nhận secret `GOOGLE_TTS_KEY`, `TOMTOM_KEY` có mặt, giọng Google vẫn chạy. Đã cập nhật mốc release/verify. **Chưa kiểm chứng được cuộc gọi TomTom thật** (cần một câu hỏi thật từ iPhone với công tắc tra đường bật).

---

## 16/11/2026 (23:15) — NGỐ: TRA ĐƯỜNG CHUYỂN SANG TOMTOM (MỚI NHẤT)

**Lý do:** bật Routes API trên Google Cloud báo "Maps Platform unavailable in this region" — tài khoản thanh toán của người dùng không được dùng Google Maps Platform. Người dùng từ chối phương án chỉ mở Google Maps (không đọc được tình trạng). **Đã làm:** `tomtomRoute` (agent-v2): TomTom Search (countrySet VN, ưu tiên gần điểm xuất phát) + Calculate Route (car, traffic=true, 2 tuyến thay thế, sectionType=traffic, hướng dẫn vi-VN) = 2 lượt/câu, miễn phí 2.500 lượt/ngày, không cần thẻ. Mỗi tuyến: thời gian hiện tại/lúc thoáng, chậm bao nhiêu, đường chính, điểm tắc/công trình/đóng đường kèm tên đường (trễ ≥1 phút). Nút dẫn đường vẫn mở Google Maps theo tọa độ chính xác (link miễn phí). Worker ưu tiên secret `TOMTOM_KEY`; Google chỉ khi có `GOOGLE_MAPS_KEY`. Công tắc SETUP vẫn mặc định TẮT.

**Bằng chứng:** 171/171 test PASS. [Release 43905193145](https://github.com/hvnm1206/TikTak-Service/actions/runs/43905193145) SUCCESS; version **`4113e598-e7ba-4799-85a1-d10ab89e0e60`**, rollback **`6ff63b3d-4a29-4ff9-b993-589e895f512b`**. **Phụ thuộc:** người dùng tạo tài khoản developer.tomtom.com và thêm secret `TOMTOM_KEY` trên Cloudflare (thao tác này tạo version mới → cập nhật mốc trước release kế tiếp). Chưa gọi TomTom thật.

---

## 16/11/2026 (22:50) — NGỐ: TRA ĐƯỜNG & GIAO THÔNG GOOGLE MAPS, BẢN 1 (MỚI NHẤT)

**Yêu cầu (đã duyệt):** biết điểm xuất phát/điểm đến, đưa tuyến, báo tình trạng và gợi ý phương án; phải có nút bật/tắt. Người dùng đi ô tô. **Đã làm:** công cụ `get_driving_route` (agent-v2) gọi Google Routes `computeRoutes` 1 lần/câu: DRIVE, TRAFFIC_AWARE (SKU Pro), tối đa 3 tuyến, thời gian hiện tại vs lúc thoáng, số đoạn chậm/tắc, tuyến chính; điểm đến gửi dạng địa chỉ (không gọi Places). Xuất phát = vị trí iPhone (watchPosition, chỉ khi bật) hoặc nơi người dùng nói. Kết quả có `mapsUrl` → nút "Mở Google Maps dẫn đường" (chỉ nhận link google.com/maps/dir). Công tắc SETUP "Tra đường & giao thông" **mặc định TẮT**: tắt thì không đọc vị trí, không gửi công cụ, không hiện nút. Tắt toàn hệ thống: env `NGO_ROUTES=off`. Khóa: `GOOGLE_MAPS_KEY` hoặc dùng `GOOGLE_TTS_KEY`. **Chưa làm (bản 2):** canh đường định kỳ khi đang lái; không dẫn đường từng ngã rẽ (giao Google Maps). Đường 1 chiều/cấm phụ thuộc dữ liệu Google.

**Bằng chứng:** 170/170 test PASS (+3 test: tắt mặc định không lộ vị trí, 1 lượt gọi đúng tham số, 403 báo chưa bật API, thiếu vị trí thì hỏi). [Release 43899877383](https://github.com/hvnm1206/TikTak-Service/actions/runs/43899877383) SUCCESS; version **`6ff63b3d-4a29-4ff9-b993-589e895f512b`**, rollback **`1fbb518c-566a-4f47-a052-be4c263e63f9`**. **Phụ thuộc người dùng:** bật Routes API trong project Tiktak-sb và thêm Routes API vào API restrictions của key `ngao-tts`. Chưa gọi thử Google Routes thật.

---

## 16/11/2026 (22:05) — NGỐ: KHÔNG ĐỌC KÝ HIỆU MARKDOWN THÀNH "SAO" (MỚI NHẤT)

**Phản hồi:** câu trả lời hay lẫn "sao sao", nhất là sau tra mạng. **Nguyên nhân:** `cleanVoiceAnswer` chỉ bỏ trích dẫn/URL, không bỏ markdown (**đậm**, *nghiêng*, gạch đầu dòng, tiêu đề, bảng) → giọng đọc đọc `*` là "sao". **Sửa:** `cleanVoiceAnswer` bỏ đậm/nghiêng/code/tiêu đề/trích dẫn/gạch đầu dòng/dấu bảng, đọc `số*số` là "nhân", nối các dòng danh sách thành cụm có dấu phẩy; `/api/tts` lọc mọi `* # _ ~ \` |` còn sót trước khi gửi Google/Marin. 167/167 test PASS. [Release 43891894113](https://github.com/hvnm1206/TikTak-Service/actions/runs/43891894113) SUCCESS; version **`1fbb518c-566a-4f47-a052-be4c263e63f9`**, rollback **`4d11d5db-17a1-4fbf-bc4d-91c836f77390`**.

---

## 16/11/2026 (14:10) — NGỐ: SỬA CỤT TỪ CUỐI CÂU (MỚI NHẤT)

**Phản hồi:** câu trả lời hơi cụt ở từ cuối (rõ hơn từ khi dùng Google Leda, giọng kết thúc gọn, không có đuôi im lặng dài như Marin). **Nguyên nhân:** `listen()` chạy ngay khi nguồn âm thanh cuối báo kết thúc; bộ đệm loa iPhone còn ~0,1–0,2 s, mở SpeechRecognition chuyển phiên âm thanh và cắt mất. **Sửa:** `ngoListenAfterPlayback()` (voice-boost) chờ outputLatency + baseLatency + 0,3 s (tối đa 0,7 s), bỏ qua nếu lượt đã đổi; áp dụng cho cả đường MP3 (`speak`) và đường phát luồng; luồng phát thêm 0,25 s im lặng ở cuối. 165/165 test PASS. [Release 43821469091](https://github.com/hvnm1206/TikTak-Service/actions/runs/43821469091) SUCCESS; version **`4d11d5db-17a1-4fbf-bc4d-91c836f77390`**, rollback **`ee4219a1-2675-4bd5-bc41-21d7e4363f41`**. Đã cập nhật mốc release/verify.

---

## 16/11/2026 (12:45) — NGỐ: GIỌNG GOOGLE LEDA ĐÃ CHẠY TRÊN PRODUCTION (MỚI NHẤT)

Người dùng thêm secret `GOOGLE_TTS_KEY` (key `ngao-tts`, Google Cloud project Tiktak-sb, giới hạn Cloud Text-to-Speech API) qua dashboard Cloudflare → Cloudflare tạo version mới **`ee4219a1-2675-4bd5-bc41-21d7e4363f41`** (100%). **Bằng chứng:** [probe chỉ đọc 43812277775](https://github.com/hvnm1206/TikTak-Service/actions/runs/43812277775): danh sách secret = `GOOGLE_TTS_KEY`; `/api/tts` với key OpenAI giả trả 200, `x-nmh-tts-source: google-chirp3-leda`, PCM 92.512 bytes và MP3 8.928 bytes. Đã cập nhật `PROD_EXPECTED_VERSION` (release) và mốc verify sang `ee4219a1`. Workflow probe: `.github/workflows/ngo-google-tts-probe.yml`, chạy khi commit bắt đầu bằng `probe(ngo): google voice`. Lưu ý: sửa biến/secret trên dashboard luôn tạo version mới → phải cập nhật mốc trước lần release kế tiếp.

---

## 16/11/2026 (11:25) — NGỐ: GIỌNG GOOGLE CHIRP3-HD "LEDA" NHƯ NGÁO (MỚI NHẤT)

**Yêu cầu:** người dùng thấy giọng Ngáo hay hơn, yêu cầu đổi; học tính năng của Ngáo (không lấy luật giao thông). **Đã làm:** `/api/tts` gọi Google TTS `vi-VN-Chirp3-HD-Leda` khi có secret `GOOGLE_TTS_KEY` (PCM LINEAR16 bỏ đầu WAV cho phát luồng, MP3 cho đường cũ), giữ tốc độ giọng trẻ con 0,756 × phát 1,455 như Ngáo; Google tính theo ký tự nên không tốn thêm. Google lỗi → tự về OpenAI Marin. Tắt bằng env `NGO_GOOGLE_TTS=off`; đổi giọng bằng `NGO_GOOGLE_VOICE`. Client ghi nguồn giọng (`x-nmh-tts-source`), không tính phí TTS theo giây cho giọng Google, trạng thái hiện "Google Leda".

**Bằng chứng:** 164/164 test PASS (+4 test Google). [Release 43803916778](https://github.com/hvnm1206/TikTak-Service/actions/runs/43803916778) SUCCESS; version **`35d83a94-3123-4908-8d9e-af026786100e`**, rollback **`64a6eb95-ae06-4feb-88ed-6e50a9932fbd`**. **Phụ thuộc:** secret `GOOGLE_TTS_KEY` phải được người dùng thêm trên Cloudflare; nếu khóa Google giới hạn theo IP/referrer thì sẽ rơi về Marin. Chưa nghiệm thu trên iPhone.

---

## 16/11/2026 (10:40) — NGỐ: GIẢM CHI PHÍ — SIẾT TÌM WEB + TRẢ LỜI NGẮN (MỚI NHẤT)

**Đánh giá chi phí (ước tính 15/11 từ SETUP, ngày thử nghiệm nhiều):** ~30.800đ/ngày; giọng Marin ~60%, Web Search ~28% (~33 lượt), model ~12%. Chưa đối chiếu hóa đơn OpenAI.

**Đã làm (`agent-v2.js`, theo duyệt của người dùng, không đổi chất giọng):** (1) quy tắc web_search ghi rõ TỐN PHÍ, chỉ dùng khi người dùng yêu cầu tra mạng hoặc cần thông tin thay đổi theo thời gian mà kiến thức sẵn có và công cụ miễn phí (get_weather, search_news, search_encyclopedia) không đáp ứng; kiến thức phổ thông/giải thích/trò chuyện không tìm. (2) mặc định 1–2 câu ngắn (~15–35 từ), bỏ rào đón/chào kết; chi tiết khi được yêu cầu. Không hardcode câu nói.

**Bằng chứng:** 160/160 test PASS (thêm test quy tắc chi phí trong instructions). [Release 43799488594](https://github.com/hvnm1206/TikTak-Service/actions/runs/43799488594) SUCCESS; version **`64a6eb95-ae06-4feb-88ed-6e50a9932fbd`**, rollback **`e0411fbe-de8b-4755-b7ac-90d26a0cdd88`**. **Chưa có số liệu sau thay đổi** — cần so ô ƯỚC PHÍ/lượt Web Search sau 1 ngày dùng.

**Ghi nhận chưa làm:** giọng trẻ con (Đanh Đá/Chém Gió) tạo TTS ở tốc độ 0,756 rồi phát 1,455× → dư ~32% tiền giọng; người dùng chấp nhận giữ chất giọng. Azure NamMinh (rẻ hơn, có F0 miễn phí) tạm dừng vì khai thẻ Azure không thành công.

---

## 16/11/2026 (08:25) — NGỐ: SỬA LỖI "WEB SEARCH VƯỢT GIỚI HẠN" (MỚI NHẤT)

**Lỗi iPhone:** "OpenAI: Web Search vượt giới hạn một lượt gọi mỗi câu hỏi". **Nguyên nhân:** `agent-v2.js` gửi `max_tool_calls:1` nhưng OpenAI vẫn có thể trả 2 `web_search_call` (tìm + mở trang); code ném lỗi sau khi các lượt này đã tính tiền → mất câu trả lời đã trả phí. **Sửa:** giữ câu trả lời, tính đủ mọi lượt vào ước phí, vẫn bỏ web_search khỏi các vòng sau. Test cũ "fail closed" đổi thành test giữ câu trả lời + đếm đủ chi phí. 159/159 PASS. [Release 43786038302](https://github.com/hvnm1206/TikTak-Service/actions/runs/43786038302) SUCCESS; version **`e0411fbe-de8b-4755-b7ac-90d26a0cdd88`**, rollback **`97ff413d-5ae2-4fb4-b8c2-8052cecc9def`**.

---

## 16/11/2026 (08:00) — NGỐ: GIỌNG PHÁT LUỒNG MƯỢT LẠI (MỚI NHẤT)

**Phản hồi người dùng:** tiếng nghẹt, không trơn mượt (sau bản phát luồng f2d3967d).

**Nguyên nhân (đọc lại code `ngoStreamSpeech` v1):** khối sau chờ đủ 1 s âm thanh → hụt tiếng giữa khối; mỗi node tự resample 24 kHz + playbackRate → lụp bụp chỗ nối; limiter khởi động lại mỗi khối. Bản thử soft-knee làm bão hòa 3–6% mẫu trên giọng thật.

**Đã sửa (`fast-voice-ui.js`):** resampler Catmull-Rom liên tục (giữ pha qua các khúc mạng, độ dài chính xác); đệm 0,5 s rồi xếp khối nối tiếp chính xác tới từng mẫu, chỉ fade-in khi hụt dữ liệu; limiter nhìn trước 5 ms giữ trạng thái liên tục (0 mẫu cắt cứng trên giọng thật). Công tắc SETUP "Phát giọng ngay khi đang tải" (`ngo_stream_voice_v1`) để so với đường MP3 cũ.

**Bằng chứng:** 159/159 test PASS (có test chỗ nối không nhảy, mỗi mẫu phát 1 lần, tắt công tắc → đường MP3). [Release 43783512960](https://github.com/hvnm1206/TikTak-Service/actions/runs/43783512960) SUCCESS; version **`97ff413d-5ae2-4fb4-b8c2-8052cecc9def`**, rollback **`6b3a2675-2889-4305-a332-f2584cdf4515`**. Lưu ý: workflow release chỉ nhận thông điệp có `20261115`. Chưa nghe nghiệm thu trên iPhone.

---

## 15/11/2026 (23:39) — NGỐ: THÊM GIAO DIỆN "CORGI — CẢ KHUÔN MẶT" VÀO THƯ VIỆN (MỚI NHẤT)

**Yêu cầu:** người dùng chê các giao diện mắt cũ không thể hiện được đôi mắt lanh lợi; duyệt bản thử mặt corgi (artifact riêng) và yêu cầu "đưa thêm vào thư viện".

**Đã làm:** `corgi-face-ui.js` thêm lựa chọn `corgiface` vào SETUP → giao diện, **giữ nguyên** Mặc định/Mắt Ngố/Mắt Vịt/Mắt Corgi. Mặt corgi SVG (lông vàng cam, mắt hổ phách, miệng cười) với chuyển động: mắt giật liếc + giữ, nhìn theo ngón tay, chớp ngẫu nhiên/chớp đôi, tai/lông mày/nghiêng đầu, miệng theo trạng thái. Trạng thái lấy từ `#ngoMascotStage[data-state]` (listening→nghe, processing→nghĩ, speaking→nói, error→tò mò); chạm khi rảnh → vui. Engine nằm trong `ngoThemeScript`.

**Bằng chứng:** 158/158 test PASS. Lần phát hành đầu (run 43736543812) dừng ở GATE 1 do test viết sai, **không deploy**. [Release 43736614736](https://github.com/hvnm1206/TikTak-Service/actions/runs/43736614736) SUCCESS; version **`6b3a2675-2889-4305-a332-f2584cdf4515`**, rollback **`f2d3967d-8e61-4934-a68d-9725912d0ada`**. Chạy thử trên Chromium với trang thật: gắn đúng 1 lần, đổi qua lại không nhân đôi, không lỗi JS. Chưa nghiệm thu trên iPhone. Miệng khi nói đang mô phỏng nhịp, chưa bám âm lượng thật.

---

## 15/11/2026 (23:11) — NGỐ: PHÁT GIỌNG NGAY KHI ĐANG VỀ + ĐỌC D1 SONG SONG (MỚI NHẤT)

**Số đo iPhone thật trước sửa (SETUP):** chốt câu 0.02s · chữ GPT đầu 4.23s · byte âm thanh đầu 1.08s · âm thanh 5.37s · chốt câu → tiếng đầu **9.60s** · Memory/D1 1.45s. Nguyên nhân: client chờ tải trọn MP3 (~4.2s sau byte đầu); `loadV3Context` chạy 4 truy vấn D1 nối tiếp tới D1 ở ENAM.

**Đã sửa:** `fast-voice-ui.js` `ngoStreamSpeech()` phát PCM 24 kHz theo khối (0.35s đầu, sau ~1s), gain cố định đo từ khối đầu, lỗi bất kỳ → quay về đường MP3 cũ; câu trả lời ngắn không có preview cũng phát dạng luồng; `closeVoice()` dừng mọi khối. `worker.js` `/api/tts` nhận `format:"pcm"`. `v3-backend.js` đọc profile/ghi nhớ/tài liệu/hồ sơ học bằng một `Promise.all`.

**Bằng chứng:** 157/157 test PASS. [Release 43734024810](https://github.com/hvnm1206/TikTak-Service/actions/runs/43734024810) SUCCESS; version mới **`f2d3967d-8e61-4934-a68d-9725912d0ada`**, rollback **`8cd227c6-75b3-4fa1-9ac4-f50b1d52d980`**. **Chưa có số đo iPhone sau sửa.**

---

## 15/11/2026 — NGỐ: TIẾNG TO HƠN + PHẢN ỨNG NHANH HƠN (TRẠNG THÁI MỚI NHẤT)

**Yêu cầu người dùng:** tiếng nhỏ, phản ứng chậm.

**Nguyên nhân xác minh từ source:**
- `volume-ui.js` cũ giới hạn gain bằng `0.88/peak`; TTS có đỉnh ~0.9 nên gain thực ≈ 0.98, thanh âm lượng 1.55 và 2.5 cho ra cùng mức (đo trên mẫu giọng thật: −17.9 dBFS cả hai).
- Sau Safari SpeechRecognition, trang ở phiên âm thanh có thu âm; iOS phát Web Audio nhỏ ở chế độ này (cơ chế đã biết, chưa đo trên máy của người dùng).
- `agent-v2.js` chỉ bật phát câu đầu sớm khi message có `phase==='final_answer'`; model không gắn phase thì phải chờ GPT viết xong mới phát.
- Safari tự chốt câu sau khoảng lặng dài.

**Đã sửa:**
- `volume-ui.js`: `loudVoiceProcess()` chuẩn hóa độ to theo RMS phần có tiếng (mục tiêu 0.2×thanh trượt) + limiter look-ahead 4 ms / release 80 ms offline trên PCM, đỉnh ≤0.95, không DynamicsCompressor. Đo mẫu thật: mặc định +5.1 dB, tối đa +6.5 dB, đoạn nhỏ +12 dB.
- `voice-boost-ui.js` (mới): `navigator.audioSession.type="playback"` khi phát, `"auto"` trước khi mở micro; chốt câu nhanh sau 1,0 s không có kết quả mới. Hai công tắc trong SETUP (`ngo_loud_speaker_v1`, `ngo_fast_endpoint_v1`); env `NMH_VOICE_BOOST=off` tắt toàn bộ.
- `agent-v2.js`: phát sớm cả khi message không có phase (vẫn loại `commentary`); câu đầu dài ≥110 ký tự thì phát từ dấu phẩy đầu (không cắt số thập phân).

**Bằng chứng:** 152/152 test PASS (139 cũ + 13 mới). [Release 43732856120](https://github.com/hvnm1206/TikTak-Service/actions/runs/43732856120) SUCCESS: GATE 1 152 PASS, pin version + D1 bookmark PASS, deploy cùng Worker, smoke PASS. Version mới **`8cd227c6-75b3-4fa1-9ac4-f50b1d52d980`**, rollback **`19e0e386-d1dd-4892-a3b1-3a8eb7e93270`**. Source commit `99e215a`. Workflow verify bị lệch pin cũ `9d6df409` (không liên quan bản này) đã cập nhật pin sang version mới.

**Chưa nghiệm thu:** chưa nghe thực trên iPhone; chưa có số đo độ trễ thật (xem dòng ĐỘ TRỄ trong SETUP sau 3–5 lượt). Nếu micro không nhận sau khi Ngố nói → tắt "Ưu tiên loa ngoài". Nếu bị cắt ngang khi ngập ngừng → tắt "Chốt câu nhanh".

---


## Production hiện hành — Kết thúc dứt điểm luồng ghi nhớ (15/11/2026, giờ Việt Nam)

- URL chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Worker `19e0e386-d1dd-4892-a3b1-3a8eb7e93270`, source commit `0f4ef93a377e9b912d95a8a25c3e48db581373ae`, rollback Worker `9d6df409-fe7b-46e7-b5c1-e2d036a293fa`.
- Nguyên nhân: giao diện giữ cặp lệnh ghi và xác nhận “đã ghi” trong 12 tin gửi lại cho GPT, nên lệnh cũ tiếp tục ảnh hưởng lựa chọn công cụ ở lượt sau.
- Sửa bằng ranh giới giao dịch tổng quát, không hard-code tên người/tình huống: sau thao tác ghi/sửa/xóa/nhắc việc đã có receipt, lịch sử vẫn hiển thị cho người dùng nhưng phần lệnh đã đóng không còn được gửi làm thẩm quyền cho lượt mới. Hội thoại thông thường không bị cắt.
- 139/139 kiểm thử PASS; kiểm riêng cả đường phát sớm và đường baseline, giữ nguyên lịch sử hội thoại thường. [Release #43686642613](https://github.com/hvnm1206/TikTak-Service/actions/runs/43686642613) · [Verify #43686642574](https://github.com/hvnm1206/TikTak-Service/actions/runs/43686642574).
- Probe production HTTP 200 có `actionBoundary`, `currentTurnContext`, SpeechRecognition và Marin. UAT iPhone thực vẫn chờ người dùng thử chuỗi: ghi một thông tin → hỏi chủ đề không liên quan.



## Production hiện hành — Làm sạch đuôi nguồn khỏi câu tra mạng (15/11/2026, giờ Việt Nam)

- URL chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Worker `9d6df409-fe7b-46e7-b5c1-e2d036a293fa`, source commit `1ef1ff4b942ba26fab3982ad1742c7b68669ff75`, rollback Worker `0ed691b3-2396-406f-908e-5a6429053c2a`.
- Nguyên nhân lần sửa trước chưa đủ: chỉ lọc citation theo mẫu chữ, chưa dùng `start_index/end_index` của `url_citation`; vì vậy đuôi tên nguồn không có ký hiệu vẫn lọt sang câu thoại.
- Đã sửa theo cấu trúc annotation, không hard-code tên báo/website: cắt đúng span được OpenAI đánh dấu trước khi tạo phụ đề và gửi Marin; đồng thời bỏ khối Nguồn/Source ở cuối. Nguồn xác minh vẫn giữ riêng trong NHẬT KÝ.
- 137/137 kiểm thử PASS, gồm đuôi citation không có ký hiệu, source appendix, câu hợp lệ bắt đầu bằng “Nguồn…”, web search, mic, Marin, Memory và hồi quy cũ. [Release #43685930263](https://github.com/hvnm1206/TikTak-Service/actions/runs/43685930263) · [Verify #43685930240](https://github.com/hvnm1206/TikTak-Service/actions/runs/43685930240).
- HTTP production, D1 bookmark/schema và rollback pin PASS. Nghiệm thu nghe thực tế trên iPhone vẫn do người dùng xác nhận; kiểm thử tự động không thay thế UAT thiết bị.

## Production hiện hành — Ghi nhớ thông minh (15/11/2026, giờ Việt Nam)

- URL chính thức: https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Worker `c9cdc3ad-89a3-4b7c-acf3-e2ce32ae55ec`, commit `6b62388298c558b314c43b8f12dcbdcc6d433271`, rollback Worker `f7e18962-ea91-4899-8cb3-975a304b99bd` đã chạy thành công ở lượt trước.
- SETUP → **GHI NHỚ THÔNG MINH** → **CẬP NHẬT KẾT QUẢ**. Kết quả theo tài khoản Google. D1 production được bổ sung bảng bằng migration 0006 và 0007, có bookmark Time Travel trong artifact của lượt phát hành.
- 133/133 kiểm thử và kiểm tra HTTP production PASS. Đã kiểm trên URL chính thức: nút có trong HTML, QR trỏ về URL chính thức, API kết quả trả 401 khi chưa đăng nhập. [Release](https://github.com/hvnm1206/TikTak-Service/actions/runs/43656179242) · [Lượt rollback](https://github.com/hvnm1206/TikTak-Service/actions/runs/43629240654).
- Chờ nghiệm thu một lượt trên iPhone thực: đăng nhập Google, nói tự nhiên, xem trạng thái phân tích và kiểm tra Ngố dùng đúng thông tin ở lượt sau.

## Mốc trước — phát câu đầu sớm (15/11/2026, giờ Việt Nam)

- Ngố chạy tại https://nmh-voice-gpt-test.magical-budget.workers.dev/ . Worker version `f7e18962-ea91-4899-8cb3-975a304b99bd`, commit ứng dụng `b3fbd9d19423adb0029b17f3c907240472344461`, rollback về `2e5e6e61-4dce-4b0b-9683-d8c9710e978c`.
- SETUP → **Phát câu đầu sớm** bật mặc định và có thể tắt để so sánh. Hội thoại vẫn dùng Marin qua `gpt-4o-mini-tts`. **Thử Realtime Marin** là chức năng nghe mẫu riêng. Bộ đo bổ sung Safari chốt câu, chữ GPT đầu, byte âm thanh đầu và giải mã/phát.
- Sửa ghi đè mẫu riêng khi hồ sơ tải muộn hoặc hai thiết bị chỉnh cùng mẫu. Release kiểm schema D1 hiện có, ghi nhận bookmark Time Travel và phát hành trên cùng Worker. 125/125 bài kiểm thử, sandbox đúng commit, rollback sandbox và smoke production đã PASS. [Release](https://github.com/hvnm1206/TikTak-Service/actions/runs/43619853718) · [Sandbox và pilot](https://github.com/hvnm1206/TikTak-Service/actions/runs/43619115931).
- Nghiệm thu thoại, so sánh độ trễ và nghe mẫu Realtime trên iPhone thực vẫn đang chờ; chưa có số đo chứng minh mức giảm 30%.

Các mốc phía dưới là lịch sử.

---

## HIỆN HÀNH — SỬA LỖI CẢ BA MẪU TÍNH CÁCH ĐÁNH DẤU CHƯA LƯU GIẢ (14/11/2026)
- **Ngố production:** https://nmh-voice-gpt-test.magical-budget.workers.dev/ — Worker version `2e5e6e61-4dce-4b0b-9683-d8c9710e978c`, rollback code `fcd54e1a-6611-4b13-8748-d73e71f5fdc1`.
- **Lỗi từ ảnh người dùng:** vừa chọn một mẫu Đanh Đá/Chém Gió/Nghiêm Túc thì ứng dụng tự gắn cờ `promptDirty`, dù chưa sửa chữ nào. Khi chuyển mẫu, hiện cảnh báo giả “Prompt đang sửa chưa lưu”; thực tế workflow trước kiểm thử D1 nhưng chưa kiểm thử UI thật, nên bỏ sót lỗi này.
- **Sửa mã:** chọn mẫu chỉ là xem/nạp văn bản đã lưu (nếu chưa có mới dùng mặc định), không được đánh dấu là nhập sửa. Hai trạng thái tách biệt: `promptDirty` chỉ khi người dùng thật sự gõ và `presetSelectionPending` khi mẫu được chọn nhưng chưa áp dụng. Tải lại hồ sơ ngầm không ghi đè mẫu đang chọn; save xác minh D1 rồi mới reset trạng thái. Trường hợp thật sự gõ mà chưa lưu vẫn cảnh báo trước khi đổi mẫu.
- **Bằng chứng mới vượt quá API test:** chạy **JavaScript giao diện thực** trong VM mô phỏng event người dùng (chọn/sửa/lưu/đổi/mở lại, cả ba mẫu, check không alert giả, giữ bản nháp, refresh trễ). Tổng cộng **117/117 bài PASS**. Remote Cloudflare Worker+D1 tách biệt, rollback và dọn tài nguyên **PASS**: https://github.com/hvnm1206/TikTak-Service/actions/runs/43615224840 . Production Guard release **SUCCESS**: https://github.com/hvnm1206/TikTak-Service/actions/runs/43615360945 .
- Guarded Operator GET root URL chính HTTP 200, HTML có source mới `presetSelectionPending=true`, `promptDirty=false` khi click chọn, `!presetSelectionPending` bảo vệ refresh, lưu vẫn chuyển `presetKey:selectedKey`. Micro, QR và các chức năng cũ vẫn có.
- **Chưa có xác nhận iPhone thực với phiên Google của người dùng**; không được đồng nhất kiểm thử UI/DB sandbox với thiết bị cá nhân.
- **Đặc tả và nguyên nhân gốc:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_PROMPT_PRESETS_20261114.md

Những mốc version phía dưới là lịch sử; không dùng làm baseline release.

---


## MỚI NHẤT 14/11/2026 — SỬA MẪU TÍNH CÁCH TỰ TRỞ VỀ NỘI DUNG CŨ

- **Production Worker:** `nmh-voice-gpt-test`, URL https://nmh-voice-gpt-test.magical-budget.workers.dev/ . **Version mới `fcd54e1a-6611-4b13-8748-d73e71f5fdc1`**, rollback code `c35801d0-a840-4d4c-adc1-155c6070489a`.
- **Nguyên nhân gốc đã xác minh:** Trong `v3-ui.js`, các nút `MẪU ĐANH ĐÁ`, `MẪU CHÉM GIÓ`, `MẪU NGHIÊM TÚC` luôn gán giá trị `presets.danh/chem/nghiem` được hard-code. Nút LƯU PROMPT trước đó chỉ ghi Prompt đang dùng, không có nơi lưu bản chỉnh sửa riêng cho từng mẫu. Khi bấm chọn mẫu, nội dung cũ được nạp lại (đúng ảnh người dùng).
- **Đã sửa:** mỗi mẫu được lưu riêng theo Google ID trong trường JSON `v3_profiles.presets_json` và đánh dấu mẫu đang dùng `active_preset`. Chọn mẫu nạp bản tùy chỉnh đã lưu; nếu tài khoản chưa chỉnh mẫu thì dùng mặc định. Khi sửa một mẫu rồi LƯU PROMPT, D1 ghi **đồng thời Prompt sử dụng và nội dung mẫu đang chọn**, revision tăng, đọc lại cả hai; màn hình không báo lưu thành công khi readback thiếu. Nếu đang sửa chưa lưu mà đổi mẫu phải xác nhận. Không xóa Prompt cũ.
- **Migration:** `migrations/0005_prompt_presets.sql` (additive), pipeline production tự phát hiện cột còn thiếu và bổ sung idempotent. D1 Time Travel bookmark/rollback theo workflow.
- **Bằng chứng:** CI 114/114 PASS; [sandbox Worker+D1 thật #43613858183](https://github.com/hvnm1206/TikTak-Service/actions/runs/43613858183) PASS, cả tạo/sửa, chuyển Đanh Đá↔Chém Gió, mở lại, conflict, rollback/cleanup. [Production release #43613990687](https://github.com/hvnm1206/TikTak-Service/actions/runs/43613990687) SUCCESS. Guard/Operator GET URL chính HTTP 200 và thấy source logic `savedPresets/selectPreset/activePreset`, micro và QR còn nguyên.
- **Lưu ý với Prompt đã lưu trước khi sửa:** D1 cũ chỉ biết nội dung Prompt, **không biết người dùng lấy từ mẫu nào**, vì vậy không tự gắn Prompt cũ vào nút Đanh Đá. Nếu muốn dùng văn bản đã viết làm mẫu Đanh Đá, hãy mở Prompt đang lưu, sao chép nội dung, bấm MẪU ĐANH ĐÁ, dán vào, LƯU PROMPT **một lần**. Từ sau lần này nút Đanh Đá sẽ nạp lại bản riêng đã lưu.
- **Chưa nghiệm thu:** phiên Google cá nhân trên iPhone thật của người dùng, chưa thể kết luận đã kiểm chứng thao tác người dùng. Không sửa Ngáo, mic, Marin, Memory, Reminder hoặc API key.
- **Nhật ký kỹ thuật:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_PROMPT_PRESETS_20261114.md

Các mục version bên dưới là lịch sử, không phải phiên bản đang chạy.

---


## HIỆN HÀNH 14/11/2026 — SỬA LƯU PROMPT MỚI VÀ SỬA PROMPT

- **Worker production chính:** `nmh-voice-gpt-test` — https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; **version `c35801d0-a840-4d4c-adc1-155c6070489a`**. Mốc rollback code **`c1755bd1-5e2a-4af8-b542-d4557446cef4`**.
- **Triệu chứng:** người dùng phản ánh bấm LƯU PROMPT trong TÍNH CÁCH — PROMPT không lưu được nội dung mới hoặc sửa. Ảnh hiển thị textarea và nút nhưng không cung cấp HTTP/D1 log, vì vậy nguyên nhân cụ thể của lần lỗi cá nhân chưa xác định độc lập.
- **Lỗ hổng đã xác minh trong source cũ:** phản hồi lưu chỉ dựa vào PUT 200, không kiểm D1 readback; thông báo nằm xa nút ở cuối khu setup; hàm refresh có thể ghi đè nội dung đang nhập. Revision conflict 409 không được hướng dẫn ngay tại chỗ.
- **Khắc phục:** backend D1 INSERT/UPDATE owner-scoped theo revision, đọc lại đúng chuỗi Prompt và revision trước khi phát receipt `ok:true,verified:true`; trả 409 nếu đã bị sửa ở thiết bị khác, 503 nếu không xác minh được. Giao diện thêm status dưới nút LƯU PROMPT, hiển thị ĐANG LƯU / ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG / CHƯA LƯU ĐƯỢC; giữ bản nháp khi lỗi hoặc refresh, chặn bấm trùng, kiểm lại server lần hai trước khi báo đạt.
- **Kiểm thử:** 114/114 bài PASS [CI #43612304741](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612304741). Cloudflare Worker+D1 **thật, tách biệt** kiểm create/edit/GET/readback/409 và rollback exact version, cleanup PASS [sandbox #43612304708](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612304708). [Release production #43612444869](https://github.com/hvnm1206/TikTak-Service/actions/runs/43612444869) SUCCESS, có D1 Time Travel bookmark artifact.
- **Guard độc lập sau deploy:** GET URL Ngố chính HTTP 200, xác minh các marker status/nút save/đọc lại cùng SpeechRecognition và QR vẫn còn trong HTML.
- **Chưa nghiệm thu:** chưa kiểm trực tiếp một lượt save→refresh→hỏi lại trong phiên Google cá nhân trên iPhone của người dùng. Không tự nhận đã xác minh dữ liệu thật của người dùng; không chỉnh dữ liệu production của người dùng.
- **Hướng dẫn:** SETUP → chỉnh Prompt → LƯU PROMPT → nhìn status ngay dưới nút. Chỉ coi đã lưu khi thấy **ĐÃ LƯU VÀ ĐỌC LẠI THÀNH CÔNG**. Nếu báo 409, nội dung đang gõ vẫn giữ, kiểm tra thay đổi từ thiết bị khác rồi chọn lưu lại.
- **Nhật ký kỹ thuật:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_PROMPT_SAVE_FIX_20261114.md

**Những mục version bên dưới chỉ là lịch sử**, không dùng làm baseline phát hành. Không sửa Ngáo, mic, Marin, GPT, D1 schema, Memory hoặc nhắc việc trong lần fix này.

---


## TRẠNG THÁI CHÍNH THỨC — QR MỞ APP TRONG SETUP (14/11/2026)

- **App Ngố chính:** https://nmh-voice-gpt-test.magical-budget.workers.dev/
- **Cloudflare Worker:** `nmh-voice-gpt-test` — production version **`c1755bd1-5e2a-4af8-b542-d4557446cef4`**. Rollback code version **`4f2c3cd2-e814-41f1-87da-85dc6e371079`**.
- **Mới cập nhật:** SETUP (Cài đặt) có mục mở sẵn **MÃ QR MỞ NGỐ TRÊN ĐIỆN THOẠI**: mã QR trắng/đen, link bấm trực tiếp và nút **SAO CHÉP LINK**. Mã QR chỉ chứa URL công khai ở trên, không kèm API key, danh tính hay dữ liệu riêng. Không gọi dịch vụ QR ngoài, hoạt động khi ứng dụng tải xong.
- **Kiểm định QR:** ma trận QR phiên bản 4, mức sửa lỗi M, viền trắng 4 module, đã giải mã bằng OpenCV ra đúng URL. SHA256 ma trận `9aa11ca4324cf0479d963dd15c73793348d28088ebe499bb901883b9743ff026`.
- **Chứng cứ kỹ thuật:** 114/114 bài kiểm thử PASS [CI #43610054668](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054668); [sandbox Cloudflare Worker+D1 rollback #43610054623](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610054623) PASS; [production Guard release #43610159478](https://github.com/hvnm1206/TikTak-Service/actions/runs/43610159478) PASS. Guarded Operator GET chính URL production trả HTTP 200, xác nhận mã QR/link/copy cùng phần nhận giọng nói và AudioContext vẫn phục vụ trong HTML.
- **Không thay đổi trong lần này:** micro, GPT-6 Luna, Marin TTS, mức âm lượng, tìm kiếm, Memory/D1, OAuth, nhắc việc 10 phút và các skin đôi mắt. Ngáo là sản phẩm riêng, không sửa.
- **Còn cần nghiệm thu trên thiết bị:** quét QR bằng camera iPhone thực, mở Safari/app đúng URL; xác minh camera không báo lỗi, bố cục SETUP và âm thanh/mic thông thường. Không khẳng định đã PASS iPhone nếu chưa thấy kết quả thực.
- **Đặc tả + nhật ký QR:** https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_SETUP_QR_RELEASE_20261114.md

### Tổng kết tình trạng Ngố sau các đợt nâng cấp 14/11/2026

1. **Voice:** Safari SpeechRecognition → GPT-6 Luna/Responses → Marin; đã có chỉ số thời gian GPT/API, D1, TTS và tiếng đầu trong SETUP. Kiến trúc vẫn chờ GPT hoàn thành văn bản trước khi TTS phát tiếng đầu; chưa streaming hoàn toàn.
2. **Giao diện:** Mặc định + Mắt Ngố/Mắt Vịt/Mắt Corgi dùng chung động cơ mắt chớp và nhìn theo trạng thái; vừa bổ sung QR chia sẻ ngay trong SETUP.
3. **Dữ liệu cá nhân:** Google OAuth và Cloudflare D1; công cụ ghi chú/ghi nhớ/đọc/sửa/xóa có xác thực và kiểm chứng D1. Chất lượng truy xuất ghi nhớ cũ trên dữ liệu lớn chưa đạt chứng minh tìm kiếm ngữ nghĩa toàn diện.
4. **Tìm kiếm:** OpenAI Web Search, Wikipedia/RSS và Open-Meteo dự báo 7 ngày; đã kiểm tra nguồn thời tiết công khai có ngày mai. Chưa có nghiệm thu GPT chọn công cụ đúng cho mọi câu hỏi thoại thực.
5. **Âm thanh:** Marin đã bỏ compressor cũ và có cân biên độ từng đoạn; nghe qua loa iPhone nhiều lượt chưa được nghiệm thu; phát nhắc việc vẫn qua đường audio riêng.
6. **Nhắc việc:** đã tăng polling từ 10 giây lên 10 phút, giảm 60 lần các yêu cầu định kỳ; foreground-only, có thể trễ và không nhắc được nếu ứng dụng đóng.
7. **Chi phí:** OpenAI API theo key do người dùng nhập; Cloudflare do chủ Worker thanh toán. Bảng ước tính nội bộ theo thiết bị không thay thế hóa đơn. [Audit tổng thể & ước phí](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_FULL_AUDIT_AND_COST_20261114.md).
8. **Guard:** production version pin, sandbox Worker+D1, CI regression và rollback có bằng chứng; riêng nghiệm thu iPhone (giọng nói, độ trễ, âm lượng, quét QR) chưa được chứng minh tự động.

**Nguồn chuẩn triển khai:** branch `nmh-voice-actions-reminders-p0-20261114`. Branch `nmh-voice-gpt-v1` chỉ dành cho tài liệu BẢO TRÌ/bàn giao; không lấy làm source phát hành. Các phiên bản cũ ghi phía dưới là **lịch sử**, không phải production hiện hành.

---


## MỚI NHẤT — NHẮC VIỆC 10 PHÚT (14/11/2026)
- Ngố chính: https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Worker production version **`4f2c3cd2-e814-41f1-87da-85dc6e371079`** ; rollback code **`c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d`**.
- Người dùng chọn giữ nhắc việc và nới chu kỳ **10 giây → 10 phút**; giữ kiểm tra lúc mở app, lúc quay lại app nếu đã qua >=60 giây, ngăn các lệnh kiểm tra chồng lặp. Không xóa lời nhắc/D1; không thay micro, Marin, GPT, Memory.
- Giảm polling định kỳ từ 8.640 xuống 144 lần/ngày trên một máy mở liên tục (60 lần); nhắc việc **có thể trễ tối đa gần 10 phút** nếu app mở liên tục và chưa có tương tác quay lại. Vẫn là foreground-only.
- CI **111/111 PASS**, sandbox/rollback PASS, deploy và kiểm tra production PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43604249247 .
- Chi phí TTS Marin cần hiểu chính xác: OpenAI tính theo token văn bản ($0,60/1M) và token âm thanh đầu ra ($12/1M); khoảng $0,015/phút chỉ là đơn giá ước tính, không phải phí cố định hoặc làm tròn lên một phút. Nguồn: https://developers.openai.com/api/docs/models/gpt-4o-mini-tts.
- Tài liệu chi tiết: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REMINDER_POLL_10MIN_20261114.md


## MỚI NHẤT 14/11/2026 — SỬA DỰ BÁO NGÀY MAI VÀ ÂM LƯỢNG MARIN
- Worker chính: https://nmh-voice-gpt-test.magical-budget.workers.dev/ — production version **`c53ec4d6-ed9f-4dd2-9f79-76cdfdd8505d`**. Rollback code **`c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`**.
- Lỗi thời tiết: công cụ `get_weather` trước chỉ lấy `current`. Đã yêu cầu thêm 7 ngày `daily`: ngày địa phương, nhiệt độ max/min, xác suất và lượng mưa, gió, WMO code, đơn vị. Ngày mai phải lấy dự báo của đúng ngày, không lấy current thay thế. Không có daily thì công cụ báo lỗi, không bịa dữ liệu.
- Kiểm nguồn công khai thực: Guarded Operator GET Open-Meteo geocoding Hà Nội HTTP 200, forecast endpoint HTTP 200 với `2026-11-15` và các giá trị daily; chưa có test GPT real API của phiên iPhone.
- Âm lượng: bỏ bộ nén động gây nguy cơ dao động mức âm; thay gain tuyến tính theo RMS PCM của từng đoạn Marin và giới hạn đỉnh 0.88 không clipping; giữ nút volume, mic và nhịp TTS như cũ. Đây là thay đổi kỹ thuật có test waveform, chưa xác nhận cảm giác nghe trên iPhone.
- CI **110/110 PASS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43601366567 ; sandbox D1/Worker và rollback PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43601510075 ; production release SUCCESS https://github.com/hvnm1206/TikTak-Service/actions/runs/43601602098 ; D1 Time Travel bookmark được lưu trong artifact của release.
- Bài thử iPhone chưa xác minh: hỏi “Thời tiết Hà Nội ngày mai thế nào?” (đúng ngày dự báo), thử nghe một đoạn dài nhiều phần Marin, thay đổi volume trong SETUP, thử ngắt lời và micro. Nếu còn lỗi phải ghi nhận thông số/lỗi thực, không vá theo từng câu hỏi.
- Báo cáo kỹ thuật: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_WEATHER_VOLUME_REPAIR_20261114.md


## MỚI NHẤT 14/11/2026 — GIẢM THỜI GIAN ĐẾN TIẾNG NÓI ĐẦU TIÊN
- URL chính giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/ ; Cloudflare Worker version `c547c24a-ff0a-4b6d-afe4-1bbdd80d23d9`. Rollback version `f24ae459-324a-4aef-96d0-7713454d62e4`.
- Thêm SETUP → ĐỘ TRỄ: đo từ khi Safari nhận xong câu nói đến GPT/API trả lời, Marin tạo tiếng đầu, tổng và thời gian backend D1/GPT. Không gửi nội dung voice hoặc API key vào log; số liệu theo lượt trên thiết bị.
- Chia phần giọng đầu Marin tối đa 180 ký tự thay 440 khi câu đầu dài; các phần sau 440 như cũ. Nội dung và thứ tự nguyên văn không mất, cơ chế Marin prefetch và ngắt lời giữ nguyên. **GPT vẫn phải trả xong toàn bộ câu trả lời trước khi Marin được gọi**, chưa phải streaming chồng lấn hoàn toàn.
- CI **104/104 PASS**: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883353 ; Cloudflare sandbox Worker+D1, rollback/cleanup PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599883356 ; production release, D1 bookmark và smoke PASS: https://github.com/hvnm1206/TikTak-Service/actions/runs/43599996114.
- UAT iPhone: nói một câu → mở SETUP đọc ĐỘ TRỄ (GPT/API, Marin → tiếng đầu, tổng, Memory/D1, GPT server). So sánh ít nhất 3-5 lượt thường và có tìm kiếm, kiểm ngắt lời, mic, âm thanh, theme, Memory/nhắc việc. **Chưa có số đo iPhone để tuyên bố tiết kiệm được bao nhiêu giây**.
- Đặc tả/test: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_LATENCY_V1_20261114.md


## CẬP NHẬT MỚI NHẤT — NGỐ ĐÔI MẮT SINH ĐỘNG (14/11/2026)
- Worker chính giữ nguyên https://nmh-voice-gpt-test.magical-budget.workers.dev/ , production version **`f24ae459-324a-4aef-96d0-7713454d62e4`**; rollback version `fa391d70-0eaa-4e7d-8643-1943e119619e`.
- SETUP → GIAO DIỆN NGỐ: Mặc định (canvas Presence nguyên bản), Mắt Ngố, Mắt Vịt, Mắt Corgi. Ba theme mới **chỉ có đôi mắt lớn**, đồng tử chuyển động theo chạm, mắt chớp, nhìn theo trạng thái nghe/nghĩ/nói; không xoay mặt nạ; hỗ trợ reduced motion.
- Source sửa đúng lớp UI `voice-deploy/theme-ui.js`; giữ nguyên micro, Marin, GPT, D1, Memory, Reminder và Ngáo.
- CI **101/101 PASS** https://github.com/hvnm1206/TikTak-Service/actions/runs/43588435662 ; sandbox Worker+D1 và rollback PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43587884426 ; deploy production có baseline pin và D1 bookmark PASS https://github.com/hvnm1206/TikTak-Service/actions/runs/43588003169 .
- Guarded Operator độc lập GET đúng URL production HTTP 200, HTML có theme selector, ngo-eye/ngo-iris, blink engine và SpeechRecognition.
- **Chưa kiểm chứng Safari iPhone thật**, cần người dùng đánh giá mắt, chuyển theme, mic/Marin thực tế. Không tự tuyên bố nghiệm thu thiết bị.
- Đặc tả & kết quả: https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_EYES_ONLY_V1_20261114.md .


## 1. Production đã kiểm chứng
- URL giữ nguyên: https://nmh-voice-gpt-test.magical-budget.workers.dev/
- Cloudflare Worker: `nmh-voice-gpt-test`
- Phiên bản phát hành: `fa391d70-0eaa-4e7d-8643-1943e119619e`
- Version rollback tức thời: `d0622605-7d01-47ba-a5aa-bbb7e5262ee9`
- D1 production: `nmh-voice-v3` (ID `3ce295cb-a84d-4a50-abee-d14fdd903514`).
- Source: [GitHub branch](https://github.com/hvnm1206/TikTak-Service/tree/nmh-voice-actions-reminders-p0-20261114).
- Release CI: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586216466 — SUCCESS; 99/99 regression PASS, prior version gate PASS, D1 Time Travel bookmark được lưu artifact 30 ngày và rollback có cấu hình.
- Sandbox Cloudflare Worker + D1 thật: https://github.com/hvnm1206/TikTak-Service/actions/runs/43586024270 — SUCCESS, kiểm tra migration, quyền truy cập, reminder claim, rollback và cleanup.
- Sau deploy, Guarded Operator GET `/health` HTTP 200, `writeVersion=semantic-actions-d1-readback-v1`; GET `/api/v3/config` 200 `ready:true`; GET `/api/reminders/capabilities` 200 `enabled:true,foregroundOnly:true`. Lần kiểm tra health ban đầu còn nhãn cũ; gọi lại không cache và URL chuẩn đều đã ra nhãn mới.

## 1B. Sửa nguyên nhân gốc hậu phát hành
- Bảo đảm GPT không thể phủ định lỗi D1 bằng câu “đã lưu” không có receipt; `TURN_MISMATCH` không chặn trả lời câu hỏi thường. Có bài kiểm thử giả lập GPT cố báo lưu thành công sau D1 lỗi.
- Bỏ hardcode tiêu đề `## A. HIỆN TRẠNG ĐANG CHẠY` trong đường dự phòng GitHub docs và trong smoke test. Khi dùng bản Raw dự phòng, header `x-nmh-doc-source` báo rõ `github-raw-fallback-freshness-unverified`; không tự nhận dữ liệu mới đã được xác minh.
- Lần phát hành bị lỗi smoke đều tự rollback đúng bản `d062...`; bản cuối cùng 99/99 test PASS và Guard HTTP production/health/docs đều PASS.
- Mới xác minh backend và test mô phỏng OpenAI. **Nghiệm thu iPhone + key/API thực chưa có**.

## 2. Thay đổi kiến trúc — chỉ bản chính Ngố
- Xóa `voice-write.js`, `voice-write.test.mjs`, regex phân loại ý định từ lời nói và các luồng lưu ghi chú/ghi nhớ song song trong `/api/chat`.
- Xóa thuật toán ghép quan hệ theo từ khóa và prompt chuyên biệt về quan hệ gia đình. Không hardcode tên người, ngành hoặc câu người dùng.
- GPT chọn công cụ `save_memory`, `save_note`, `update_memory`, `delete_memory`, `read_memories`, `set/list/cancel_reminder`. Backend xác thực Google subject, validate dữ liệu, D1 readback và chỉ báo thành công khi có receipt thực.
- Memory không phụ thuộc cờ nhắc việc. `loadV3Context` cấp 20 ghi nhớ gần nhất; `read_memories` chỉ đọc theo trang (50 dòng/trang) để GPT truy xuất sâu hơn. Đây không phải vector/semantic retrieval đã kiểm chứng độ chính xác trên kho lớn.
- Không sửa Ngáo, không đổi URL, luồng micro/SpeechRecognition/Marin, giao diện Vịt/Corgi, tài liệu người dùng hoặc dữ liệu D1 hiện hữu.

## 3. Mức độ nghiệm thu và giới hạn
- **Đã xác minh:** CI tự động, D1 sandbox/rollback, deploy production, HTTP/feature flags và các bước bảo vệ.
- **Chưa xác minh:** Người dùng nói trên iPhone thật với Google session và API key cá nhân; GPT Responses API thật tự chọn công cụ cho câu mới; phát Marin đúng với từng kết quả; mức chính xác truy xuất Memory trên kho lớn.
- Nghiệm thu iPhone cần: nói lưu một thông tin bất kỳ → D1 xác nhận → refresh/hỏi lại; sửa/xóa; ghi chú; nhắc giờ tự nhiên; câu hỏi bình thường không ghi; thử micro, Marin, theme. Cấm tự tuyên bố PASS nếu chưa thấy bằng chứng thực tế.
- Nếu lỗi, giữ bản sao và xác minh ngay actionErrorCode, phiên Google, bản ghi D1, nguồn gọi OpenAI, log liên quan; không thêm regex vá câu.

## 4. Tài liệu lịch sử và nguồn
- [Nhật ký bảo trì ngay trước tái cấu trúc](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_PRE_UNIFIED_20261114.md) — lưu nguyên văn, không xóa.
- [Bản lưu trữ kỹ thuật cũ](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/archive/MAINTENANCE_FULL_20261114.md).
- [Kế hoạch và quá trình thực hiện 7 cổng](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-actions-reminders-p0-20261114/voice-deploy/NGO_REBUILD_7_GATE_EXECUTION_20261114.md).
- [Tài liệu cửa mới](https://github.com/hvnm1206/TikTak-Service/blob/nmh-voice-gpt-v1/voice-deploy/START_HERE_NEXT_CHAT.md).

Nguyên tắc: trạng thái ở mục 1 là mốc hiện hành; mọi phiên bản trong tài liệu lưu trữ là lịch sử, không sử dụng làm baseline deploy nếu chưa đối chiếu Cloudflare.
