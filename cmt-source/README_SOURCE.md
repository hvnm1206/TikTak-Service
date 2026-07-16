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

## Mốc nguồn

Source được lấy nguyên trạng từ commit gốc của Sites: `03c4b40` — `Build public TikTak CMT prototype`.
