# News API Guide

## Tổng quan
Module này cho phép giáo viên tạo, quản lý, cập nhật, xóa tin tức; học sinh có thể xem, yêu thích và lọc tin tức theo thể loại (môn học).

---

## 1. Tạo tin tức (giáo viên)
```bash
curl -X POST http://localhost:3000/api/news/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bí kíp chinh phục phương trình bậc hai",
    "content": "<b>Học tốt toán</b> cần luyện tập nhiều!",
    "coverImage": "<base64-image>"
  }'
```
> **Lưu ý:** Không cần truyền `subject`. Hệ thống sẽ tự động lấy id môn mà giáo viên đang dạy.

---

## 2. Lấy tất cả tin tức
```bash
curl -X GET http://localhost:3000/api/news/all \
  -H "Authorization: Bearer <token>"
```

---

## 3. Lấy tin tức theo thể loại (môn học)
```bash
curl -X GET "http://localhost:3000/api/news/by-subject?subject=<subjectId>" \
  -H "Authorization: Bearer <token>"
```
> **Lưu ý:** Truyền id môn học (`subjectId`) thay vì tên môn.

---

## 4. Lấy tin tức của giáo viên đang đăng nhập
```bash
curl -X GET http://localhost:3000/api/news/mine \
  -H "Authorization: Bearer <token>"
```

---

## 5. Lấy tin tức yêu thích của user
```bash
curl -X GET http://localhost:3000/api/news/favorites \
  -H "Authorization: Bearer <token>"
```

---

## 6. Lấy danh sách các thể loại đã có tin tức
```bash
curl -X GET http://localhost:3000/api/news/subjects \
  -H "Authorization: Bearer <token>"
```

---

## 7. Lấy chi tiết tin tức (và tăng views)
```bash
curl -X GET http://localhost:3000/api/news/<newsId> \
  -H "Authorization: Bearer <token>"
```

---

## 8. Cập nhật tin tức (chỉ giáo viên tạo được cập nhật)
```bash
curl -X PATCH http://localhost:3000/api/news/update/<newsId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tiêu đề mới",
    "content": "<b>Nội dung mới</b>",
    "coverImage": "<base64-image>"
  }'
```

---

## 9. Xóa tin tức (chỉ giáo viên tạo được xóa)
```bash
curl -X DELETE http://localhost:3000/api/news/delete/<newsId> \
  -H "Authorization: Bearer <token>"
```

---

## 10. Thêm tin vào mục yêu thích (học sinh)
```bash
curl -X POST http://localhost:3000/api/news/<newsId>/favorite \
  -H "Authorization: Bearer <token>"
```

---

## 11. Bỏ tin khỏi mục yêu thích (học sinh)
```bash
curl -X DELETE http://localhost:3000/api/news/<newsId>/favorite \
  -H "Authorization: Bearer <token>"
```

---

## Lưu ý
- <token>: JWT trả về khi đăng nhập.
- <newsId>: ID của tin tức.
- <subjectId>: ID của môn học (lấy từ API /api/news/subjects hoặc từ profile giáo viên).
- <base64-image>: Chuỗi base64 của ảnh bìa (có thể để rỗng nếu không có ảnh).
- Các endpoint đều yêu cầu xác thực (Authorization header).
- Trả về lỗi 403/404 nếu không đủ quyền hoặc không tìm thấy tài nguyên. 