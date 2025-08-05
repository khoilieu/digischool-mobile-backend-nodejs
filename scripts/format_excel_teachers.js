const XLSX = require('xlsx');

// Tạo dữ liệu mẫu cho teachers
const teachersData = [
  {
    name: 'Nguyễn Thị D',
    email: 'nguyen.thi.d@yopmail.com',
    dateOfBirth: '1985-12-15',
    gender: 'female',
    phone: '0901234570',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    school: 'THPT Phan Văn Trị',
    teacherId: 'TCH100',
    subjectName: 'Toán',
    active: true
  },
  {
    name: 'Trần Văn E',
    email: 'tran.van.e@yopmail.com',
    dateOfBirth: '1990-08-20',
    gender: 'male',
    phone: '0901234571',
    address: '456 Đường XYZ, Quận 2, TP.HCM',
    school: 'THPT Phan Văn Trị',
    teacherId: 'TCH200',
    subjectName: 'Văn',
    active: true
  },
  {
    name: 'Lê Thị F',
    email: 'le.thi.f@yopmail.com',
    dateOfBirth: '1988-03-10',
    gender: 'female',
    phone: '0901234572',
    address: '789 Đường DEF, Quận 3, TP.HCM',
    school: 'THPT Phan Văn Trị',
    teacherId: 'TCH300',
    subjectName: 'Tiếng Anh',
    active: true
  }
];

// Tạo workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(teachersData);

// Thêm worksheet vào workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');

// Ghi file
XLSX.writeFile(workbook, 'teachers_import_template.xlsx');

console.log('✅ Đã tạo file teachers_import_template.xlsx');
console.log('\n📋 FORMAT EXCEL CHO TEACHERS:');
console.log('| Column | Field Name | Required | Type | Description |');
console.log('|--------|------------|----------|------|-------------|');
console.log('| A | name | ✅ | Text | Tên giáo viên |');
console.log('| B | email | ✅ | Email | Email đăng nhập |');
console.log('| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |');
console.log('| D | gender | ❌ | Text | Giới tính (male/female/other) |');
console.log('| E | phone | ❌ | Text | Số điện thoại |');
console.log('| F | address | ❌ | Text | Địa chỉ |');
console.log('| G | school | ✅ | Text | Tên trường học |');
console.log('| H | teacherId | ✅ | Text | Mã giáo viên (unique) |');
console.log('| I | subjectName | ✅ | Text | Tên môn học |');
console.log('| J | active | ❌ | Boolean | Trạng thái hoạt động |');