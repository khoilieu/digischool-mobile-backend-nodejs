# Frontend API Integration Guide

## 📱 Tích hợp API thống kê vào Mobile App

### **Mục tiêu:**
Thay thế dữ liệu cứng trong các component `ChartSchoolTopday.tsx`, `ChartSchoolWeek.tsx` bằng dữ liệu thực từ backend API.

---

## 🎯 **API Endpoints cần tích hợp:**

### **1. API: `getDailySchoolStatistics`**
**Endpoint:** `GET /api/statistics/daily-statistics`
**Mô tả:** Thống kê sĩ số toàn trường theo ngày
**Logic:** 
- **Giáo viên:** Tính dựa trên lesson completed (không phải đánh giá tiết học)
- **Học sinh:** Tính dựa trên đánh giá tiết học mới nhất của từng lớp
- **Quản lý:** Tổng số account quản lý

**Response:**
```json
{
  "date": "2025-08-07T00:00:00.000Z",
  "total": 3,
  "breakdown": {
    "students": 0,
    "teachers": 2,
    "managers": 1
  },
  "teacherAttendance": {
    "total": 14,
    "attended": 2,
    "absent": 12,
    "late": 0
  }
}
```

### **2. API: `getTeacherAttendanceStatistics`**
**Endpoint:** `GET /api/statistics/teacher-attendance-statistics`
**Mô tả:** Thống kê điểm danh giáo viên theo ngày
**Logic:** Giáo viên được tính là đã điểm danh khi họ xác nhận lesson completed (không phải khi đánh giá tiết học)

**Response:**
```json
{
  "date": "2025-08-07T00:00:00.000Z",
  "total": 30,
  "attended": 2,
  "absent": 28,
  "late": 0,
  "attendanceRate": 7
}
```

### **3. API: `getStudentChartData`**
**Endpoint:** `GET /api/statistics/student-chart-data`
**Mô tả:** Dữ liệu biểu đồ học sinh theo tiết học

**Response:**
```json
{
  "date": "2025-01-15T00:00:00.000Z",
  "periods": [
    {
      "period": 1,
      "grade10": 0,
      "grade11": 0,
      "grade12": 1
    },
    {
      "period": 2,
      "grade10": 0,
      "grade11": 0,
      "grade12": 0
    }
    // ... các tiết khác
  ]
}
```

### **4. API: `getWeeklyStatistics`**
**Endpoint:** `GET /api/statistics/weekly-statistics`
**Mô tả:** Thống kê tuần học dựa trên thời khóa biểu thực tế

**Parameters:**
- `weekNumber`: Số tuần học (1-52)
- `academicYearId`: ID năm học

**Response:**
```json
{
  "weekNumber": 1,
  "academicYear": "2025-2026",
  "startDate": "2025-08-04T00:00:00.000Z",
  "endDate": "2025-08-10T00:00:00.000Z",
  "weeklyData": [
    {
      "date": "2025-08-04T00:00:00.000Z",
      "dayOfWeek": 1,
      "dayName": "Thứ 2",
      "total": 39,
      "breakdown": {
        "students": 8,
        "teachers": 30,
        "managers": 1
      },
      "gradeLevels": {
        "grade12": 8
      },
      "studentsPresent": 0,
      "teacherStats": {
        "date": "2025-08-11T00:00:00.000Z",
        "total": 10,
        "attended": 0,
        "absent": 10,
        "late": 0,
        "attendanceRate": 0
      }
    }
    // ... các ngày khác
  ]
}
```

### **5. API: `getCompletionRates`**
**Endpoint:** `GET /api/statistics/completion-rates`
**Mô tả:** Tỷ lệ hoàn thành học sinh và giáo viên theo tuần

**Parameters:**
- `weekNumber`: Số tuần học (1-52)
- `academicYearId`: ID năm học

**Response:**
```json
{
  "weekNumber": 1,
  "academicYear": "2025-2026",
  "period": {
    "startDate": "2025-08-04T00:00:00.000Z",
    "endDate": "2025-08-10T00:00:00.000Z"
  },
  "students": {
    "total": 8,
    "completed": 3,
    "rate": 38
  },
  "teachers": {
    "total": 30,
    "completed": 1,
    "rate": 3
  }
}
```

---

## 🔧 **Tích hợp vào Component:**

### **1. ChartSchoolTopday.tsx - Thống kê hôm nay**

#### **Thay thế dữ liệu cứng:**
```typescript
// Thay thế dữ liệu cứng này:
const total = 1200;
const students = 1100;
const teachers = 70;
const managers = 30;
const checkedIn = 67;
const totalTeachers = 70;
```

#### **Thêm state và API call:**
```typescript
import { useState, useEffect } from 'react';

export default function ChartSchoolTopday() {
  const [dailyStats, setDailyStats] = useState(null);
  const [teacherStats, setTeacherStats] = useState(null);
  const [studentChartData, setStudentChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyData();
  }, []);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      
      // Fetch daily school statistics
      const dailyResponse = await fetch('/api/statistics/daily-statistics');
      const dailyData = await dailyResponse.json();
      setDailyStats(dailyData);

      // Fetch teacher attendance
      const teacherResponse = await fetch('/api/statistics/teacher-attendance-statistics');
      const teacherData = await teacherResponse.json();
      setTeacherStats(teacherData);

      // Fetch student chart data
      const chartResponse = await fetch('/api/statistics/student-chart-data');
      const chartData = await chartResponse.json();
      setStudentChartData(chartData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sử dụng dữ liệu thực
  const total = dailyStats?.total || 0;
  const students = dailyStats?.breakdown?.students || 0;
  const teachers = dailyStats?.breakdown?.teachers || 0;
  const managers = dailyStats?.breakdown?.managers || 0;
  const checkedIn = teacherStats?.attended || 0;
  const totalTeachers = teacherStats?.total || 0;

  // Chuyển đổi dữ liệu chart
  const chartDataMorning = studentChartData?.periods?.slice(0, 5).map(period => ({
    k10: period.grade10,
    k11: period.grade11,
    k12: period.grade12
  })) || [];

  const chartDataAfternoon = studentChartData?.periods?.slice(5, 10).map(period => ({
    k10: period.grade10,
    k11: period.grade11,
    k12: period.grade12
  })) || [];
```

#### **Cập nhật UI:**
```typescript
{/* Card 1 - Sĩ số toàn trường */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>
    <Text style={styles.linkText}>Sĩ số toàn trường</Text>
  </Text>
  <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 2, justifyContent: "center" }}>
    <Text style={styles.bigNumber}>{total.toLocaleString()}</Text>
    <Text style={styles.unitText}>người</Text>
  </View>
  <View style={styles.row3}>
    <View style={styles.col3}>
      <Text style={styles.label3}>
        Học sinh{"\n"}
        <Text style={styles.bold3}>{students.toLocaleString()}</Text>
      </Text>
    </View>
    <View style={styles.col3}>
      <Text style={styles.label3}>
        Giáo viên{"\n"}
        <Text style={styles.bold3}>{teachers.toLocaleString()}</Text>
      </Text>
    </View>
    <View style={styles.col3}>
      <Text style={styles.label3}>
        Quản lý{"\n"}
        <Text style={styles.bold3}>{managers.toLocaleString()}</Text>
      </Text>
    </View>
  </View>
</View>

{/* Card 2 - Sĩ số giáo viên điểm danh */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>
    <Text style={styles.linkText}>Sĩ số giáo viên điểm danh</Text>
  </Text>
  <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 2, justifyContent: "center" }}>
    <Text style={styles.bigNumber2}>{checkedIn}/{totalTeachers}</Text>
    <Text style={styles.unitText}>người</Text>
  </View>
</View>
```

### **2. ChartSchoolWeek.tsx - Thống kê tuần**

#### **Thêm state và API call:**
```typescript
import { useState, useEffect } from 'react';

export default function ChartSchoolWeek() {
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [completionRates, setCompletionRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      
      // Lấy năm học hiện tại (cần implement logic này)
      const currentAcademicYear = await getCurrentAcademicYear();
      const weekNumber = getCurrentWeekNumber(); // Cần implement logic này
      
      // Fetch weekly statistics
      const weeklyResponse = await fetch(`/api/statistics/weekly-statistics?weekNumber=${weekNumber}&academicYearId=${currentAcademicYear.id}`);
      const weeklyData = await weeklyResponse.json();
      setWeeklyStats(weeklyData);

      // Fetch completion rates
      const completionResponse = await fetch(`/api/statistics/completion-rates?weekNumber=${weekNumber}&academicYearId=${currentAcademicYear.id}`);
      const completionData = await completionResponse.json();
      setCompletionRates(completionData);

    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chuyển đổi dữ liệu cho chart
  const chartData = weeklyStats?.weeklyData?.map(day => ({
    hs: day.breakdown?.students || 0,
    gv: day.breakdown?.teachers || 0,
    ql: day.breakdown?.managers || 0
  })) || [];

  const studentCompletionRate = completionRates?.students?.rate || 0;
  const teacherCompletionRate = completionRates?.teachers?.rate || 0;
```

#### **Cập nhật UI:**
```typescript
{/* Card 1: Biểu đồ sĩ số */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>
    <Text style={styles.linkText}>Biểu đồ sĩ số</Text>
  </Text>
  {/* Chart component với chartData */}
</View>

{/* Card 2: Tỉ lệ học sinh hoàn thành */}
<View style={[styles.card, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
  <Text style={styles.percentLabel}>Tỉ lệ học sinh hoàn thành</Text>
  <Text style={styles.percentValue}>{studentCompletionRate}%</Text>
</View>

{/* Card 3: Tỉ lệ giáo viên hoàn thành */}
<View style={[styles.card, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
  <Text style={styles.percentLabel}>Tỉ lệ giáo viên hoàn thành</Text>
  <Text style={styles.percentValue}>{teacherCompletionRate}%</Text>
</View>
```

---

## 🛠 **Helper Functions cần implement:**

### **1. Lấy năm học hiện tại:**
```typescript
const getCurrentAcademicYear = async () => {
  try {
    const response = await fetch('/api/academic-years/current');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching current academic year:', error);
    return { id: 'default-year-id', name: '2025-2026' };
  }
};
```

### **2. Tính tuần hiện tại:**
```typescript
const getCurrentWeekNumber = () => {
  // Logic tính tuần hiện tại dựa trên ngày
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil(days / 7);
  return weekNumber;
};
```

### **3. Error handling:**
```typescript
const handleApiError = (error: any, fallbackData: any) => {
  console.error('API Error:', error);
  return fallbackData;
};
```

---

## 📱 **Cập nhật manage_school.tsx:**

### **Thêm loading states:**
```typescript
export default function ManageSchool() {
  const [isLoading, setIsLoading] = useState(false);
  
  // ... existing code ...

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
      <Header
        title="Quản lý"
        name={userName ? `QL ${userName}` : "QL Nguyễn Văn A"}
        hasUnreadNotification={!notificationLoading && hasUnreadNotification}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#29375C" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      )}

      {/* Existing content */}
      <View style={styles.container}>
        {/* ... existing code ... */}
      </View>
      
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Pass loading state to components */}
        {filter === 0 && subFilter === 0 && <ChartSchoolTopday isLoading={isLoading} />}
        {filter === 0 && subFilter === 1 && <ChartSchoolWeek isLoading={isLoading} />}
        {/* ... other components ... */}
      </ScrollView>
    </View>
  );
}
```

---

## 🎨 **Styling cho Loading States:**

```typescript
const styles = StyleSheet.create({
  // ... existing styles ...
  
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#29375C',
    fontFamily: 'Baloo2-Medium',
  },
  
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontFamily: 'Baloo2-Medium',
    textAlign: 'center',
  },
  
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#29375C',
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Baloo2-Medium',
  },
});
```

---

## 🔄 **Refresh Logic:**

### **Pull-to-refresh:**
```typescript
import { RefreshControl } from 'react-native';

const [refreshing, setRefreshing] = useState(false);

const onRefresh = React.useCallback(() => {
  setRefreshing(true);
  fetchDailyData().finally(() => setRefreshing(false));
}, []);

<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
  // ... other props
>
```

### **Auto-refresh:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchDailyData();
  }, 30000); // Refresh every 30 seconds

  return () => clearInterval(interval);
}, []);
```

---

## 📋 **Checklist tích hợp:**

- [ ] **ChartSchoolTopday.tsx:**
  - [ ] Thêm state cho daily statistics
  - [ ] Thêm state cho teacher attendance
  - [ ] Thêm state cho student chart data
  - [ ] Implement API calls
  - [ ] Cập nhật UI với dữ liệu thực
  - [ ] Thêm loading states
  - [ ] Thêm error handling

- [ ] **ChartSchoolWeek.tsx:**
  - [ ] Thêm state cho weekly statistics
  - [ ] Thêm state cho completion rates
  - [ ] Implement API calls với weekNumber và academicYearId
  - [ ] Cập nhật chart data
  - [ ] Cập nhật completion rate cards
  - [ ] Thêm loading states
  - [ ] Thêm error handling

- [ ] **manage_school.tsx:**
  - [ ] Thêm loading state
  - [ ] Pass loading props to components
  - [ ] Implement pull-to-refresh
  - [ ] Thêm auto-refresh logic

- [ ] **Helper Functions:**
  - [ ] Implement getCurrentAcademicYear()
  - [ ] Implement getCurrentWeekNumber()
  - [ ] Implement error handling utilities

---

## 🚀 **Testing:**

1. **Test với dữ liệu thực:**
   - Kiểm tra API responses
   - Verify data mapping
   - Test loading states

2. **Test error scenarios:**
   - Network errors
   - Invalid data
   - Empty responses

3. **Test performance:**
   - Loading times
   - Memory usage
   - Refresh frequency

---

## 📝 **Notes quan trọng:**

1. **API Base URL:** Đảm bảo cấu hình đúng base URL cho API calls
2. **Authentication:** Thêm headers authentication nếu cần
3. **Error Boundaries:** Implement error boundaries cho React components
4. **Offline Support:** Consider caching data for offline usage
5. **Performance:** Implement proper memoization và optimization

---

**🎯 Kết quả mong đợi:** UI sẽ hiển thị dữ liệu thực từ backend thay vì dữ liệu cứng, với loading states và error handling phù hợp. 