# Test Optimized Schedule API

## Test Cases cho API `/api/schedules/:id`

### 1. Test cơ bản - Lấy thông tin schedule với academicYear

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 200
- Chỉ chứa thông tin cơ bản của schedule
- Không có lessons chi tiết
- Có statistics tổng quan

### 2. Test lấy schedule theo tuần cụ thể

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&weekNumber=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 200
- Chỉ chứa dữ liệu tuần 1
- Có lessonsByDay cho từng ngày
- Statistics chỉ cho tuần 1

### 3. Test lấy schedule theo khoảng ngày

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 200
- Chỉ chứa dữ liệu trong khoảng ngày
- Có lessonsByDay cho từng ngày
- Statistics cho khoảng ngày

### 4. Test không bao gồm lessons

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&includeLessons=false" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 200
- Không có weeklySchedules chi tiết
- Chỉ có thông tin cơ bản

### 5. Test bao gồm academic year details

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&includeDetails=true&weekNumber=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 200
- Có academicYearDetails
- Có lessons cho tuần 1

## Error Test Cases

### 1. Test thiếu academicYear (required)

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 400
- Message: "academicYear parameter is required"

### 2. Test academicYear không khớp

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2023-2024" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 400
- Message: "Schedule does not match academic year 2023-2024"

### 3. Test weekNumber không hợp lệ

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&weekNumber=50" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 400
- Message: "weekNumber must be a number between 1 and 38"

### 4. Test date format không hợp lệ

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&startOfWeek=invalid-date&endOfWeek=2024-08-18" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 400
- Message: "startOfWeek and endOfWeek must be valid dates (YYYY-MM-DD format)"

### 5. Test startOfWeek > endOfWeek

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&startOfWeek=2024-08-18&endOfWeek=2024-08-12" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 400
- Message: "startOfWeek must be before or equal to endOfWeek"

### 6. Test schedule không tồn tại

```bash
curl -X GET "http://localhost:3000/api/schedules/nonexistent-id?academicYear=2024-2025" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

- Status: 404
- Message: "Schedule not found"

## Performance Test

### 1. So sánh kích thước response

**Trước khi tối ưu:**

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -w "Size: %{size_download} bytes\nTime: %{time_total} seconds\n" \
  -o /dev/null
```

**Sau khi tối ưu:**

```bash
curl -X GET "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&weekNumber=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -w "Size: %{size_download} bytes\nTime: %{time_total} seconds\n" \
  -o /dev/null
```

### 2. Test với Postman

**Collection JSON:**

```json
{
  "info": {
    "name": "Optimized Schedule API Tests",
    "description": "Test cases for optimized schedule API"
  },
  "item": [
    {
      "name": "Get Basic Schedule Info",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer YOUR_TOKEN"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "schedules", "685cbf84f3b618a9802fad74"],
          "query": [
            {
              "key": "academicYear",
              "value": "2024-2025"
            }
          ]
        }
      }
    },
    {
      "name": "Get Schedule by Week",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer YOUR_TOKEN"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&weekNumber=1",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "schedules", "685cbf84f3b618a9802fad74"],
          "query": [
            {
              "key": "academicYear",
              "value": "2024-2025"
            },
            {
              "key": "weekNumber",
              "value": "1"
            }
          ]
        }
      }
    },
    {
      "name": "Get Schedule by Date Range",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer YOUR_TOKEN"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/schedules/685cbf84f3b618a9802fad74?academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "schedules", "685cbf84f3b618a9802fad74"],
          "query": [
            {
              "key": "academicYear",
              "value": "2024-2025"
            },
            {
              "key": "startOfWeek",
              "value": "2024-08-12"
            },
            {
              "key": "endOfWeek",
              "value": "2024-08-18"
            }
          ]
        }
      }
    }
  ]
}
```

## Mobile App Test Scenarios

### 1. Scenario: User chọn năm học 2024-2025

- API call: `/api/schedules/:id?academicYear=2024-2025`
- Expected: Load nhanh, chỉ hiển thị thông tin cơ bản

### 2. Scenario: User chọn tuần 1

- API call: `/api/schedules/:id?academicYear=2024-2025&weekNumber=1`
- Expected: Load tuần 1 với lessons chi tiết

### 3. Scenario: User chọn khoảng ngày 12/08 - 18/08

- API call: `/api/schedules/:id?academicYear=2024-2025&startOfWeek=2024-08-12&endOfWeek=2024-08-18`
- Expected: Load dữ liệu trong khoảng ngày

### 4. Scenario: User scroll qua các tuần

- API calls: Tuần 1, 2, 3... (lazy loading)
- Expected: Cache từng tuần, load mượt mà

## Validation Checklist

- [ ] API trả về đúng format response
- [ ] Filter academicYear hoạt động đúng
- [ ] Filter weekNumber hoạt động đúng
- [ ] Filter date range hoạt động đúng
- [ ] Error handling đầy đủ
- [ ] Performance cải thiện đáng kể
- [ ] Mobile app có thể handle response mới
- [ ] Backward compatibility (nếu cần)
