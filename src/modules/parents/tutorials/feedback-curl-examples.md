# Feedback API - cURL Examples

Các ví dụ sử dụng cURL để test API feedback management.

## Setup

Thay thế các giá trị sau:
- `YOUR_JWT_TOKEN`: Token JWT của bạn
- `FEEDBACK_ID`: ID của feedback cụ thể
- `PARENT_ID`: ID của phụ huynh
- `ADMIN_ID`: ID của admin

## 1. Lấy tất cả feedback

```bash
# Lấy tất cả feedback
curl -X GET "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Lọc theo trạng thái pending
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Lọc theo rating 5 sao
curl -X GET "http://localhost:3000/api/parents/feedback?rating=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Kết hợp filter
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending&rating=5&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 2. Lấy thống kê feedback

```bash
curl -X GET "http://localhost:3000/api/parents/feedback/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 3. Lấy chi tiết feedback

```bash
curl -X GET "http://localhost:3000/api/parents/feedback/FEEDBACK_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 4. Cập nhật trạng thái feedback

```bash
# Cập nhật thành reviewed
curl -X PATCH "http://localhost:3000/api/parents/feedback/FEEDBACK_ID/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "reviewed"
  }'

# Cập nhật thành resolved với phản hồi
curl -X PATCH "http://localhost:3000/api/parents/feedback/FEEDBACK_ID/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện hệ thống."
  }'
```

## 5. Gửi feedback (cho phụ huynh)

```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "description": "Hệ thống rất tốt, giao diện dễ sử dụng. Tuy nhiên cần cải thiện tốc độ tải trang."
  }'
```

## 6. Lấy danh sách feedback của phụ huynh

```bash
curl -X GET "http://localhost:3000/api/parents/my-feedback?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 7. Lấy danh sách con của phụ huynh

```bash
curl -X GET "http://localhost:3000/api/parents/children" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 8. Xem thời khóa biểu của con

```bash
curl -X GET "http://localhost:3000/api/parents/children/CHILD_ID/schedule?academicYear=2024-2025&startOfWeek=2024-01-15&endOfWeek=2024-01-21" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Workflow Hoàn chỉnh

### Bước 1: Phụ huynh gửi feedback
```bash
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer PARENT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "description": "Hệ thống tốt nhưng cần cải thiện tốc độ tải trang."
  }'
```

### Bước 2: Admin xem danh sách feedback pending
```bash
curl -X GET "http://localhost:3000/api/parents/feedback?status=pending" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Bước 3: Admin xem chi tiết feedback
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/FEEDBACK_ID" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Bước 4: Admin cập nhật trạng thái thành reviewed
```bash
curl -X PATCH "http://localhost:3000/api/parents/feedback/FEEDBACK_ID/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "reviewed"
  }'
```

### Bước 5: Admin phản hồi và giải quyết
```bash
curl -X PATCH "http://localhost:3000/api/parents/feedback/FEEDBACK_ID/status" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "adminResponse": "Cảm ơn phụ huynh đã góp ý. Chúng tôi sẽ cải thiện tốc độ tải trang trong phiên bản tiếp theo."
  }'
```

### Bước 6: Kiểm tra thống kê
```bash
curl -X GET "http://localhost:3000/api/parents/feedback/stats" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

## Test Cases

### Test Case 1: Validation Errors

```bash
# Test rating không hợp lệ
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 6,
    "description": "Test description"
  }'

# Test description quá ngắn
curl -X POST "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "description": "Short"
  }'

# Test status không hợp lệ
curl -X PATCH "http://localhost:3000/api/parents/feedback/FEEDBACK_ID/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status"
  }'
```

### Test Case 2: Authorization Errors

```bash
# Test không có token
curl -X GET "http://localhost:3000/api/parents/feedback"

# Test token không hợp lệ
curl -X GET "http://localhost:3000/api/parents/feedback" \
  -H "Authorization: Bearer invalid_token"
```

### Test Case 3: Not Found Errors

```bash
# Test feedback không tồn tại
curl -X GET "http://localhost:3000/api/parents/feedback/nonexistent_id" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test cập nhật feedback không tồn tại
curl -X PATCH "http://localhost:3000/api/parents/feedback/nonexistent_id/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved"
  }'
```

## Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Lấy danh sách feedback thành công",
  "data": {
    "feedbacks": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    "Đánh giá tối đa là 5 sao"
  ]
}
```

## Tips

1. **Lưu token**: Lưu JWT token vào biến môi trường để dễ sử dụng
2. **Test từng bước**: Test từng API riêng biệt trước khi test workflow
3. **Kiểm tra response**: Luôn kiểm tra response để đảm bảo API hoạt động đúng
4. **Validation**: Test các trường hợp validation để đảm bảo API robust
5. **Error handling**: Test các trường hợp lỗi để đảm bảo error handling tốt 