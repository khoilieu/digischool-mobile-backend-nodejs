# API: Lấy Danh Sách Năm Học và Tuần Có Sẵn

## Endpoint
```
GET /api/schedules/available-academic-years-weeks
```

## Mô tả
API này trả về danh sách tất cả năm học và tuần có sẵn trong database, bao gồm thông tin chi tiết về từng tuần và số lớp có sẵn.

## Response

### Success Response (200)
```json
{
  "success": true,
  "message": "Available academic years and weeks retrieved successfully",
  "data": {
    "currentAcademicYear": {
      "name": "2025-2026",
      "startDate": "2025-08-11T00:00:00.000Z",
      "endDate": "2026-05-30T00:00:00.000Z",
      "totalWeeks": 38,
      "isActive": true
    },
    "availableAcademicYears": [
      {
        "name": "2025-2026",
        "academicYearId": "687a454e767af6be12fb203d",
        "totalWeeks": 38,
        "isActive": true,
        "startDate": "2025-08-11T00:00:00.000Z",
        "endDate": "2026-05-30T00:00:00.000Z",
        "totalAvailableWeeks": 1,
        "totalClasses": 4,
        "availableWeeks": [
          {
            "weekNumber": 1,
            "classCount": 4
          }
        ],
        "weekNumbers": [1]
      }
    ],
    "allAcademicYears": [...],
    "summary": {
      "totalAcademicYears": 1,
      "totalAvailableWeeks": 1,
      "totalClasses": 4
    }
  }
}
```

## Các trường dữ liệu

### `currentAcademicYear`
- Năm học hiện tại đang hoạt động
- `null` nếu không có năm học nào active

### `availableAcademicYears`
- Danh sách năm học có dữ liệu thời khóa biểu
- `totalAvailableWeeks`: Tổng số tuần có sẵn
- `totalClasses`: Tổng số lớp có dữ liệu
- `weekNumbers`: Array các số tuần có sẵn (đã sắp xếp)

### `summary`
- Tổng quan về toàn bộ dữ liệu
- `totalAcademicYears`: Tổng số năm học
- `totalAvailableWeeks`: Tổng số tuần có sẵn
- `totalClasses`: Tổng số lớp

## Sử dụng
API này thường được sử dụng để:
- Hiển thị dropdown chọn năm học và tuần
- Kiểm tra dữ liệu có sẵn trước khi tạo thời khóa biểu
- Hiển thị thống kê tổng quan về dữ liệu thời khóa biểu

## Lưu ý
- Không cần authentication
- Trả về dữ liệu real-time từ database
- Tuần được sắp xếp theo thứ tự tăng dần
- Năm học được sắp xếp theo thứ tự mới nhất trước
