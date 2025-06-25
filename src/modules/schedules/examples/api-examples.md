# Schedule API Examples

## 1. Khởi tạo thời khóa biểu cho khối 12 năm học 2023-2024

```bash
# Request
curl -X POST http://localhost:3000/api/schedules/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "academicYear": "2023-2024",
    "gradeLevel": 12,
    "semester": 1
  }'

# Response
{
  "success": true,
  "message": "Schedules initialized successfully",
  "data": {
    "academicYear": "2023-2024",
    "gradeLevel": 12,
    "semester": 1,
    "totalClasses": 6,
    "results": [
      {
        "class": "12A1",
        "status": "created",
        "scheduleId": "64f8b9c123456789abcdef01",
        "totalPeriods": 33
      },
      {
        "class": "12A2",
        "status": "created", 
        "scheduleId": "64f8b9c123456789abcdef02",
        "totalPeriods": 33
      },
      {
        "class": "12A3",
        "status": "created",
        "scheduleId": "64f8b9c123456789abcdef03", 
        "totalPeriods": 33
      }
    ]
  }
}
```

## 2. Xem thời khóa biểu lớp 12A4

```bash
# Request
curl "http://localhost:3000/api/schedules/class?className=12A4&academicYear=2023-2024&weekNumber=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef04",
      "name": "12A4", 
      "academicYear": "2023-2024"
    },
    "schedule": {
      "id": "64f8b9c123456789abcdef05",
      "weekNumber": 1,
      "semester": 1,
      "totalPeriods": 33,
      "status": "active",
      "dailySchedule": [
        {
          "dayOfWeek": 2,
          "dayName": "Monday",
          "periods": [
            {
              "periodNumber": 1,
              "session": "morning",
              "timeStart": "07:00",
              "timeEnd": "07:45",
              "subject": {
                "id": "64f8b9c123456789abcdef06",
                "name": "Toán học",
                "code": "MATH12",
                "department": "mathematics"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef07",
                "name": "Trần Thị Lan",
                "email": "tran.lan@school.edu.vn"
              }
            },
            {
              "periodNumber": 2,
              "session": "morning", 
              "timeStart": "07:50",
              "timeEnd": "08:35",
              "subject": {
                "id": "64f8b9c123456789abcdef08",
                "name": "Vật lý",
                "code": "PHYS12",
                "department": "physics"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef09",
                "name": "Lê Văn Hùng",
                "email": "le.hung@school.edu.vn"
              }
            },
            {
              "periodNumber": 3,
              "session": "morning",
              "timeStart": "08:40", 
              "timeEnd": "09:25",
              "subject": {
                "id": "64f8b9c123456789abcdef10",
                "name": "Hóa học",
                "code": "CHEM12",
                "department": "chemistry"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef11",
                "name": "Phạm Thị Mai",
                "email": "pham.mai@school.edu.vn"
              }
            },
            {
              "periodNumber": 4,
              "session": "morning",
              "timeStart": "09:45",
              "timeEnd": "10:30",
              "subject": {
                "id": "64f8b9c123456789abcdef12",
                "name": "Ngữ văn",
                "code": "LIT12", 
                "department": "literature"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef13",
                "name": "Hoàng Văn Nam",
                "email": "hoang.nam@school.edu.vn"
              }
            },
            {
              "periodNumber": 5,
              "session": "morning",
              "timeStart": "10:35",
              "timeEnd": "11:20",
              "subject": {
                "id": "64f8b9c123456789abcdef14",
                "name": "Tiếng Anh",
                "code": "ENG12",
                "department": "english"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef15",
                "name": "Nguyễn Thị Hoa",
                "email": "nguyen.hoa@school.edu.vn"
              }
            },
            {
              "periodNumber": 6,
              "session": "afternoon",
              "timeStart": "12:30",
              "timeEnd": "13:15",
              "subject": {
                "id": "64f8b9c123456789abcdef16",
                "name": "Sinh học",
                "code": "BIO12",
                "department": "biology"
              },
              "teacher": {
                "id": "64f8b9c123456789abcdef17",
                "name": "Vũ Thị Nga",
                "email": "vu.nga@school.edu.vn"
              }
            }
          ]
        },
        {
          "dayOfWeek": 3,
          "dayName": "Tuesday",
          "periods": [
            // Similar structure for Tuesday...
          ]
        }
        // ... Continue for Wednesday through Saturday
      ]
    }
  }
}
```

## 3. Lấy danh sách thời khóa biểu với bộ lọc

```bash
# Request - Lấy tất cả thời khóa biểu khối 12 năm 2023-2024
curl "http://localhost:3000/api/schedules?academicYear=2023-2024&gradeLevel=12&status=active&page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "64f8b9c123456789abcdef01",
        "class": {
          "id": "64f8b9c123456789abcdef18",
          "name": "12A1",
          "academicYear": "2023-2024"
        },
        "semester": 1,
        "weekNumber": 1,
        "totalPeriods": 33,
        "status": "active",
        "createdAt": "2023-09-07T03:30:00.000Z",
        "updatedAt": "2023-09-07T03:30:00.000Z"
      },
      {
        "id": "64f8b9c123456789abcdef02",
        "class": {
          "id": "64f8b9c123456789abcdef19", 
          "name": "12A2",
          "academicYear": "2023-2024"
        },
        "semester": 1,
        "weekNumber": 1,
        "totalPeriods": 33,
        "status": "active",
        "createdAt": "2023-09-07T03:30:00.000Z",
        "updatedAt": "2023-09-07T03:30:00.000Z"
      }
    ],
    "totalCount": 6,
    "totalPages": 1,
    "currentPage": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

## 4. Cập nhật trạng thái thời khóa biểu

```bash
# Request - Chuyển từ draft sang active
curl -X PUT http://localhost:3000/api/schedules/64f8b9c123456789abcdef01/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "status": "active"
  }'

# Response
{
  "success": true,
  "message": "Schedule status updated successfully",
  "data": {
    "id": "64f8b9c123456789abcdef01",
    "status": "active",
    "updatedAt": "2023-09-07T04:00:00.000Z"
  }
}
```

## 5. Thống kê thời khóa biểu

```bash
# Request
curl "http://localhost:3000/api/schedules/stats?academicYear=2023-2024" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response  
{
  "success": true,
  "data": {
    "academicYear": "2023-2024",
    "totalSchedules": 36,
    "statusBreakdown": {
      "active": 30,
      "draft": 4,
      "archived": 2
    },
    "gradeBreakdown": {
      "10": 12,
      "11": 12, 
      "12": 12
    },
    "semesterBreakdown": {
      "1": 18,
      "2": 18
    }
  }
}
```

## 6. Lấy danh sách lớp theo khối (Helper API)

```bash
# Request
curl "http://localhost:3000/api/schedules/helper/classes?academicYear=2023-2024&gradeLevel=12" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "success": true,
  "data": {
    "academicYear": "2023-2024",
    "gradeLevel": 12,
    "totalClasses": 6,
    "classes": [
      {
        "id": "64f8b9c123456789abcdef18",
        "className": "12A1",
        "homeroomTeacher": {
          "id": "64f8b9c123456789abcdef20",
          "name": "Trần Văn Bình",
          "email": "tran.binh@school.edu.vn"
        }
      },
      {
        "id": "64f8b9c123456789abcdef19", 
        "className": "12A2",
        "homeroomTeacher": {
          "id": "64f8b9c123456789abcdef21",
          "name": "Lê Thị Cúc",
          "email": "le.cuc@school.edu.vn"
        }
      }
    ]
  }
}
```

## Error Examples

### 1. Validation Error

```bash
# Request với dữ liệu không hợp lệ
curl -X POST http://localhost:3000/api/schedules/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "academicYear": "2023",
    "gradeLevel": 15
  }'

# Response
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "academicYear",
      "message": "Academic year must be in format YYYY-YYYY (e.g., 2023-2024)",
      "value": "2023"
    },
    {
      "field": "gradeLevel", 
      "message": "Grade level must be between 1 and 12",
      "value": 15
    }
  ]
}
```

### 2. Not Found Error

```bash
# Request với lớp không tồn tại
curl "http://localhost:3000/api/schedules/class?className=15A1&academicYear=2023-2024" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response
{
  "success": false,
  "message": "Failed to get class schedule: Class 15A1 not found in academic year 2023-2024"
}
```

### 3. Authorization Error

```bash
# Request không có token
curl -X POST http://localhost:3000/api/schedules/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": "2023-2024",
    "gradeLevel": 12
  }'

# Response
{
  "success": false,
  "message": "No token provided"
}
```

## Postman Collection

```json
{
  "info": {
    "name": "EcoSchool Schedule API",
    "description": "API collection for Schedule management"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "token",
      "value": "{{jwt_token}}"
    }
  ],
  "item": [
    {
      "name": "Initialize Schedules",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type", 
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"academicYear\": \"2023-2024\",\n  \"gradeLevel\": 12,\n  \"semester\": 1\n}"
        },
        "url": "{{baseUrl}}/schedules/initialize"
      }
    },
    {
      "name": "Get Class Schedule",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization", 
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/schedules/class?className=12A4&academicYear=2023-2024&weekNumber=1",
          "host": ["{{baseUrl}}"],
          "path": ["schedules", "class"],
          "query": [
            {
              "key": "className",
              "value": "12A4"
            },
            {
              "key": "academicYear", 
              "value": "2023-2024"
            },
            {
              "key": "weekNumber",
              "value": "1"
            }
          ]
        }
      }
    }
  ]
}
``` 