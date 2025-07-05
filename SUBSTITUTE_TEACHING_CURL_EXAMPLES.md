# Substitute Teaching API - CURL Examples (Updated Logic)

## 🔄 **LOGIC MỚI: DẠNG BÙ THAY VÌ THAY THẾ**

### Test Scenario: Giáo viên dạy bù cùng với giáo viên gốc

## 1. Lấy danh sách giáo viên có thể dạy bù (Updated Logic)

```bash
curl -X GET "http://localhost:3000/api/schedules/substitute-request/available-teachers/685cbfc1f3b618a9802fb573" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (New Logic):**
```json
{
  "success": true,
  "message": "Available teachers retrieved successfully",
  "data": [
    {
      "_id": "teacher_id_1",
      "name": "Nguyễn Thị B",
      "email": "teacher.b@school.com",
      "subject": "subject_id_hoa",
      "subjects": ["subject_id_hoa"],
      "hasConflict": false,
      "conflictLesson": null
    },
    {
      "_id": "teacher_id_2", 
      "name": "Trần Văn C",
      "email": "teacher.c@school.com",
      "subject": "subject_id_hoa",
      "subjects": ["subject_id_hoa", "subject_id_sinh"],
      "hasConflict": true,
      "conflictLesson": {
        "className": "12A3",
        "subjectName": "Hóa học",
        "lessonId": "LESSON_20241220_003"
      }
    },
    {
      "_id": "teacher_id_3",
      "name": "Lê Thị D", 
      "email": "teacher.d@school.com",
      "subject": "subject_id_hoa",
      "subjects": ["subject_id_hoa"],
      "hasConflict": false,
      "conflictLesson": null
    }
  ]
}
```

**Giải thích:**
- **hasConflict: false** - Giáo viên rảnh, có thể dạy bù bình thường
- **hasConflict: true** - Giáo viên đang dạy tiết khác cùng thời gian, nhưng vẫn có thể được chọn
- **conflictLesson** - Thông tin tiết học xung đột (nếu có)

## 2. Tạo Substitute Request (có thể chọn giáo viên có xung đột)

```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "lessonId": "685cbfc1f3b618a9802fb573",
    "candidateTeacherIds": ["teacher_id_1", "teacher_id_2", "teacher_id_3"],
    "reason": "Cần hỗ trợ thêm giáo viên để dạy bù cho học sinh yếu. Có thể chọn giáo viên đang dạy tiết khác nếu cần thiết."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Substitute request created successfully",
  "data": {
    "requestId": "SUB_20241220_ABC123",
    "lesson": {
      "teacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.com"
      },
      "substituteTeacher": null
    },
    "candidateTeachers": [
      {
        "teacher": {
          "_id": "teacher_id_1",
          "name": "Nguyễn Thị B",
          "email": "teacher.b@school.com"
        },
        "status": "pending"
      },
      {
        "teacher": {
          "_id": "teacher_id_2",
          "name": "Trần Văn C", 
          "email": "teacher.c@school.com"
        },
        "status": "pending"
      },
      {
        "teacher": {
          "_id": "teacher_id_3",
          "name": "Lê Thị D",
          "email": "teacher.d@school.com"
        },
        "status": "pending"
      }
    ]
  }
}
```

## 3. Approve Request (Giáo viên dạy bù chấp nhận)

```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request/SUB_20241220_ABC123/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUTE_TEACHER_TOKEN" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Substitute request approved successfully",
  "data": {
    "requestId": "SUB_20241220_ABC123",
    "status": "approved",
    "lesson": {
      "teacher": {
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.com"
      },
      "substituteTeacher": {
        "name": "Trần Thị B",
        "email": "teacher.b@school.com"
      }
    }
  }
}
```

## 4. Kiểm tra Lesson có cả hai giáo viên

```bash
curl -X GET "http://localhost:3000/api/schedules/lessons/LESSON_ID_HERE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lesson": {
      "_id": "LESSON_ID_HERE",
      "teacher": {
        "_id": "TEACHER_A_ID",
        "name": "Nguyễn Văn A",
        "email": "teacher.a@school.com"
      },
      "substituteTeacher": {
        "_id": "TEACHER_B_ID", 
        "name": "Trần Thị B",
        "email": "teacher.b@school.com"
      },
      "subject": "Toán",
      "class": "12A1",
      "scheduledDate": "2024-12-21T00:00:00.000Z",
      "timeSlot": {
        "period": 1,
        "startTime": "07:00",
        "endTime": "07:45"
      }
    }
  }
}
```

## 5. Kiểm tra Schedule của Giáo viên gốc

```bash
curl -X GET "http://localhost:3000/api/schedules/teacher/TEACHER_A_ID?startOfWeek=2024-12-16&endOfWeek=2024-12-22" \
  -H "Authorization: Bearer TEACHER_A_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lessons": [
      {
        "_id": "LESSON_ID_HERE",
        "teacher": {
          "_id": "TEACHER_A_ID",
          "name": "Nguyễn Văn A"
        },
        "substituteTeacher": {
          "_id": "TEACHER_B_ID",
          "name": "Trần Thị B"
        },
        "role": "main_teacher",
        "subject": "Toán",
        "class": "12A1"
      }
    ]
  }
}
```

## 6. Kiểm tra Schedule của Giáo viên dạy bù

```bash
curl -X GET "http://localhost:3000/api/schedules/teacher/TEACHER_B_ID?startOfWeek=2024-12-16&endOfWeek=2024-12-22" \
  -H "Authorization: Bearer TEACHER_B_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "lessons": [
      {
        "_id": "LESSON_ID_HERE",
        "teacher": {
          "_id": "TEACHER_A_ID",
          "name": "Nguyễn Văn A"
        },
        "substituteTeacher": {
          "_id": "TEACHER_B_ID",
          "name": "Trần Thị B"
        },
        "role": "substitute_teacher",
        "subject": "Toán",
        "class": "12A1"
      }
    ]
  }
}
```

## 7. Kiểm tra Schedule của Lớp học

```bash
curl -X GET "http://localhost:3000/api/schedules/class/12A1?academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "weeklySchedule": [
      {
        "dayOfWeek": 2,
        "dayName": "Monday",
        "date": "2024-12-16",
        "periods": [
          {
            "periodNumber": 1,
            "lesson": {
              "_id": "LESSON_ID_HERE",
              "teacher": {
                "name": "Nguyễn Văn A",
                "email": "teacher.a@school.com"
              },
              "substituteTeacher": {
                "name": "Trần Thị B", 
                "email": "teacher.b@school.com"
              },
              "subject": "Toán",
              "teachingNote": "Cả hai giáo viên sẽ cùng dạy để hỗ trợ học sinh"
            }
          }
        ]
      }
    ]
  }
}
```

## 8. Test Email Notifications

### Kiểm tra email đã gửi cho request
```bash
curl -X GET "http://localhost:3000/api/schedules/substitute-request/SUB_20241220_ABC123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "emailsSent": [
      {
        "type": "request",
        "subject": "Yêu cầu dạy bù - EcoSchool",
        "recipients": ["teacher.b@school.com", "manager@school.com"]
      },
      {
        "type": "approval", 
        "subject": "Yêu cầu dạy bù đã được chấp nhận - EcoSchool",
        "recipients": ["teacher.a@school.com", "teacher.b@school.com", "manager@school.com"]
      },
      {
        "type": "student_notification",
        "subject": "Thông báo có giáo viên dạy bù - EcoSchool",
        "recipients": ["student1@school.com", "student2@school.com"]
      }
    ]
  }
}
```

## 9. Test Reject Request

```bash
curl -X POST "http://localhost:3000/api/schedules/substitute-request/SUB_20241220_ABC123/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUBSTITUTE_TEACHER_TOKEN" \
  -d '{
    "reason": "Tôi đã có lịch dạy khác vào thời gian này"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Substitute request rejected successfully",
  "data": {
    "requestId": "SUB_20241220_ABC123",
    "status": "rejected",
    "lesson": {
      "teacher": {
        "name": "Nguyễn Văn A"
      },
      "substituteTeacher": null
    }
  }
}
```

## 10. Test Statistics

```bash
curl -X GET "http://localhost:3000/api/schedules/substitute-request/stats?academicYear=2024-2025" \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 15,
    "approvedRequests": 12,
    "rejectedRequests": 2,
    "pendingRequests": 1,
    "approvalRate": 80.0,
    "topRequestingTeachers": [
      {
        "teacher": "Nguyễn Văn A",
        "requestCount": 5
      }
    ],
    "topSubstituteTeachers": [
      {
        "teacher": "Trần Thị B",
        "substituteCount": 8
      }
    ]
  }
}
```

---

## 📝 **Key Differences from Old Logic**

### ✅ **New Logic (Substitute Teaching)**
- Giáo viên gốc: Vẫn có trong `teacher` field
- Giáo viên dạy bù: Được thêm vào `substituteTeacher` field  
- Cả hai giáo viên đều thấy lesson trong schedule
- Email nói về "dạy bù" thay vì "thay thế"
- **Available Teachers API**: Trả về TẤT CẢ giáo viên cùng bộ môn, bao gồm cả những giáo viên có xung đột thời gian
- **Conflict Information**: Hiển thị thông tin xung đột để người dùng quyết định

### ❌ **Old Logic (Replacement)**
- Giáo viên gốc: Bị thay thế khỏi `teacher` field
- Giáo viên mới: Trở thành `teacher` chính
- Mất thông tin về giáo viên gốc
- Email nói về "thay thế"
- **Available Teachers API**: Chỉ trả về giáo viên không có xung đột thời gian
- **Conflict Information**: Loại bỏ hoàn toàn giáo viên có xung đột

### 🎯 **Testing Focus**
1. Kiểm tra lesson có cả hai teacher fields
2. Kiểm tra cả hai giáo viên đều thấy lesson
3. Kiểm tra email content đúng logic mới
4. Kiểm tra student nhận thông tin đầy đủ
5. **Kiểm tra Available Teachers API trả về đầy đủ giáo viên**
6. **Kiểm tra thông tin xung đột được hiển thị chính xác**

### 🔄 **Migration Notes**
- Existing lessons with `teacher` field vẫn hoạt động bình thường
- Lessons được approve sẽ có thêm `substituteTeacher` field
- Schedule queries đã được cập nhật để query cả hai fields
- Email templates đã được cập nhật với terminology mới

### 🚀 **Enhanced Features**
- **Conflict-aware selection**: Hiển thị thông tin xung đột để người dùng đưa ra quyết định tốt hơn
- **Flexible teacher assignment**: Cho phép chọn giáo viên có xung đột nếu thực sự cần thiết
- **Comprehensive teacher information**: Bao gồm thông tin về subjects và availability
- **Better user experience**: Người dùng có thể thấy được tất cả tùy chọn thay vì bị giới hạn