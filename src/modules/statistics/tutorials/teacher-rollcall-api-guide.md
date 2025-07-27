# Hướng dẫn sử dụng API Điểm danh Giáo viên

## Tổng quan

API điểm danh giáo viên cung cấp các endpoint để:
1. Lấy dữ liệu điểm danh giáo viên theo ngày, dựa trên việc hoàn thành tiết học đầu tiên trong ngày
2. Lấy danh sách ngày trong tuần dựa trên thời khóa biểu (TKB) tuần
3. Giáo viên được coi là "đã điểm danh" khi họ xác nhận hoàn thành tiết học đầu tiên của ngày

## Endpoints

### 1. Điểm danh giáo viên theo ngày

**Endpoint:** `GET /api/statistics/teacher-rollcall`

**Query Parameters:**
- `date` (optional): Ngày cần xem điểm danh (format: YYYY-MM-DD). Mặc định là ngày hiện tại.
- `status` (optional): Filter theo trạng thái điểm danh ("Tất cả", "Đã điểm danh", "Chưa điểm danh", "Trễ")
- `subject` (optional): Filter theo môn học (tên môn học hoặc "Tất cả")
- `weekNumber` (optional): Tuần trong thời khóa biểu
- `academicYear` (optional): Năm học

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy điểm danh ngày hiện tại
curl -X GET "http://localhost:3000/api/statistics/teacher-rollcall" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy điểm danh ngày cụ thể
curl -X GET "http://localhost:3000/api/statistics/teacher-rollcall?date=2024-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Filter theo trạng thái và môn học
curl -X GET "http://localhost:3000/api/statistics/teacher-rollcall?date=2024-01-15&status=Đã điểm danh&subject=Toán" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### 2. Lấy danh sách ngày trong tuần dựa trên TKB

**Endpoint:** `GET /api/statistics/week-days`

**Query Parameters:**
- `weekNumber` (optional): Số tuần trong thời khóa biểu (1-52). Mặc định là tuần hiện tại.
- `academicYear` (optional): Năm học (format: YYYY-YYYY). Mặc định là năm học hiện tại.
- `className` (optional): Tên lớp cụ thể để lấy TKB của lớp đó

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy ngày trong tuần hiện tại
curl -X GET "http://localhost:3000/api/statistics/week-days" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy ngày trong tuần cụ thể
curl -X GET "http://localhost:3000/api/statistics/week-days?weekNumber=5" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy ngày trong tuần của lớp cụ thể
curl -X GET "http://localhost:3000/api/statistics/week-days?weekNumber=5&academicYear=2024-2025&className=10A1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy danh sách ngày trong tuần thành công",
  "data": {
    "weekNumber": 5,
    "academicYear": "2024-2025",
    "className": "10A1",
    "startDate": "2024-02-05T00:00:00.000Z",
    "endDate": "2024-02-11T00:00:00.000Z",
    "days": [
      {
        "date": "2024-02-05T00:00:00.000Z",
        "dayOfWeek": 1,
        "dayName": "Thứ 2",
        "formattedDate": "05/02/2024",
        "isToday": false
      },
      {
        "date": "2024-02-06T00:00:00.000Z",
        "dayOfWeek": 2,
        "dayName": "Thứ 3",
        "formattedDate": "06/02/2024",
        "isToday": false
      },
      {
        "date": "2024-02-07T00:00:00.000Z",
        "dayOfWeek": 3,
        "dayName": "Thứ 4",
        "formattedDate": "07/02/2024",
        "isToday": true
      },
      {
        "date": "2024-02-08T00:00:00.000Z",
        "dayOfWeek": 4,
        "dayName": "Thứ 5",
        "formattedDate": "08/02/2024",
        "isToday": false
      },
      {
        "date": "2024-02-09T00:00:00.000Z",
        "dayOfWeek": 5,
        "dayName": "Thứ 6",
        "formattedDate": "09/02/2024",
        "isToday": false
      },
      {
        "date": "2024-02-10T00:00:00.000Z",
        "dayOfWeek": 6,
        "dayName": "Thứ 7",
        "formattedDate": "10/02/2024",
        "isToday": false
      },
      {
        "date": "2024-02-11T00:00:00.000Z",
        "dayOfWeek": 0,
        "dayName": "Chủ nhật",
        "formattedDate": "11/02/2024",
        "isToday": false
      }
    ]
  }
}
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy dữ liệu điểm danh giáo viên thành công",
  "data": {
    "date": "2024-01-15T00:00:00.000Z",
    "totalTeachers": 25,
    "attended": 22,
    "absent": 2,
    "late": 1,
    "rollcalls": [
      {
        "teacherId": "507f1f77bcf86cd799439011",
        "teacherName": "Nguyễn Văn A",
        "class": "10A1",
        "subject": "Toán",
        "period": 1,
        "startTime": "07:30",
        "endTime": "08:15",
        "status": "Đã điểm danh",
        "completedAt": "2024-01-15T07:45:00.000Z",
        "isFirstLessonOfDay": true,
        "lessonId": "507f1f77bcf86cd799439012"
      },
      {
        "teacherId": "507f1f77bcf86cd799439013",
        "teacherName": "Trần Thị B",
        "class": "10A2",
        "subject": "Ngữ Văn",
        "period": 2,
        "startTime": "08:20",
        "endTime": "09:05",
        "status": "Trễ",
        "completedAt": "2024-01-15T09:10:00.000Z",
        "isFirstLessonOfDay": true,
        "lessonId": "507f1f77bcf86cd799439014"
      },
      {
        "teacherId": "507f1f77bcf86cd799439015",
        "teacherName": "Lê Văn C",
        "class": "10A3",
        "subject": "Vật lý",
        "period": 3,
        "startTime": "09:10",
        "endTime": "09:55",
        "status": "Chưa điểm danh",
        "completedAt": null,
        "isFirstLessonOfDay": true,
        "lessonId": "507f1f77bcf86cd799439016"
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Ngày không hợp lệ",
  "error": "Invalid date format"
}
```

## Logic điểm danh

### 1. Xác định tiết học đầu tiên
- Hệ thống tìm tất cả tiết học của giáo viên trong ngày
- Sắp xếp theo thứ tự tiết học (period)
- Lấy tiết học đầu tiên làm cơ sở điểm danh

### 2. Trạng thái điểm danh
- **"Đã điểm danh"**: Giáo viên đã hoàn thành tiết học đầu tiên trong thời gian
- **"Trễ"**: Giáo viên hoàn thành tiết học sau thời gian kết thúc dự kiến
- **"Chưa điểm danh"**: Giáo viên chưa hoàn thành tiết học đầu tiên

### 3. Thời gian tính toán
- Dựa trên `TeacherLessonEvaluation.createdAt`
- So sánh với thời gian kết thúc tiết học (`timeSlot.endTime`)

## Ví dụ sử dụng với JavaScript/Fetch

### 1. Lấy danh sách ngày trong tuần
```javascript
const getWeekDays = async (weekNumber, academicYear, className) => {
  try {
    const params = new URLSearchParams();
    if (weekNumber) params.append('weekNumber', weekNumber);
    if (academicYear) params.append('academicYear', academicYear);
    if (className) params.append('className', className);
    
    const response = await fetch(`http://localhost:3000/api/statistics/week-days?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Danh sách ngày trong tuần:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getWeekDays(5, '2024-2025', '10A1');
```

### 2. Lấy điểm danh ngày hiện tại
```javascript
const getTeacherRollcall = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/statistics/teacher-rollcall', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Điểm danh giáo viên:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getTeacherRollcall();
```

### 2. Filter theo trạng thái và môn học
```javascript
const getFilteredRollcall = async (date, status, subject) => {
  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    if (subject) params.append('subject', subject);
    
    const response = await fetch(`http://localhost:3000/api/statistics/teacher-rollcall?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Điểm danh đã lọc:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getFilteredRollcall('2024-01-15', 'Đã điểm danh', 'Toán');
```

## Ví dụ sử dụng với Axios

### 1. Setup Axios instance
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor để thêm token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. Sử dụng Axios để gọi API
```javascript
// Lấy danh sách ngày trong tuần
const getWeekDays = async (params = {}) => {
  try {
    const response = await api.get('/statistics/week-days', { params });
    return response.data.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ngày:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Lấy điểm danh giáo viên
const getTeacherRollcall = async (params = {}) => {
  try {
    const response = await api.get('/statistics/teacher-rollcall', { params });
    return response.data.data;
  } catch (error) {
    console.error('Lỗi khi lấy điểm danh:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Sử dụng
const loadRollcallData = async () => {
  try {
    const rollcallData = await getTeacherRollcall({
      date: '2024-01-15',
      status: 'Đã điểm danh',
      subject: 'Toán'
    });
    
    console.log('Dữ liệu điểm danh:', rollcallData);
    
    // Hiển thị dữ liệu lên UI
    displayRollcallData(rollcallData);
  } catch (error) {
    console.error('Lỗi:', error);
  }
};
```

## Ví dụ sử dụng với React Hooks

### 1. Custom Hook cho Week Days
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useWeekDays = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchWeekDays = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/statistics/week-days', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, fetchWeekDays };
};
```

### 2. Custom Hook cho Teacher Rollcall
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useTeacherRollcall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchRollcall = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/statistics/teacher-rollcall', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, data, fetchRollcall };
};
```

### 3. Component sử dụng cả hai Hook
```javascript
import React, { useEffect, useState } from 'react';
import { useWeekDays } from './useWeekDays';
import { useTeacherRollcall } from './useTeacherRollcall';

const TeacherRollcallComponent = () => {
  const { loading: weekDaysLoading, error: weekDaysError, data: weekDaysData, fetchWeekDays } = useWeekDays();
  const { loading: rollcallLoading, error: rollcallError, data: rollcallData, fetchRollcall } = useTeacherRollcall();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'Tất cả',
    subject: 'Tất cả'
  });

  // Load danh sách ngày trong tuần khi component mount
  useEffect(() => {
    fetchWeekDays({ weekNumber: 5, academicYear: '2024-2025' });
  }, []);

  // Load điểm danh khi thay đổi filter
  useEffect(() => {
    if (selectedDate) {
      fetchRollcall({ ...filters, date: selectedDate });
    }
  }, [filters, selectedDate]);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (weekDaysLoading) return <div>Đang tải danh sách ngày...</div>;
  if (weekDaysError) return <div>Lỗi: {weekDaysError}</div>;

  return (
    <div>
      <h2>Điểm danh giáo viên</h2>
      
      {/* Date picker từ danh sách ngày trong tuần */}
      {weekDaysData && (
        <div>
          <h3>Chọn ngày trong tuần:</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {weekDaysData.days.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDateChange(day.formattedDate)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: day.isToday ? '#007bff' : '#fff',
                  color: day.isToday ? '#fff' : '#333',
                  cursor: 'pointer'
                }}
              >
                {day.dayName} - {day.formattedDate}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter controls */}
      <div style={{ marginTop: '20px' }}>
        <select 
          value={filters.status} 
          onChange={(e) => handleFilterChange('status', e.target.value)}
          style={{ marginRight: '10px' }}
        >
          <option value="Tất cả">Tất cả</option>
          <option value="Đã điểm danh">Đã điểm danh</option>
          <option value="Chưa điểm danh">Chưa điểm danh</option>
          <option value="Trễ">Trễ</option>
        </select>
      </div>

      {/* Rollcall data */}
      {rollcallLoading && <div>Đang tải điểm danh...</div>}
      {rollcallError && <div>Lỗi: {rollcallError}</div>}
      {rollcallData && (
        <div>
          <h3>Thống kê điểm danh - {selectedDate}</h3>
          <div>
            <p>Tổng: {rollcallData.totalTeachers}</p>
            <p>Đã điểm danh: {rollcallData.attended}</p>
            <p>Chưa điểm danh: {rollcallData.absent}</p>
            <p>Trễ: {rollcallData.late}</p>
          </div>

          {/* Rollcall list */}
          <div>
            {rollcallData.rollcalls.map((rollcall, index) => (
              <div key={index} style={{
                padding: '10px',
                border: '1px solid #ccc',
                margin: '5px 0',
                backgroundColor: rollcall.status === 'Đã điểm danh' ? '#e8f5e8' : 
                               rollcall.status === 'Trễ' ? '#fff3cd' : '#f8d7da'
              }}>
                <h4>{rollcall.teacherName}</h4>
                <p>Lớp: {rollcall.class} | Môn: {rollcall.subject}</p>
                <p>Tiết: {rollcall.period} | Thời gian: {rollcall.startTime} - {rollcall.endTime}</p>
                <p>Trạng thái: {rollcall.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## Lưu ý quan trọng

1. **Authentication**: Tất cả endpoints yêu cầu JWT token hợp lệ
2. **Quyền truy cập**: Chỉ manager và admin mới có quyền truy cập
3. **Logic điểm danh**: Dựa trên tiết học đầu tiên của giáo viên trong ngày
4. **Performance**: API có thể mất thời gian với dữ liệu lớn, nên cân nhắc caching
5. **Real-time**: Dữ liệu cập nhật real-time khi giáo viên hoàn thành tiết học
6. **Week Days API**: 
   - Nếu không có `weekNumber`, sẽ lấy tuần hiện tại
   - Nếu không có `academicYear`, sẽ lấy năm học hiện tại (isActive: true)
   - Nếu không có `className`, sẽ lấy weekly schedule đầu tiên tìm được
   - Nếu không tìm thấy weekly schedule, sẽ tạo danh sách ngày dựa trên academic year
7. **Date Format**: API trả về ngày theo format `dd/mm/yyyy` cho `formattedDate`
8. **Today Detection**: API tự động đánh dấu ngày hôm nay với `isToday: true`

## Cải tiến đề xuất

1. **Caching**: Implement Redis cache cho dữ liệu điểm danh
2. **Pagination**: Thêm pagination cho danh sách lớn
3. **Export**: Thêm khả năng export dữ liệu ra Excel/PDF
4. **Notifications**: Gửi thông báo cho giáo viên chưa điểm danh
5. **Analytics**: Thêm biểu đồ thống kê điểm danh theo thời gian 