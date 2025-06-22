# API Chi Tiết Tiết Học - Period Details API

## Tổng Quan

API này cho phép xem chi tiết đầy đủ của một tiết học cụ thể trong thời khóa biểu. Đây là API hữu ích khi người dùng click vào một tiết học trên giao diện để xem thông tin chi tiết.

## Endpoint

```
GET /api/schedules/period-details
```

## Authentication

API yêu cầu xác thực bằng Bearer token:

```
Authorization: Bearer <token>
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `className` | string | Yes | Tên lớp học (ví dụ: "12A4") |
| `academicYear` | string | Yes | Năm học (ví dụ: "2024-2025") |
| `dayOfWeek` | integer | Yes | Ngày trong tuần (2-7: Thứ 2 - Thứ 7) |
| `periodNumber` | integer | Yes | Số tiết học (1-7) |

## Response Format

### Successful Response (200)

```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025",
      "homeroomTeacher": "64f8b9c123456789abcdef02"
    },
    "schedule": {
      "id": "64f8b9c123456789abcdef03",
      "status": "active",
      "semester": 1,
      "weekNumber": 15,
      "totalPeriods": 35,
      "createdBy": "64f8b9c123456789abcdef04",
      "lastModifiedBy": "64f8b9c123456789abcdef05",
      "createdAt": "2024-12-19T10:00:00.000Z",
      "updatedAt": "2024-12-19T15:30:00.000Z"
    },
    "exists": true,
    "period": {
      "basic": {
        "dayOfWeek": 2,
        "dayName": "Monday",
        "dayNameVN": "Thứ 2",
        "periodNumber": 1,
        "session": "morning",
        "sessionVN": "Sáng",
        "timeStart": "07:00",
        "timeEnd": "07:45",
        "duration": "45 phút"
      },
      "academic": {
        "subject": {
          "id": "64f8b9c123456789abcdef06",
          "name": "Toán học",
          "code": "MATH12",
          "department": "Toán - Lý - Hóa",
          "weeklyHours": 4,
          "category": "core"
        },
        "teacher": {
          "id": "64f8b9c123456789abcdef07",
          "name": "Nguyễn Văn A",
          "email": "teacher.math@school.edu.vn",
          "role": "teacher"
        },
        "isFixed": false,
        "specialType": null
      },
      "status": {
        "current": "completed",
        "currentVN": "Đã hoàn thành",
        "actualDate": "2024-12-16",
        "completedAt": "2024-12-16T07:45:00.000Z",
        "notes": "Học xong bài 5: Hàm số mũ"
      },
      "type": {
        "periodType": "regular",
        "periodTypeVN": "Chính quy",
        "isRegular": true,
        "isMakeup": false,
        "isExtracurricular": false,
        "isFixed": false
      },
      "attendance": {
        "presentStudents": 38,
        "absentStudents": 2,
        "totalStudents": 40,
        "attendanceRate": "95.0%"
      },
      "makeupInfo": null,
      "extracurricularInfo": null,
      "metadata": {
        "canEdit": false,
        "canMarkCompleted": false,
        "canMarkAbsent": true,
        "requiresAttendance": true,
        "allowsNotes": true
      }
    },
    "generatedAt": "2024-12-19T16:00:00.000Z"
  }
}
```

### Response When Period Not Found

```json
{
  "success": true,
  "data": {
    "class": {
      "id": "64f8b9c123456789abcdef01",
      "name": "12A4",
      "academicYear": "2024-2025"
    },
    "schedule": {
      "id": "64f8b9c123456789abcdef03",
      "status": "active",
      "createdBy": "64f8b9c123456789abcdef04",
      "lastModifiedBy": "64f8b9c123456789abcdef05",
      "createdAt": "2024-12-19T10:00:00.000Z",
      "updatedAt": "2024-12-19T15:30:00.000Z"
    },
    "dayOfWeek": 2,
    "periodNumber": 6,
    "exists": false,
    "message": "No period found for Thứ 2 period 6"
  }
}
```

### Error Response (400)

```json
{
  "success": false,
  "message": "Class name, academic year, day of week, and period number are required"
}
```

```json
{
  "success": false,
  "message": "Day of week must be between 2 (Monday) and 7 (Saturday)"
}
```

```json
{
  "success": false,
  "message": "Period number must be between 1 and 7"
}
```

## Response Fields Explanation

### Basic Information (`period.basic`)
- `dayOfWeek`: Số ngày trong tuần (2-7)
- `dayName`: Tên ngày bằng tiếng Anh
- `dayNameVN`: Tên ngày bằng tiếng Việt
- `periodNumber`: Số tiết (1-7)
- `session`: Buổi học ("morning" hoặc "afternoon")
- `sessionVN`: Buổi học bằng tiếng Việt
- `timeStart/timeEnd`: Thời gian bắt đầu/kết thúc
- `duration`: Thời lượng tiết học

### Academic Information (`period.academic`)
- `subject`: Thông tin môn học (nếu có)
- `teacher`: Thông tin giáo viên (nếu có)
- `isFixed`: Có phải tiết cố định không
- `specialType`: Loại đặc biệt (lễ chào cờ, sinh hoạt lớp...)

### Status Information (`period.status`)
- `current`: Trạng thái hiện tại
- `currentVN`: Trạng thái bằng tiếng Việt
- `actualDate`: Ngày thực hiện tiết học
- `completedAt`: Thời gian hoàn thành
- `notes`: Ghi chú

### Type Information (`period.type`)
- `periodType`: Loại tiết học (regular, makeup, extracurricular, fixed)
- `periodTypeVN`: Loại tiết học bằng tiếng Việt
- `isRegular/isMakeup/isExtracurricular/isFixed`: Flags để kiểm tra loại

### Attendance Information (`period.attendance`)
- `presentStudents`: Số học sinh có mặt
- `absentStudents`: Số học sinh vắng mặt
- `totalStudents`: Tổng số học sinh
- `attendanceRate`: Tỷ lệ có mặt (%)

### Makeup Information (`period.makeupInfo`)
Chỉ có khi `periodType === 'makeup'`:
- `originalDate`: Ngày gốc bị hủy
- `reason`: Lý do dạy bù
- `originalPeriodNumber`: Số tiết gốc
- `originalDayName`: Tên tiết gốc

### Extracurricular Information (`period.extracurricularInfo`)
Chỉ có khi `periodType === 'extracurricular'`:
- `activityName`: Tên hoạt động
- `activityType`: Loại hoạt động
- `activityTypeVN`: Loại hoạt động bằng tiếng Việt
- `location`: Địa điểm
- `maxParticipants`: Số lượng tham gia tối đa

### Metadata (`period.metadata`)
- `canEdit`: Có thể chỉnh sửa không
- `canMarkCompleted`: Có thể đánh dấu hoàn thành không
- `canMarkAbsent`: Có thể đánh dấu vắng mặt không
- `requiresAttendance`: Có yêu cầu điểm danh không
- `allowsNotes`: Có cho phép ghi chú không

## Usage Examples

### cURL Example

```bash
# Xem chi tiết tiết học Thứ 2, tiết 1 của lớp 12A4
curl -X GET "http://localhost:3000/api/schedules/period-details?className=12A4&academicYear=2024-2025&dayOfWeek=2&periodNumber=1" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json"
```

### JavaScript Example

```javascript
const axios = require('axios');

async function getPeriodDetails(className, academicYear, dayOfWeek, periodNumber) {
  try {
    const response = await axios.get('/api/schedules/period-details', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        className,
        academicYear,
        dayOfWeek,
        periodNumber
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
    throw error;
  }
}

// Usage
getPeriodDetails('12A4', '2024-2025', 2, 1)
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

### Frontend Integration Example

```javascript
// React component example
const PeriodDetailsModal = ({ className, academicYear, dayOfWeek, periodNumber, onClose }) => {
  const [periodDetails, setPeriodDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPeriodDetails = async () => {
      try {
        const response = await fetch(`/api/schedules/period-details?className=${className}&academicYear=${academicYear}&dayOfWeek=${dayOfWeek}&periodNumber=${periodNumber}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          setPeriodDetails(data.data);
        }
      } catch (error) {
        console.error('Error fetching period details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPeriodDetails();
  }, [className, academicYear, dayOfWeek, periodNumber]);
  
  if (loading) return <div>Loading...</div>;
  
  if (!periodDetails?.exists) {
    return (
      <div className="modal">
        <h2>Không có tiết học</h2>
        <p>Tiết {periodNumber} ngày {dayOfWeek} không có lịch học.</p>
        <button onClick={onClose}>Đóng</button>
      </div>
    );
  }
  
  const { period } = periodDetails;
  
  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Chi tiết tiết học</h2>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="modal-body">
        <div className="section">
          <h3>Thông tin cơ bản</h3>
          <p><strong>Lớp:</strong> {periodDetails.class.name}</p>
          <p><strong>Ngày:</strong> {period.basic.dayNameVN}</p>
          <p><strong>Tiết:</strong> {period.basic.periodNumber} ({period.basic.sessionVN})</p>
          <p><strong>Thời gian:</strong> {period.basic.timeStart} - {period.basic.timeEnd}</p>
        </div>
        
        {period.academic.subject && (
          <div className="section">
            <h3>Môn học</h3>
            <p><strong>Môn:</strong> {period.academic.subject.name}</p>
            <p><strong>Giáo viên:</strong> {period.academic.teacher?.name || 'Chưa có'}</p>
          </div>
        )}
        
        <div className="section">
          <h3>Trạng thái</h3>
          <p><strong>Trạng thái:</strong> {period.status.currentVN}</p>
          <p><strong>Loại tiết:</strong> {period.type.periodTypeVN}</p>
          {period.status.notes && (
            <p><strong>Ghi chú:</strong> {period.status.notes}</p>
          )}
        </div>
        
        <div className="section">
          <h3>Điểm danh</h3>
          <p><strong>Tỷ lệ có mặt:</strong> {period.attendance.attendanceRate}</p>
          <p><strong>Có mặt:</strong> {period.attendance.presentStudents}/{period.attendance.totalStudents}</p>
        </div>
      </div>
    </div>
  );
};
```

## Use Cases

1. **Xem chi tiết tiết học**: Khi người dùng click vào một ô tiết học trên lưới thời khóa biểu
2. **Kiểm tra trạng thái**: Xem tiết học đã hoàn thành hay chưa, có ghi chú gì
3. **Xem thông tin điểm danh**: Kiểm tra tỷ lệ có mặt của học sinh
4. **Phân biệt loại tiết**: Xác định tiết học thường, tiết bù, hay hoạt động ngoại khóa
5. **Lấy metadata**: Xác định các hành động có thể thực hiện (chỉnh sửa, đánh dấu hoàn thành...)

## Error Handling

API sẽ trả về các lỗi phổ biến:

- **400 Bad Request**: Thiếu tham số bắt buộc hoặc tham số không hợp lệ
- **401 Unauthorized**: Không có token hoặc token không hợp lệ
- **404 Not Found**: Không tìm thấy lớp học hoặc thời khóa biểu
- **500 Internal Server Error**: Lỗi server

## Notes

- API hỗ trợ tất cả loại tiết học: regular, makeup, extracurricular, fixed
- Thông tin được populate đầy đủ cho subject và teacher
- Metadata giúp frontend xác định các hành động có thể thực hiện
- Response luôn bao gồm thông tin về class và schedule để context đầy đủ
- API có thể trả về tiết học không tồn tại (`exists: false`) thay vì lỗi 404

## Testing

Sử dụng file `test-period-details.js` để test API:

```bash
node test-period-details.js
```

Script sẽ test các trường hợp:
- Tiết học bình thường
- Tiết cố định (lễ chào cờ)
- Tiết không tồn tại 