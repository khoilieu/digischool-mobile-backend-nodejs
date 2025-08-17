const XLSX = require('xlsx');
const mongoose = require('mongoose');
const AcademicYear = require('../src/modules/schedules/models/academic-year.model');

// Kết nối database
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://ecoschool:BvhOtsaE9nHpklfQ@ecoschool.5nmurmb.mongodb.net/ecoschool-app-dev');
    console.log('✅ Đã kết nối database thành công');
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
    process.exit(1);
  }
};

// Danh sách tên phụ huynh thực tế (cha/mẹ) - 40 phụ huynh
const parentNames = [
  // Cha (20 người)
  'Nguyễn Văn Thành', 'Trần Văn Minh', 'Lê Văn Hùng', 'Phạm Văn Dũng', 'Võ Văn Sơn',
  'Nguyễn Hoàng Phúc', 'Trần Văn Tâm', 'Lê Văn Bình', 'Phạm Văn An', 'Võ Văn Cường',
  'Nguyễn Văn Đức', 'Trần Văn Nam', 'Lê Văn Quang', 'Phạm Văn Huy', 'Võ Văn Thắng',
  'Nguyễn Văn Long', 'Trần Văn Hải', 'Lê Văn Phương', 'Phạm Văn Tuấn', 'Võ Văn Hoàng',
  
  // Mẹ (20 người)
  'Nguyễn Thị Lan', 'Trần Thị Hương', 'Lê Thị Mai', 'Phạm Thị Nga', 'Võ Thị Thu',
  'Nguyễn Thị Hà', 'Trần Thị Bích', 'Lê Thị Dung', 'Phạm Thị Quỳnh', 'Võ Thị Xuân',
  'Nguyễn Thị Thanh', 'Trần Thị Ngọc', 'Lê Thị Phương', 'Phạm Thị Hồng', 'Võ Thị Nhung',
  'Nguyễn Thị Tuyết', 'Trần Thị Hoa', 'Lê Thị Cẩm', 'Phạm Thị Vân', 'Võ Thị Trang'
];

// Hàm tạo email từ tên
const generateEmail = (name) => {
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${normalizedName}.parent@yopmail.com`;
};

// Hàm tạo số điện thoại
const generatePhone = () => {
  const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
};

// Hàm tạo địa chỉ
const generateAddress = () => {
  const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12'];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const street = Math.floor(Math.random() * 100) + 1;
  const streetNames = ['Đường Nguyễn Văn Linh', 'Đường Lê Văn Việt', 'Đường Mai Chí Thọ', 'Đường Võ Văn Ngân', 'Đường Nguyễn Thị Thập'];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  return `${street} ${streetName}, ${district}, TP.HCM`;
};

// Hàm tạo mã phụ huynh
const generateParentId = (index) => {
  return `PAR${String(index + 1).padStart(3, '0')}`;
};

// Hàm tạo ngày sinh phụ huynh (35-55 tuổi)
const generateParentDateOfBirth = () => {
  const now = new Date();
  const minYear = now.getFullYear() - 55;
  const maxYear = now.getFullYear() - 35;
  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Hàm chính để tạo dữ liệu phụ huynh
const generateParentsData = async () => {
  try {
    // Kết nối database
    await connectDB();
    
    // Lấy academic year hiện tại
    const academicYear = await AcademicYear.findOne({ isActive: true });
    if (!academicYear) {
      throw new Error('Không tìm thấy năm học đang hoạt động');
    }
    
    console.log(`📚 Năm học: ${academicYear.name} (ID: ${academicYear._id})`);
    
    // Import User model để lấy học sinh từ database
    const User = require('../src/modules/auth/models/user.model');
    
    // Lấy tất cả học sinh từ database
    console.log('🔍 Đang truy vấn học sinh từ database...');
    
    const studentsFromDB = await User.find({ 
      role: 'student',
      active: true
    }).select('name studentId className').sort('studentId');
    
    if (studentsFromDB.length === 0) {
      throw new Error('Không tìm thấy học sinh nào trong database');
    }
    
    console.log(`✅ Tìm thấy ${studentsFromDB.length} học sinh trong database`);
    
    // Lấy 40 học sinh đầu tiên (hoặc tất cả nếu ít hơn 40)
    const selectedStudents = studentsFromDB.slice(0, 40);
    console.log(`🎯 Sẽ tạo ${selectedStudents.length} tài khoản phụ huynh`);
    
    // Hiển thị danh sách học sinh được chọn
    console.log('\n📚 DANH SÁCH HỌC SINH ĐƯỢC CHỌN:');
    selectedStudents.forEach((student, index) => {
      console.log(`${index + 1}. ${student.studentId}: ${student.name} (${student.className || 'Chưa phân lớp'})`);
    });
    
    const allParentsData = [];
    let parentCount = 0;
    
    // Tạo dữ liệu phụ huynh cho từng học sinh
    for (let i = 0; i < selectedStudents.length; i++) {
      const student = selectedStudents[i];
      const parentName = parentNames[i];
      parentCount++;
      
      // Xác định giới tính dựa trên tên
      const isMale = parentName.includes('Văn') || parentName.includes('Hoàng');
      const gender = isMale ? 'male' : 'female';
      
      const parentData = {
        name: parentName,
        email: generateEmail(parentName),
        dateOfBirth: generateParentDateOfBirth(),
        gender: gender,
        phone: generatePhone(),
        address: generateAddress(),
        school: 'THPT Phan Văn Trị',
        parentId: generateParentId(i),
        childStudentId: student.studentId,
        childName: student.name,
        childClassName: student.className || 'Chưa phân lớp',
        academicYear: academicYear._id.toString(),
        active: true
      };
      
      allParentsData.push(parentData);
      console.log(`✅ ${parentData.parentId}: ${parentData.name} - Cha/Mẹ của ${student.name} (${student.studentId})`);
    }
    
    // Tạo workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(allParentsData, {
      header: [
        'name',
        'email',
        'dateOfBirth',
        'gender',
        'phone',
        'address',
        'school',
        'parentId',
        'childStudentId',
        'childName',
        'childClassName',
        'academicYear',
        'active'
      ]
    });
    
    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parents');
    
    // Ghi file
    const filename = `parents_import_${academicYear.name.replace('-', '_')}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    console.log(`\n📊 TỔNG KẾT:`);
    console.log(`✅ Tổng số phụ huynh: ${parentCount}`);
    console.log(`✅ Số học sinh được chọn: ${selectedStudents.length}`);
    console.log(`✅ Tổng học sinh trong DB: ${studentsFromDB.length}`);
    console.log(`✅ Năm học: ${academicYear.name}`);
    console.log(`📁 File output: ${filename}`);
    
    // Hiển thị format Excel
    console.log('\n📋 FORMAT EXCEL CHO PARENTS:');
    console.log('| Column | Field Name | Required | Type | Description |');
    console.log('|--------|------------|----------|------|-------------|');
    console.log('| A | name | ✅ | Text | Tên phụ huynh |');
    console.log('| B | email | ✅ | Email | Email đăng nhập |');
    console.log('| C | dateOfBirth | ❌ | Date | Ngày sinh (YYYY-MM-DD) |');
    console.log('| D | gender | ❌ | Text | Giới tính (male/female/other) |');
    console.log('| E | phone | ✅ | Text | Số điện thoại |');
    console.log('| F | address | ❌ | Text | Địa chỉ |');
    console.log('| G | school | ✅ | Text | Tên trường học |');
    console.log('| H | parentId | ✅ | Text | Mã phụ huynh (unique) |');
    console.log('| I | childStudentId | ✅ | Text | Mã học sinh của con |');
    console.log('| J | childName | ❌ | Text | Tên học sinh (để dễ nhận biết) |');
    console.log('| K | childClassName | ❌ | Text | Tên lớp của con |');
    console.log('| L | academicYear | ✅ | ObjectId | ID năm học từ database |');
    console.log('| M | active | ❌ | Boolean | Trạng thái hoạt động |');
    
    // Hiển thị thống kê theo lớp
    console.log('\n📚 THỐNG KÊ THEO LỚP:');
    const classStats = {};
    selectedStudents.forEach(student => {
      const className = student.className || 'Chưa phân lớp';
      if (!classStats[className]) {
        classStats[className] = 0;
      }
      classStats[className]++;
    });
    
    Object.entries(classStats).forEach(([className, count]) => {
      console.log(`   ${className}: ${count} học sinh → ${count} phụ huynh`);
    });
    
    // Đóng kết nối database
    await mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối database');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Chạy hàm chính
generateParentsData();
