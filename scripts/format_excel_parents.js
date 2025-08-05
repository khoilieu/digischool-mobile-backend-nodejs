const XLSX = require('xlsx');

// Tạo dữ liệu mẫu cho parents
const parentsData = [
  {
    name: 'Nguyễn Văn G',
    email: 'nguyen.van.g@yopmail.com',
    dateOfBirth: '1975-05-15',
    gender: 'male',
    phone: '0901234573',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    school: 'THPT Phan Văn Trị',
    parentId: 'PAR010',
    childStudentId: 'STU001',
    active: true
  },
  {
    name: 'Trần Thị H',
    email: 'tran.thi.h@yopmail.com',
    dateOfBirth: '1980-08-20',
    gender: 'female',
    phone: '0901234574',
    address: '456 Đường XYZ, Quận 2, TP.HCM',
    school: 'THPT Phan Văn Trị',
    parentId: 'PAR020',
    childStudentId: 'STU002',
    active: true
  },
  {
    name: 'Lê Văn I',
    email: 'le.van.i@yopmail.com',
    dateOfBirth: '1978-03-10',
    gender: 'male',
    phone: '0901234575',
    address: '789 Đường DEF, Quận 3, TP.HCM',
    school: 'THPT Phan Văn Trị',
    parentId: 'PAR030',
    childStudentId: 'STU003',
    active: true
  },
  {
    name: 'Nguyễn Văn K',
    email: 'nguyen.van.k@yopmail.com',
    dateOfBirth: '1975-05-15',
    gender: 'male',
    phone: '0901234576',
    address: '789 Đường DEF, Quận 3, TP.HCM',
    school: 'THPT Phan Văn Trị',
    parentId: 'PAR040',
    childStudentId: 'STU004',
    active: true
  }
];

// Tạo workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(parentsData);

// Thêm worksheet vào workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');

// Ghi file
XLSX.writeFile(workbook, 'parents_import_template.xlsx');

console.log('✅ Đã tạo file parents_import_template.xlsx');
console.log('\n📋 FORMAT EXCEL CHO PARENTS:');
console.log('| Column | Field Name | Required | Type | Description |');
console.log('|--------|------------|----------|------|-------------|');
console.log('| A | name | ✅ | Text | Tên phụ huynh |');
console.log('| B | email | ❌ | Email | Email đăng nhập (tự động tạo nếu không có) |');
console.log('| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |');
console.log('| D | gender | ❌ | Text | Giới tính (male/female/other) |');
console.log('| E | phone | ✅ | Text | Số điện thoại |');
console.log('| F | address | ❌ | Text | Địa chỉ |');
console.log('| G | school | ✅ | Text | Tên trường học |');
console.log('| H | parentId | ✅ | Text | Mã phụ huynh (unique) |');
console.log('| I | childStudentId | ✅ | Text | Mã học sinh của con |');
console.log('| J | active | ❌ | Boolean | Trạng thái hoạt động |');