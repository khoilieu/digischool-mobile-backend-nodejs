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

// Danh sách tên học sinh thực tế cho từng lớp
const studentsByClass = {
  "12A1": [
    { name: 'Nguyễn Văn An', gender: 'male', dateOfBirth: '2006-03-15' },
    { name: 'Trần Thị Bình', gender: 'female', dateOfBirth: '2006-07-22' },
    { name: 'Lê Hoàng Cường', gender: 'male', dateOfBirth: '2006-11-08' },
    { name: 'Phạm Thị Diễm', gender: 'female', dateOfBirth: '2006-05-14' },
    { name: 'Võ Văn Đức', gender: 'male', dateOfBirth: '2006-09-30' },
    { name: 'Nguyễn Thị Hà', gender: 'female', dateOfBirth: '2006-01-25' },
    { name: 'Trần Quang Hùng', gender: 'male', dateOfBirth: '2006-12-03' },
    { name: 'Lê Thị Kim', gender: 'female', dateOfBirth: '2006-04-18' },
    { name: 'Phạm Văn Lâm', gender: 'male', dateOfBirth: '2006-08-12' },
    { name: 'Võ Thị Mai', gender: 'female', dateOfBirth: '2006-06-28' }
  ],
  "12A2": [
    { name: 'Nguyễn Hoàng Nam', gender: 'male', dateOfBirth: '2006-02-10' },
    { name: 'Trần Thị Ngọc', gender: 'female', dateOfBirth: '2006-10-05' },
    { name: 'Lê Văn Phúc', gender: 'male', dateOfBirth: '2006-12-20' },
    { name: 'Phạm Thị Quỳnh', gender: 'female', dateOfBirth: '2006-03-08' },
    { name: 'Võ Hoàng Sinh', gender: 'male', dateOfBirth: '2006-07-15' },
    { name: 'Nguyễn Thị Thanh', gender: 'female', dateOfBirth: '2006-11-25' },
    { name: 'Trần Văn Thành', gender: 'male', dateOfBirth: '2006-05-12' },
    { name: 'Lê Thị Uyên', gender: 'female', dateOfBirth: '2006-09-18' },
    { name: 'Phạm Hoàng Vinh', gender: 'male', dateOfBirth: '2006-01-30' },
    { name: 'Võ Thị Xuân', gender: 'female', dateOfBirth: '2006-06-22' }
  ],
  "12A3": [
    { name: 'Nguyễn Văn Yên', gender: 'male', dateOfBirth: '2006-04-05' },
    { name: 'Trần Thị Zương', gender: 'female', dateOfBirth: '2006-08-14' },
    { name: 'Lê Hoàng An', gender: 'male', dateOfBirth: '2006-12-08' },
    { name: 'Phạm Thị Bích', gender: 'female', dateOfBirth: '2006-02-16' },
    { name: 'Võ Văn Cường', gender: 'male', dateOfBirth: '2006-10-25' },
    { name: 'Nguyễn Thị Dung', gender: 'female', dateOfBirth: '2006-06-03' },
    { name: 'Trần Quang Em', gender: 'male', dateOfBirth: '2006-01-19' },
    { name: 'Lê Thị Phương', gender: 'female', dateOfBirth: '2006-07-28' },
    { name: 'Phạm Văn Quang', gender: 'male', dateOfBirth: '2006-11-12' },
    { name: 'Võ Thị Thảo', gender: 'female', dateOfBirth: '2006-05-07' }
  ],
  "12B": [
    { name: 'Nguyễn Văn Bảo', gender: 'male', dateOfBirth: '2006-09-20' },
    { name: 'Trần Thị Cẩm', gender: 'female', dateOfBirth: '2006-03-14' },
    { name: 'Lê Hoàng Dũng', gender: 'male', dateOfBirth: '2006-12-01' },
    { name: 'Phạm Thị Hương', gender: 'female', dateOfBirth: '2006-08-09' },
    { name: 'Võ Văn Khang', gender: 'male', dateOfBirth: '2006-04-26' },
    { name: 'Nguyễn Thị Lan', gender: 'female', dateOfBirth: '2006-10-17' },
    { name: 'Trần Quang Minh', gender: 'male', dateOfBirth: '2006-06-11' },
    { name: 'Lê Thị Nga', gender: 'female', dateOfBirth: '2006-02-23' },
    { name: 'Phạm Văn Phát', gender: 'male', dateOfBirth: '2006-11-05' },
    { name: 'Võ Thị Quyên', gender: 'female', dateOfBirth: '2006-07-30' }
  ]
};

// Hàm tạo email từ tên
const generateEmail = (name) => {
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${normalizedName}.student@yopmail.com`;
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

// Hàm tạo mã học sinh
const generateStudentId = (className, index) => {
  const classNumber = className.replace(/\D/g, '');
  const classLetter = className.replace(/\d/g, '');
  return `STU${classNumber}${classLetter}${String(index + 1).padStart(2, '0')}`;
};

// Hàm chính để tạo dữ liệu học sinh
const generateStudentsData = async () => {
  try {
    // Kết nối database
    await connectDB();
    
    // Lấy academic year hiện tại
    const academicYear = await AcademicYear.findOne({ isActive: true });
    if (!academicYear) {
      throw new Error('Không tìm thấy năm học đang hoạt động');
    }
    
    console.log(`📚 Năm học: ${academicYear.name} (ID: ${academicYear._id})`);
    
    const allStudentsData = [];
    let studentCount = 0;
    
    // Tạo dữ liệu cho từng lớp
    for (const [className, students] of Object.entries(studentsByClass)) {
      console.log(`\n🔄 Đang tạo dữ liệu cho lớp ${className}...`);
      
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        studentCount++;
        
        const studentData = {
          name: student.name,
          email: generateEmail(student.name),
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          phone: generatePhone(),
          address: generateAddress(),
          school: 'THPT Phan Văn Trị',
          studentId: generateStudentId(className, i),
          className: className,
          academicYear: academicYear._id.toString(), // Sử dụng ID từ database
          active: true
        };
        
        allStudentsData.push(studentData);
        console.log(`✅ ${studentData.studentId}: ${studentData.name}`);
      }
    }
    
    // Tạo workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(allStudentsData, {
      header: [
        'name',
        'email', 
        'dateOfBirth',
        'gender',
        'phone',
        'address',
        'school',
        'studentId',
        'className',
        'academicYear',
        'active'
      ]
    });
    
    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Ghi file
    const filename = `students_import_${academicYear.name.replace('-', '_')}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    console.log(`\n📊 TỔNG KẾT:`);
    console.log(`✅ Tổng số học sinh: ${studentCount}`);
    console.log(`✅ Số lớp: ${Object.keys(studentsByClass).length}`);
    console.log(`✅ Mỗi lớp: ${studentsByClass["12A1"].length} học sinh`);
    console.log(`✅ Năm học: ${academicYear.name}`);
    console.log(`📁 File output: ${filename}`);
    
    // Hiển thị format Excel
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
    console.log('| J | academicYear | ✅ | ObjectId | ID năm học từ database |');
    console.log('| K | active | ❌ | Boolean | Trạng thái hoạt động |');
    
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
generateStudentsData();
