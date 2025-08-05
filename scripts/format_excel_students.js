const XLSX = require('xlsx');

// Tạo dữ liệu mẫu cho students
const studentsData = [
  {
    name: 'Nguyễn Văn A',
    email: 'nguyen.van.a@yopmail.com',
    dateOfBirth: '2008-05-15',
    gender: 'male',
    phone: '0901234567',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    school: 'THPT Phan Văn Trị',
    studentId: 'STU010',
    className: '12A1',
    academicYear: '2024-2025',
    active: true
  },
  {
    name: 'Trần Thị B',
    email: 'tran.thi.b@yopmail.com',
    dateOfBirth: '2008-08-20',
    gender: 'female',
    phone: '0901234568',
    address: '456 Đường XYZ, Quận 2, TP.HCM',
    school: 'THPT Phan Văn Trị',
    studentId: 'STU020',
    className: '12A2',
    academicYear: '2024-2025',
    active: true
  },
  {
    name: 'Lê Văn C',
    email: 'le.van.c@yopmail.com',
    dateOfBirth: '2008-03-10',
    gender: 'male',
    phone: '0901234569',
    address: '789 Đường DEF, Quận 3, TP.HCM',
    school: 'THPT Phan Văn Trị',
    studentId: 'STU030',
    className: '12A3',
    academicYear: '2024-2025',
    active: true
  },
  {
    name: 'Nguyễn Văn D',
    email: 'nguyen.van.d@yopmail.com',
    dateOfBirth: '2008-07-10',
    gender: 'male',
    phone: '0901234589',
    address: '789 Đường DEF, Quận 10, TP.HCM',
    school: 'THPT Phan Văn Trị',
    studentId: 'STU040',
    className: '12B',
    academicYear: '2024-2025',
    active: true
  }
];

// Tạo workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(studentsData);

// Thêm worksheet vào workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

// Ghi file
XLSX.writeFile(workbook, 'students_import_template.xlsx');

console.log('✅ Đã tạo file students_import_template.xlsx');
console.log('\n📋 FORMAT EXCEL CHO STUDENTS:');
console.log('| Column | Field Name | Required | Type | Description |');
console.log('|--------|------------|----------|------|-------------|');
console.log('| A | name | ✅ | Text | Tên học sinh |');
console.log('| B | email | ✅ | Email | Email đăng nhập |');
console.log('| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |');
console.log('| D | gender | ❌ | Text | Giới tính (male/female/other) |');
console.log('| E | phone | ❌ | Text | Số điện thoại |');
console.log('| F | address | ❌ | Text | Địa chỉ |');
console.log('| G | school | ✅ | Text | Tên trường học |');
console.log('| H | studentId | ✅ | Text | Mã học sinh (unique) |');
console.log('| I | className | ✅ | Text | Tên lớp học |');
console.log('| J | academicYear | ❌ | Text | Năm học (YYYY-YYYY) |');
console.log('| K | active | ❌ | Boolean | Trạng thái hoạt động |');