# Tóm tắt Module Phụ Huynh

## 🎯 Mục tiêu
Tạo module phụ huynh với các API theo yêu cầu:
1. Xem danh sách con của họ
2. Xem thời khóa biểu của con (giống như con họ thấy)
3. Gửi góp ý cho hệ thống với form rating và mô tả

## 📁 Cấu trúc Module

```
src/modules/parents/
├── models/
│   └── feedback.model.js          # Model cho feedback
├── controllers/
│   └── parent.controller.js       # Controller xử lý request
├── services/
│   └── parent.service.js          # Business logic
├── middleware/
│   └── parent.validation.js       # Validation middleware
├── routes/
│   └── parent.routes.js           # API routes
├── tutorials/
│   ├── parent-api-tutorial.md     # Hướng dẫn chi tiết
│   └── curl-examples.md           # Ví dụ test với curl
├── README.md                      # Tài liệu API
└── SUMMARY.md                     # File này
```

## 🔗 API Endpoints

### 1. Lấy danh sách con
- **Method**: `GET`
- **URL**: `/api/parents/children`
- **Auth**: JWT Token + Role parents
- **Response**: Danh sách con với thông tin lớp, giáo viên chủ nhiệm

### 2. Xem thời khóa biểu của con
- **Method**: `GET`
- **URL**: `/api/parents/children/:childId/schedule`
- **Params**: `academicYear`, `startOfWeek`, `endOfWeek`
- **Auth**: JWT Token + Role parents
- **Response**: Thời khóa biểu giống như học sinh thấy

### 3. Gửi góp ý
- **Method**: `POST`
- **URL**: `/api/parents/feedback`
- **Body**: `{ rating: 1-5, description: string }`
- **Auth**: JWT Token + Role parents
- **Validation**: Rating 1-5, description 10-1000 ký tự

### 4. Lấy danh sách góp ý
- **Method**: `GET`
- **URL**: `/api/parents/feedback`
- **Query**: `page`, `limit`
- **Auth**: JWT Token + Role parents
- **Response**: Danh sách feedback với pagination

## 🔒 Bảo mật & Phân quyền

### Middleware áp dụng:
1. **verifyToken**: Xác thực JWT token
2. **checkParentRole**: Kiểm tra role `parents`
3. **validateFeedback**: Validate dữ liệu feedback
4. **validateScheduleQuery**: Validate query parameters
5. **validatePagination**: Validate pagination

### Kiểm tra quyền:
- Phụ huynh chỉ có thể xem thông tin con mình
- Phụ huynh chỉ có thể xem thời khóa biểu của con mình
- Phụ huynh chỉ có thể gửi và xem feedback của mình

## 📊 Database Schema

### Feedback Model:
```javascript
{
  user: ObjectId,           // Reference to User (parent)
  rating: Number,           // 1-5 stars
  description: String,      // 10-1000 characters
  status: String,           // pending, reviewed, resolved
  adminResponse: String,    // Optional admin response
  respondedBy: ObjectId,    // Reference to admin user
  respondedAt: Date,        // When admin responded
  timestamps: true
}
```

### User Model (đã có sẵn):
```javascript
{
  role: ['parents'],        // Role array includes parents
  children: [ObjectId],     // Array of child user IDs
  // ... other fields
}
```

## 🧪 Testing

### Files test:
- `tutorials/curl-examples.md`: Ví dụ curl commands
- `tutorials/parent-api-tutorial.md`: Hướng dẫn chi tiết

### Test cases:
1. ✅ Lấy danh sách con thành công
2. ✅ Xem thời khóa biểu của con thành công
3. ✅ Gửi feedback thành công
4. ✅ Lấy danh sách feedback thành công
5. ✅ Validation errors (rating, description)
6. ✅ Authentication errors (no token, invalid token)
7. ✅ Authorization errors (wrong role, wrong child)
8. ✅ Missing parameters errors

## 🚀 Tích hợp

### Routes đã được thêm vào:
```javascript
// src/routes/index.js
router.use("/parents", parentRoutes);
```

### Dependencies sử dụng:
- `joi`: Validation (đã có sẵn)
- `mongoose`: Database operations (đã có sẵn)
- `jsonwebtoken`: Authentication (đã có sẵn)

## 📝 Validation Rules

### Feedback:
- `rating`: Số nguyên 1-5 (bắt buộc)
- `description`: Chuỗi 10-1000 ký tự (bắt buộc)

### Schedule Query:
- `academicYear`: String (bắt buộc)
- `startOfWeek`: Date ISO format YYYY-MM-DD (bắt buộc)
- `endOfWeek`: Date ISO format YYYY-MM-DD (bắt buộc, phải sau startOfWeek)

### Pagination:
- `page`: Số nguyên >= 1 (mặc định: 1)
- `limit`: Số nguyên 1-100 (mặc định: 10)

## 🎨 Response Format

### Success Response:
```json
{
  "success": true,
  "message": "Thông báo thành công",
  "data": { ... }
}
```

### Error Response:
```json
{
  "success": false,
  "message": "Thông báo lỗi",
  "errors": ["Chi tiết lỗi 1", "Chi tiết lỗi 2"]
}
```

## 🔄 Workflow

### 1. Xem danh sách con:
```
Parent Login → Get Children → View Child Info + Class + Teacher
```

### 2. Xem thời khóa biểu:
```
Parent Login → Select Child → Get Schedule → View Weekly Schedule
```

### 3. Gửi góp ý:
```
Parent Login → Fill Feedback Form → Submit → Save to Database
```

### 4. Xem góp ý:
```
Parent Login → Get My Feedbacks → View List with Pagination
```

## 📈 Tính năng mở rộng

### Có thể thêm trong tương lai:
1. **Admin Response**: Admin trả lời feedback
2. **Feedback Categories**: Phân loại góp ý
3. **Email Notifications**: Thông báo qua email
4. **Feedback Analytics**: Thống kê feedback
5. **Child Performance**: Xem điểm số, đánh giá của con
6. **Communication**: Chat với giáo viên

## ✅ Hoàn thành

- [x] Model Feedback
- [x] Parent Service
- [x] Parent Controller
- [x] Validation Middleware
- [x] Routes
- [x] Integration với main routes
- [x] Documentation
- [x] Tutorial
- [x] CURL examples
- [x] Security & Authorization
- [x] Error handling

## 🎉 Kết quả

Module phụ huynh đã được tạo hoàn chỉnh với:
- **4 API endpoints** theo yêu cầu
- **Bảo mật** và phân quyền đầy đủ
- **Validation** nghiêm ngặt
- **Documentation** chi tiết
- **Testing examples** sẵn sàng sử dụng
- **Tích hợp** hoàn chỉnh với hệ thống hiện tại

Module sẵn sàng để deploy và sử dụng! 🚀 