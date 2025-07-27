# Hướng dẫn sử dụng API Thống kê Trường học

## Tổng quan

API thống kê trường học cung cấp các endpoint để lấy dữ liệu thống kê phục vụ cho trang quản lý trường học, bao gồm:

1. **Thống kê sĩ số toàn trường theo ngày**
2. **Thống kê điểm danh giáo viên**
3. **Biểu đồ học sinh theo buổi và tiết**
4. **Thống kê sĩ số theo tuần**
5. **Tỷ lệ hoàn thành của học sinh và giáo viên**

## Các Endpoint

### 1. Thống kê sĩ số toàn trường theo ngày

**Endpoint:** `GET /api/statistics/daily`

**Query Parameters:**
- `date` (optional): Ngày cần thống kê (format: YYYY-MM-DD). Mặc định là ngày hiện tại.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy thống kê ngày hiện tại
curl -X GET "http://localhost:3000/api/statistics/daily" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy thống kê ngày cụ thể
curl -X GET "http://localhost:3000/api/statistics/daily?date=2024-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy thống kê sĩ số ngày thành công",
  "data": {
    "date": "2024-01-15T00:00:00.000Z",
    "total": 1200,
    "breakdown": {
      "students": 1100,
      "teachers": 70,
      "managers": 30
    },
    "gradeLevels": {
      "grade10": 350,
      "grade11": 380,
      "grade12": 370
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Không có quyền truy cập",
  "error": "Unauthorized"
}
```

### 2. Thống kê điểm danh giáo viên

**Endpoint:** `GET /api/statistics/teacher-attendance`

**Query Parameters:**
- `date` (optional): Ngày cần thống kê (format: YYYY-MM-DD). Mặc định là ngày hiện tại.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy thống kê điểm danh ngày hiện tại
curl -X GET "http://localhost:3000/api/statistics/teacher-attendance" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy thống kê điểm danh ngày cụ thể
curl -X GET "http://localhost:3000/api/statistics/teacher-attendance?date=2024-01-15" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy thống kê điểm danh giáo viên thành công",
  "data": {
    "date": "2024-01-15T00:00:00.000Z",
    "total": 70,
    "attended": 67,
    "absent": 3,
    "attendanceRate": 96
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

### 3. Biểu đồ học sinh theo buổi

**Endpoint:** `GET /api/statistics/student-chart`

**Query Parameters:**
- `date` (optional): Ngày cần thống kê (format: YYYY-MM-DD). Mặc định là ngày hiện tại.
- `session` (optional): Buổi học ("morning" hoặc "afternoon"). Mặc định là "morning".

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy biểu đồ học sinh buổi sáng ngày hiện tại
curl -X GET "http://localhost:3000/api/statistics/student-chart?session=morning" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy biểu đồ học sinh buổi chiều ngày cụ thể
curl -X GET "http://localhost:3000/api/statistics/student-chart?date=2024-01-15&session=afternoon" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy dữ liệu biểu đồ học sinh thành công",
  "data": {
    "date": "2024-01-15T00:00:00.000Z",
    "session": "morning",
    "periods": [
      {
        "period": 1,
        "grade10": 300,
        "grade11": 400,
        "grade12": 400
      },
      {
        "period": 2,
        "grade10": 320,
        "grade11": 390,
        "grade12": 390
      },
      {
        "period": 3,
        "grade10": 310,
        "grade11": 410,
        "grade12": 380
      },
      {
        "period": 4,
        "grade10": 305,
        "grade11": 405,
        "grade12": 390
      },
      {
        "period": 5,
        "grade10": 315,
        "grade11": 395,
        "grade12": 390
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Buổi học không hợp lệ",
  "error": "Invalid session. Must be 'morning' or 'afternoon'"
}
```

### 4. Thống kê sĩ số theo tuần

**Endpoint:** `GET /api/statistics/weekly`

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu tuần (format: YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc tuần (format: YYYY-MM-DD)
- Nếu không cung cấp, sẽ lấy tuần hiện tại (Thứ 2 đến Chủ nhật)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy thống kê tuần hiện tại
curl -X GET "http://localhost:3000/api/statistics/weekly" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy thống kê tuần cụ thể
curl -X GET "http://localhost:3000/api/statistics/weekly?startDate=2024-01-15&endDate=2024-01-21" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy thống kê sĩ số tuần thành công",
  "data": {
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-21T00:00:00.000Z",
    "weeklyData": [
      {
        "date": "2024-01-15T00:00:00.000Z",
        "dayOfWeek": 1,
        "dayName": "Thứ 2",
        "total": 1200,
        "breakdown": {
          "students": 1100,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 350,
          "grade11": 380,
          "grade12": 370
        }
      },
      {
        "date": "2024-01-16T00:00:00.000Z",
        "dayOfWeek": 2,
        "dayName": "Thứ 3",
        "total": 1195,
        "breakdown": {
          "students": 1095,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 348,
          "grade11": 378,
          "grade12": 369
        }
      },
      {
        "date": "2024-01-17T00:00:00.000Z",
        "dayOfWeek": 3,
        "dayName": "Thứ 4",
        "total": 1202,
        "breakdown": {
          "students": 1102,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 352,
          "grade11": 382,
          "grade12": 368
        }
      },
      {
        "date": "2024-01-18T00:00:00.000Z",
        "dayOfWeek": 4,
        "dayName": "Thứ 5",
        "total": 1198,
        "breakdown": {
          "students": 1098,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 349,
          "grade11": 381,
          "grade12": 368
        }
      },
      {
        "date": "2024-01-19T00:00:00.000Z",
        "dayOfWeek": 5,
        "dayName": "Thứ 6",
        "total": 1205,
        "breakdown": {
          "students": 1105,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 353,
          "grade11": 385,
          "grade12": 367
        }
      },
      {
        "date": "2024-01-20T00:00:00.000Z",
        "dayOfWeek": 6,
        "dayName": "Thứ 7",
        "total": 1190,
        "breakdown": {
          "students": 1090,
          "teachers": 70,
          "managers": 30
        },
        "gradeLevels": {
          "grade10": 347,
          "grade11": 376,
          "grade12": 367
        }
      },
      {
        "date": "2024-01-21T00:00:00.000Z",
        "dayOfWeek": 0,
        "dayName": "Chủ nhật",
        "total": 0,
        "breakdown": {
          "students": 0,
          "teachers": 0,
          "managers": 0
        },
        "gradeLevels": {
          "grade10": 0,
          "grade11": 0,
          "grade12": 0
        }
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Khoảng thời gian không hợp lệ",
  "error": "Start date must be before end date"
}
```

### 5. Tỷ lệ hoàn thành

**Endpoint:** `GET /api/statistics/completion-rates`

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu (format: YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (format: YYYY-MM-DD)
- Nếu không cung cấp, sẽ lấy tuần hiện tại

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Examples:**

```bash
# Lấy tỷ lệ hoàn thành tuần hiện tại
curl -X GET "http://localhost:3000/api/statistics/completion-rates" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"

# Lấy tỷ lệ hoàn thành khoảng thời gian cụ thể
curl -X GET "http://localhost:3000/api/statistics/completion-rates?startDate=2024-01-15&endDate=2024-01-21" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Response Examples:**

```json
{
  "success": true,
  "message": "Lấy tỷ lệ hoàn thành thành công",
  "data": {
    "period": {
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-21T00:00:00.000Z"
    },
    "students": {
      "total": 1100,
      "completed": 880,
      "rate": 80
    },
    "teachers": {
      "total": 70,
      "completed": 56,
      "rate": 80
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Không tìm thấy dữ liệu",
  "error": "No data found for the specified period"
}
```

## Ví dụ sử dụng với JavaScript/Fetch

### 1. Lấy thống kê ngày hiện tại
```javascript
const getDailyStatistics = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/statistics/daily', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Thống kê ngày:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getDailyStatistics();
```

### 2. Lấy biểu đồ học sinh với parameters
```javascript
const getStudentChart = async (date, session) => {
  try {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (session) params.append('session', session);
    
    const response = await fetch(`http://localhost:3000/api/statistics/student-chart?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Dữ liệu biểu đồ:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getStudentChart('2024-01-15', 'morning');
```

### 3. Lấy thống kê tuần với date range
```javascript
const getWeeklyStatistics = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`http://localhost:3000/api/statistics/weekly?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Thống kê tuần:', data.data);
      return data.data;
    } else {
      console.error('Lỗi:', data.message);
    }
  } catch (error) {
    console.error('Lỗi network:', error);
  }
};

// Sử dụng
getWeeklyStatistics('2024-01-15', '2024-01-21');
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

// Interceptor để xử lý response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 2. Sử dụng Axios để gọi API
```javascript
// Lấy thống kê điểm danh giáo viên
const getTeacherAttendance = async (date) => {
  try {
    const response = await api.get('/statistics/teacher-attendance', {
      params: { date }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Lỗi khi lấy thống kê điểm danh:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Lấy tỷ lệ hoàn thành
const getCompletionRates = async (startDate, endDate) => {
  try {
    const response = await api.get('/statistics/completion-rates', {
      params: { startDate, endDate }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Lỗi khi lấy tỷ lệ hoàn thành:', error.response?.data?.message || error.message);
    throw error;
  }
};

// Sử dụng
const loadStatistics = async () => {
  try {
    const [attendance, completion] = await Promise.all([
      getTeacherAttendance('2024-01-15'),
      getCompletionRates('2024-01-15', '2024-01-21')
    ]);
    
    console.log('Điểm danh:', attendance);
    console.log('Hoàn thành:', completion);
  } catch (error) {
    console.error('Lỗi:', error);
  }
};
```

## Ví dụ sử dụng với React Hooks

### 1. Custom Hook cho Statistics
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchStatistics = async (endpoint, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/statistics/${endpoint}`, {
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

  return { loading, error, data, fetchStatistics };
};
```

### 2. Component sử dụng Hook
```javascript
import React, { useEffect } from 'react';
import { useStatistics } from './useStatistics';

const StatisticsDashboard = () => {
  const { loading, error, data, fetchStatistics } = useStatistics();

  useEffect(() => {
    fetchStatistics('daily');
  }, []);

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;
  if (!data) return <div>Không có dữ liệu</div>;

  return (
    <div>
      <h2>Thống kê ngày</h2>
      <p>Tổng số: {data.total}</p>
      <p>Học sinh: {data.breakdown.students}</p>
      <p>Giáo viên: {data.breakdown.teachers}</p>
      <p>Quản lý: {data.breakdown.managers}</p>
    </div>
  );
};
```

## Lưu ý quan trọng

1. **Authentication**: Tất cả các endpoint đều yêu cầu JWT token hợp lệ
2. **Quyền truy cập**: Chỉ manager và admin mới có quyền truy cập các endpoint này
3. **Performance**: Các query thống kê có thể mất thời gian với dữ liệu lớn, nên cân nhắc implement caching
4. **Data accuracy**: Dữ liệu thống kê dựa trên các bản ghi đánh giá tiết học, đảm bảo giáo viên đã hoàn thành đánh giá
5. **Error Handling**: Luôn xử lý lỗi và hiển thị thông báo phù hợp cho người dùng
6. **Rate Limiting**: Có thể áp dụng rate limiting để tránh quá tải server

## Cải tiến đề xuất

1. **Caching**: Implement Redis cache cho các thống kê thường xuyên được truy cập
2. **Aggregation Pipeline**: Tối ưu hóa MongoDB aggregation pipeline cho hiệu suất tốt hơn
3. **Real-time updates**: Sử dụng WebSocket để cập nhật thống kê real-time
4. **Export functionality**: Thêm khả năng export dữ liệu thống kê ra Excel/PDF
5. **Pagination**: Thêm pagination cho các endpoint trả về nhiều dữ liệu
6. **Filtering**: Thêm các filter theo lớp, môn học, giáo viên
