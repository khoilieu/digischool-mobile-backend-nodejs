# Xử lý lỗi Academic Year Mismatch

## Vấn đề

API `/api/schedules/:id` bị lỗi khi `academicYear` trong request không khớp với `academicYear` thực tế của schedule trong database.

## Nguyên nhân

- Schedule được tạo với năm học `2025-2026`
- API được gọi với năm học `2024-2025`
- Logic validation nghiêm ngặt không cho phép mismatch

## Giải pháp đã implement

### 1. Xử lý graceful thay vì throw error

Thay vì throw error, API sẽ trả về thông tin về academic year thực tế:

```json
{
  "success": false,
  "message": "Schedule belongs to academic year 2025-2026, but 2024-2025 was requested",
  "data": {
    "scheduleId": "685cbf81f3b618a9802fad69",
    "actualAcademicYear": "2025-2026",
    "requestedAcademicYear": "2024-2025",
    "suggestion": "Please use academicYear=2025-2026 in your request"
  },
  "error": {
    "type": "ACADEMIC_YEAR_MISMATCH",
    "message": "Schedule belongs to academic year 2025-2026, but 2024-2025 was requested",
    "actualAcademicYear": "2025-2026",
    "requestedAcademicYear": "2024-2025"
  }
}
```

### 2. API Helper để lấy academic year thực tế

Thêm endpoint mới: `GET /api/schedules/:id/academic-year`

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf81f3b618a9802fad69/academic-year" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "message": "Schedule academic year retrieved successfully",
  "data": {
    "scheduleId": "685cbf81f3b618a9802fad69",
    "academicYear": "2025-2026",
    "class": {
      "_id": "6855828a0672fea58658283b",
      "className": "12A1"
    }
  }
}
```

## Cách sử dụng cho Mobile App

### 1. Flow xử lý lỗi

```javascript
// Gọi API với academic year dự đoán
const response = await fetch(
  `/api/schedules/${scheduleId}?academicYear=2024-2025`
);

if (
  !response.data.success &&
  response.data.error?.type === "ACADEMIC_YEAR_MISMATCH"
) {
  // Lấy academic year thực tế
  const actualYear = response.data.data.actualAcademicYear;

  // Gọi lại API với academic year đúng
  const correctResponse = await fetch(
    `/api/schedules/${scheduleId}?academicYear=${actualYear}`
  );

  // Cập nhật UI với dữ liệu đúng
  updateScheduleUI(correctResponse.data);
}
```

### 2. Flow tối ưu hơn

```javascript
// Trước tiên lấy academic year thực tế
const yearResponse = await fetch(`/api/schedules/${scheduleId}/academic-year`);
const actualYear = yearResponse.data.academicYear;

// Sau đó gọi API chính với academic year đúng
const scheduleResponse = await fetch(
  `/api/schedules/${scheduleId}?academicYear=${actualYear}`
);
```

### 3. Cache academic year

```javascript
// Cache academic year để tránh gọi API nhiều lần
const getScheduleAcademicYear = async (scheduleId) => {
  const cacheKey = `schedule_${scheduleId}_academic_year`;

  // Kiểm tra cache trước
  let academicYear = localStorage.getItem(cacheKey);

  if (!academicYear) {
    // Gọi API nếu chưa có trong cache
    const response = await fetch(`/api/schedules/${scheduleId}/academic-year`);
    academicYear = response.data.academicYear;

    // Lưu vào cache
    localStorage.setItem(cacheKey, academicYear);
  }

  return academicYear;
};
```

## Test Cases

### 1. Test academic year mismatch

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf81f3b618a9802fad69?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Trả về error message với thông tin academic year thực tế

### 2. Test lấy academic year thực tế

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf81f3b618a9802fad69/academic-year" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Trả về academic year thực tế của schedule

### 3. Test với academic year đúng

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf81f3b618a9802fad69?academicYear=2025-2026" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Trả về dữ liệu schedule bình thường

## Migration Strategy

### Phase 1: Immediate Fix

- Deploy code mới với xử lý graceful
- Mobile app sẽ nhận được thông tin hữu ích thay vì error

### Phase 2: Optimize Mobile App

- Implement flow lấy academic year thực tế
- Cache academic year để tránh gọi API nhiều lần
- Update UI để handle academic year mismatch

### Phase 3: Data Cleanup (Optional)

- Kiểm tra và chuẩn hóa academic year trong database
- Đảm bảo consistency giữa các schedules

## Best Practices

1. **Luôn kiểm tra academic year trước khi gọi API chính**
2. **Cache academic year để tối ưu performance**
3. **Handle error gracefully trên mobile app**
4. **Hiển thị thông tin hữu ích cho user khi có lỗi**
5. **Log academic year mismatch để monitoring**

## Monitoring

Theo dõi các metrics sau:

- Số lượng academic year mismatch
- Performance của API helper
- User experience khi gặp lỗi
- Cache hit rate cho academic year
