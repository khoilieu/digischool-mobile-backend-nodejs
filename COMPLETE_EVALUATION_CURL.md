# 📝 cURL Đánh Giá Tiết Học Đầy Đủ

## ⚙️ **Setup Environment**

```bash
# Base URL
export BASE_URL="http://localhost:5000"
export API_URL="$BASE_URL/api/teacher-evaluations"

# Token giáo viên (thay bằng token thật)
export TEACHER_TOKEN="your_teacher_token_here"

# IDs (thay bằng ID thật từ database)
export LESSON_ID="675a1b2c3d4e5f6789012345"
export STUDENT1_ID="675a1b2c3d4e5f6789012350"
export STUDENT2_ID="675a1b2c3d4e5f6789012351"
export STUDENT3_ID="675a1b2c3d4e5f6789012352"
export STUDENT4_ID="675a1b2c3d4e5f6789012353"
export STUDENT5_ID="675a1b2c3d4e5f6789012354"
```

---

## 🎯 **Đánh Giá Đầy Đủ - Tất Cả Thông Tin**

### **Tạo Đánh Giá Hoàn Chỉnh**

```bash
curl -X POST "$API_URL/lessons/$LESSON_ID/evaluate" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
    "content": "Định nghĩa phương trình bậc hai, công thức nghiệm, biệt thức delta, mối quan hệ giữa nghiệm và hệ số, ứng dụng giải bài toán thực tế",
    "description": "Học sinh nắm vững lý thuyết phương trình bậc hai, biết cách giải và ứng dụng vào bài toán thực tế. Rèn luyện kỹ năng tính toán và phân tích.",
    
    "rating": "A+",
    "comments": "Tiết học rất thành công! Học sinh tham gia tích cực, hiểu sâu nội dung bài học. Phần thực hành giải bài tập được thực hiện tốt. Cần tiếp tục củng cố phần ứng dụng thực tế.",
    
    "evaluationDetails": {
      "studentEngagement": "excellent",
      "comprehensionLevel": "excellent",
      "objectiveCompletion": "fully",
      "classroomManagement": "excellent",
      "teachingMethod": "interactive",
      "materialUsage": "effective",
      "timeManagement": "appropriate",
      "homeworkAssignment": "assigned"
    },
    
    "absentStudents": [
      {
        "student": "'$STUDENT1_ID'",
        "isExcused": true,
        "reason": "Bệnh có giấy xin phép của bác sĩ - viêm họng cấp"
      },
      {
        "student": "'$STUDENT2_ID'",
        "isExcused": false,
        "reason": "Vắng không báo trước, không có lý do chính đáng"
      }
    ],
    
    "oralTests": [
      {
        "student": "'$STUDENT3_ID'",
        "score": 9.5,
        "question": "Giải phương trình x² - 5x + 6 = 0 và giải thích các bước thực hiện",
        "comment": "Trả lời xuất sắc! Nắm vững công thức, tính toán chính xác, giải thích rõ ràng từng bước. Có thể áp dụng linh hoạt."
      },
      {
        "student": "'$STUDENT4_ID'",
        "score": 7.5,
        "question": "Tìm điều kiện để phương trình ax² + bx + c = 0 có nghiệm",
        "comment": "Trả lời đúng về biệt thức delta nhưng chưa giải thích đầy đủ các trường hợp. Cần bổ sung kiến thức."
      },
      {
        "student": "'$STUDENT5_ID'",
        "score": 8.0,
        "question": "Cho phương trình x² - 4x + 3 = 0, tìm tổng và tích các nghiệm không giải phương trình",
        "comment": "Nắm vững định lý Vi-ét, áp dụng đúng công thức. Trình bày khoa học, tính toán chính xác."
      }
    ],
    
    "violations": [
      {
        "student": "'$STUDENT2_ID'",
        "description": "Sử dụng điện thoại trong giờ học để chơi game, không chú ý nghe bài",
        "type": "disruptive",
        "severity": "moderate",
        "action": "Thu điện thoại đến cuối giờ, nhắc nhở và ghi vào sổ đầu bài"
      },
      {
        "student": "'$STUDENT4_ID'",
        "description": "Đến lớp muộn 10 phút không có lý do chính đáng",
        "type": "late",
        "severity": "minor",
        "action": "Nhắc nhở về ý thức thời gian và trách nhiệm học tập"
      },
      {
        "student": "'$STUDENT5_ID'",
        "description": "Không chuẩn bị bài tập về nhà, không mang đủ dụng cụ học tập",
        "type": "unprepared",
        "severity": "minor",
        "action": "Nhắc nhở và yêu cầu bù bài tập vào buổi chiều"
      }
    ]
  }'
```

---

## 📊 **Response Mong Đợi**

```json
{
  "success": true,
  "message": "Tạo đánh giá tiết học thành công",
  "data": {
    "evaluationId": "675a1b2c3d4e5f6789012400",
    "lesson": {
      "lessonId": "L001",
      "scheduledDate": "2024-01-15T07:00:00.000Z",
      "actualDate": "2024-01-15T07:00:00.000Z",
      "topic": "Phương trình bậc hai"
    },
    "class": "12A1",
    "subject": {
      "name": "Toán học",
      "code": "MATH"
    },
    "lessonContent": {
      "curriculumLesson": "Tiết 25: Phương trình bậc hai và ứng dụng",
      "content": "Định nghĩa phương trình bậc hai, công thức nghiệm...",
      "description": "Học sinh nắm vững lý thuyết phương trình bậc hai..."
    },
    "evaluation": {
      "rating": "A+",
      "comments": "Tiết học rất thành công! Học sinh tham gia tích cực...",
      "details": {
        "studentEngagement": "excellent",
        "comprehensionLevel": "excellent",
        "objectiveCompletion": "fully",
        "classroomManagement": "excellent",
        "teachingMethod": "interactive",
        "materialUsage": "effective",
        "timeManagement": "appropriate",
        "homeworkAssignment": "assigned"
      }
    },
    "summary": {
      "totalPresent": 28,
      "totalAbsent": 2,
      "totalExcusedAbsent": 1,
      "totalOralTests": 3,
      "averageOralScore": 8.3,
      "totalViolations": 3
    },
    "absentStudents": [
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012350",
          "name": "Nguyễn Văn A",
          "studentId": "HS001"
        },
        "isExcused": true,
        "reason": "Bệnh có giấy xin phép của bác sĩ - viêm họng cấp",
        "recordedAt": "2024-01-15T07:30:00.000Z"
      },
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012351",
          "name": "Trần Thị B",
          "studentId": "HS002"
        },
        "isExcused": false,
        "reason": "Vắng không báo trước, không có lý do chính đáng",
        "recordedAt": "2024-01-15T07:30:00.000Z"
      }
    ],
    "oralTests": [
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012352",
          "name": "Lê Văn C",
          "studentId": "HS003"
        },
        "score": 9.5,
        "question": "Giải phương trình x² - 5x + 6 = 0 và giải thích các bước thực hiện",
        "comment": "Trả lời xuất sắc! Nắm vững công thức...",
        "testedAt": "2024-01-15T07:45:00.000Z"
      },
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012353",
          "name": "Phạm Thị D",
          "studentId": "HS004"
        },
        "score": 7.5,
        "question": "Tìm điều kiện để phương trình ax² + bx + c = 0 có nghiệm",
        "comment": "Trả lời đúng về biệt thức delta...",
        "testedAt": "2024-01-15T07:50:00.000Z"
      },
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012354",
          "name": "Hoàng Văn E",
          "studentId": "HS005"
        },
        "score": 8.0,
        "question": "Cho phương trình x² - 4x + 3 = 0, tìm tổng và tích các nghiệm không giải phương trình",
        "comment": "Nắm vững định lý Vi-ét...",
        "testedAt": "2024-01-15T07:55:00.000Z"
      }
    ],
    "violations": [
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012351",
          "name": "Trần Thị B",
          "studentId": "HS002"
        },
        "description": "Sử dụng điện thoại trong giờ học để chơi game...",
        "type": "disruptive",
        "severity": "moderate",
        "action": "Thu điện thoại đến cuối giờ...",
        "recordedAt": "2024-01-15T07:20:00.000Z"
      },
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012353",
          "name": "Phạm Thị D",
          "studentId": "HS004"
        },
        "description": "Đến lớp muộn 10 phút không có lý do chính đáng",
        "type": "late",
        "severity": "minor",
        "action": "Nhắc nhở về ý thức thời gian...",
        "recordedAt": "2024-01-15T07:10:00.000Z"
      },
      {
        "student": {
          "_id": "675a1b2c3d4e5f6789012354",
          "name": "Hoàng Văn E",
          "studentId": "HS005"
        },
        "description": "Không chuẩn bị bài tập về nhà...",
        "type": "unprepared",
        "severity": "minor",
        "action": "Nhắc nhở và yêu cầu bù bài tập...",
        "recordedAt": "2024-01-15T07:05:00.000Z"
      }
    ],
    "status": "draft",
    "createdAt": "2024-01-15T08:00:00.000Z"
  }
}
```

---

## 🔄 **Các Bước Tiếp Theo**

### **1. Thêm Học Sinh Vắng Khác**
```bash
export EVALUATION_ID="675a1b2c3d4e5f6789012400"

curl -X POST "$API_URL/$EVALUATION_ID/absent-students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT6_ID'",
    "isExcused": true,
    "reason": "Tham gia cuộc thi Olympic Toán cấp tỉnh"
  }'
```

### **2. Thêm Kiểm Tra Miệng Khác**
```bash
curl -X POST "$API_URL/$EVALUATION_ID/oral-tests" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT7_ID'",
    "score": 6.5,
    "question": "Phân tích đa thức x² - 9 thành nhân tử",
    "comment": "Biết cách làm nhưng tính toán chưa chính xác, cần luyện tập thêm"
  }'
```

### **3. Thêm Vi Phạm Khác**
```bash
curl -X POST "$API_URL/$EVALUATION_ID/violations" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "'$STUDENT8_ID'",
    "description": "Nói chuyện riêng trong giờ học, làm ảnh hưởng đến bạn cùng bàn",
    "type": "disruptive",
    "severity": "minor",
    "action": "Nhắc nhở và tách chỗ ngồi"
  }'
```

### **4. Cập Nhật Đánh Giá**
```bash
curl -X PUT "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": "A",
    "comments": "Cập nhật: Sau khi xem xét tổng thể, lớp học đạt mức tốt. Cần cải thiện thêm về kỷ luật lớp học.",
    "evaluationDetails": {
      "classroomManagement": "good",
      "studentEngagement": "good"
    }
  }'
```

### **5. Hoàn Thành Đánh Giá**
```bash
curl -X POST "$API_URL/$EVALUATION_ID/complete" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### **6. Nộp Đánh Giá**
```bash
curl -X POST "$API_URL/$EVALUATION_ID/submit" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### **7. Xem Kết Quả Cuối Cùng**
```bash
curl -X GET "$API_URL/$EVALUATION_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## 📋 **Các Trường Dữ Liệu Có Thể Có**

### **Rating Options:**
- `"A+"` - Xuất sắc
- `"A"` - Tốt
- `"B+"` - Khá tốt  
- `"B"` - Khá
- `"C"` - Trung bình

### **Violation Types:**
- `"late"` - Đến muộn
- `"disruptive"` - Gây rối
- `"unprepared"` - Không chuẩn bị
- `"disrespectful"` - Thiếu tôn trọng
- `"cheating"` - Gian lận
- `"other"` - Khác

### **Severity Levels:**
- `"minor"` - Nhẹ
- `"moderate"` - Vừa
- `"serious"` - Nghiêm trọng

### **Evaluation Details Options:**
- `"excellent"` - Xuất sắc
- `"good"` - Tốt
- `"average"` - Trung bình
- `"poor"` - Kém

---

**🎯 Đây là cURL command đầy đủ nhất để tạo đánh giá tiết học với tất cả thông tin!** 




<!-- curl tối thiếu -->


curl --location 'http://localhost:3000/api/teacher-evaluations/lessons/685cbf94f3b618a9802faf57/evaluate' \
--header 'Authorization: Bearer $TEACHER_TOKEN' \
--header 'Content-Type: application/json' \
--data '{
    "curriculumLesson": "Tiết 25: Phương trình bậc hai",
    "content": "Học về phương trình bậc hai và cách giải",
    "rating": "A"
}'