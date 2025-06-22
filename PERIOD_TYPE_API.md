# Period Type Management API

## Tổng quan tính năng mới

Hệ thống đã được cập nhật với khả năng phân loại tiết học:

### Loại tiết học:
- **regular**: Tiết chính quy 
- **makeup**: Tiết dạy bù
- **extracurricular**: Hoạt động ngoại khóa  
- **fixed**: Tiết cố định (chào cờ, sinh hoạt lớp)

## API Endpoints

### 1. Thống kê theo loại tiết học
```
GET /api/schedules/period-type-statistics?className=12A4&academicYear=2024-2025
```

### 2. Danh sách tiết theo loại
```
GET /api/schedules/periods-by-type?className=12A4&academicYear=2024-2025&periodType=regular
```

### 3. Nhận biết loại tiết học
```
GET /api/schedules/identify-period-type?className=12A4&academicYear=2024-2025&dayOfWeek=2&periodNumber=1
```

### 4. Kiểm tra slot trống
```
GET /api/schedules/available-slots?className=12A4&academicYear=2024-2025
```

### 5. Thêm tiết dạy bù
```
POST /api/schedules/:scheduleId/periods/makeup
```

### 6. Thêm hoạt động ngoại khóa
```
POST /api/schedules/:scheduleId/periods/extracurricular
```

## Model Updates

- Thêm trường `periodType` vào periodSchema
- Thêm `makeupInfo` cho tiết dạy bù
- Thêm `extracurricularInfo` cho hoạt động ngoại khóa
- Các method mới: `getPeriodTypeStatistics()`, `identifyPeriodType()`, `canAddPeriod()`, etc. 