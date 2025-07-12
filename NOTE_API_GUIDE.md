# Note API Guide

Module này cho phép học sinh và giáo viên tạo, xem, cập nhật, xóa ghi chú cá nhân cho từng tiết học. Ghi chú có thể đặt thời gian nhắc nhở dựa trên thời gian tiết học cộng với số phút nhập từ form.

## Authentication
Tất cả các endpoint đều yêu cầu xác thực (Bearer Token).

## Endpoints

### 1. Tạo ghi chú
- **POST** `/api/notes`
- **Body:**
```json
{
  "title": "string (bắt buộc)",
  "content": "string (bắt buộc)",
  "lesson": "lessonId (bắt buộc)",
  "remindMinutes": 10
}
```
- **Curl:**
```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ghi chú 1",
    "content": "Nội dung ghi chú...",
    "lesson": "<LESSON_ID>",
    "remindMinutes": 10
  }'
```
- **Response:**
```json
{
  "_id": "...",
  "title": "...",
  "content": "...",
  "user": "...",
  "lesson": "...",
  "remindAt": "2024-06-01T08:10:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 2. Lấy danh sách ghi chú của user tại 1 tiết học
- **GET** `/api/notes?lesson=lessonId`
- **Curl:**
```bash
curl -X GET "http://localhost:3000/api/notes?lesson=<LESSON_ID>" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```
- **Response:**
```json
[
  {
    "_id": "...",
    "title": "...",
    "content": "...",
    "remindAt": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 3. Cập nhật ghi chú
- **PATCH** `/api/notes/:id`
- **Body:**
```json
{
  "title": "string (tùy chọn)",
  "content": "string (tùy chọn)",
  "remindMinutes": 15
}
```
- **Curl:**
```bash
curl -X PATCH http://localhost:3000/api/notes/<NOTE_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ghi chú đã cập nhật",
    "remindMinutes": 15
  }'
```
- **Response:**
```json
{
  "_id": "...",
  "title": "...",
  "content": "...",
  "remindAt": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 4. Xóa ghi chú
- **DELETE** `/api/notes/:id`
- **Curl:**
```bash
curl -X DELETE http://localhost:3000/api/notes/<NOTE_ID> \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```
- **Response:**
```json
{
  "message": "Deleted successfully"
}
```

## Markdown Guide
Bạn có thể sử dụng cú pháp Markdown trong nội dung ghi chú:
- **In đậm:** `**text**` hoặc `__text__`
- *In nghiêng:* `*text*` hoặc `_text_`
- `Mã code`: `` `code` ``
- Danh sách:
  - `- item 1`
  - `- item 2`
- Tiêu đề: `# H1`, `## H2`, ...

## Lưu ý
- Chỉ user tạo ghi chú mới có thể xem/sửa/xóa ghi chú của mình.
- Thời gian nhắc nhở sẽ được tính từ thời gian bắt đầu tiết học cộng với số phút bạn nhập. 