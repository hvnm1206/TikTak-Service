# TikTak CMT — source project

Đây là source TypeScript/React/Vinext gốc đã dùng để build prototype TikTak CMT đang phát hành trong thư mục `/cmt/`.

## File chỉnh giao diện chính

- `app/page.tsx`: toàn bộ màn hình, dữ liệu minh họa và luồng tương tác của prototype.
- `app/globals.css`: toàn bộ style, bố cục mobile-first, màu sắc và component states.
- `app/layout.tsx`: metadata, font và layout gốc.

## Cài đặt và chạy thử

Yêu cầu Node.js `>=22.13.0`.

```bash
cd cmt-source
npm ci
npm run dev
```

## Build production

```bash
cd cmt-source
npm ci
npm run build
npm run validate:artifact
```

Hoặc chạy cả build và bài test render:

```bash
npm test
```

Build output được sinh trong `dist/`. Thư mục `/cmt/` hiện tại là bản static đã được xuất từ cùng source này và không bị thay đổi khi thêm `/cmt-source/`.

## Tạo lại thư mục static tương đương `/cmt/`

Sau khi `npm ci`, chạy:

```bash
bash tools/export-static-cmt.sh
```

Script sẽ build source, chạy Vinext tạm thời, xuất HTML cùng toàn bộ CSS/JS/font vào `static-export/`, đồng thời sửa đường dẫn dynamic import thành tương đối để hoạt động khi đặt trong thư mục con trên GitHub Pages. Script không tự ghi đè `/cmt/`.

## Mốc nguồn

Source được lấy nguyên trạng từ commit gốc của Sites: `03c4b40` — `Build public TikTak CMT prototype`.
