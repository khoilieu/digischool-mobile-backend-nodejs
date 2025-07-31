const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/modules/auth/models/user.model');
const School = require('../src/modules/classes/models/school.model');
const Class = require('../src/modules/classes/models/class.model');
const Subject = require('../src/modules/subjects/models/subject.model');

// Kết nối database
mongoose.connect('mongodb+srv://ecoschool:BvhOtsaE9nHpklfQ@ecoschool.5nmurmb.mongodb.net/ecoschool-app-dev', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const generatePassword = (role) => {
  const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
  return `${capitalizedRole}@123`;
};

const generateEmail = (name, role) => {
  const normalizedName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.');
  return `${normalizedName}.${role}@yopmail.com`;
};

const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

const generateRandomDate = (minAge, maxAge) => {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  return new Date(minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime()));
};

const generateRandomPhone = () => {
  const prefixes = ['032', '033', '034', '035', '036', '037', '038', '039'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
};

const generateRandomAddress = () => {
  const streets = ['Nguyễn Văn Linh', 'Lê Văn Việt', 'Mai Chí Thọ', 'Võ Văn Ngân', 'Phạm Văn Đồng'];
  const districts = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Quận 9'];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const number = Math.floor(Math.random() * 200) + 1;
  return `${number} ${street}, ${district}, TP.HCM`;
};

async function setupUsers() {
  try {
    console.log('🚀 Bắt đầu setup users...');

    // 1. Xóa tất cả users hiện tại
    console.log('🗑️ Xóa tất cả users hiện tại...');
    await User.deleteMany({});
    console.log('✅ Đã xóa tất cả users');

    // 2. Tạo trường học
    console.log('🏫 Tạo trường học...');
    const school = await School.findOneAndUpdate(
      { name: 'THPT Phan Văn Trị' },
      {
        name: 'THPT Phan Văn Trị',
        address: '123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM',
        phone: '028 3776 1234',
        email: 'info@thptphanvantri.edu.vn',
        website: 'https://thptphanvantri.edu.vn',
        principal: 'Nguyễn Văn A',
        active: true
      },
      { upsert: true, new: true }
    );
    console.log('✅ Đã tạo trường học:', school.name);

    // 3. Lấy danh sách lớp và môn học
    const classes = await Class.find({ active: true });
    const subjects = await Subject.find({ isActive: true });
    
    if (classes.length === 0) {
      console.log('❌ Không tìm thấy lớp nào. Vui lòng tạo lớp trước.');
      return;
    }

    if (subjects.length === 0) {
      console.log('❌ Không tìm thấy môn học nào. Vui lòng tạo môn học trước.');
      return;
    }

    console.log(`📚 Tìm thấy ${classes.length} lớp và ${subjects.length} môn học`);

    // 4. Tạo 1 tài khoản quản lý (KHÔNG có trường children)
    console.log('👨‍💼 Tạo tài khoản quản lý...');
    const managerData = {
      role: ['manager'],
      name: 'Nguyễn Văn Quản Lý',
      email: generateEmail('Nguyễn Văn Quản Lý', 'manager'),
      passwordHash: hashPassword(generatePassword('manager')),
      managerId: 'MGR001',
      dateOfBirth: generateRandomDate(30, 50),
      gender: 'male',
      phone: generateRandomPhone(),
      address: generateRandomAddress(),
      school: school._id,
      isNewUser: false,
      active: true
    };

    const manager = await User.create(managerData);
    console.log('✅ Đã tạo tài khoản quản lý:', manager.email);

    // 5. Tạo 4 tài khoản học sinh (KHÔNG có trường children)
    console.log('👨‍🎓 Tạo tài khoản học sinh...');
    const students = [];
    const studentNames = ['Trần Văn An', 'Lê Thị Bình', 'Phạm Văn Cường', 'Hoàng Thị Dung'];

    for (let i = 0; i < Math.min(classes.length, 4); i++) {
      const studentData = {
        role: ['student'],
        name: studentNames[i],
        email: generateEmail(studentNames[i], 'student'),
        passwordHash: hashPassword(generatePassword('student')),
        studentId: `STU${String(i + 1).padStart(3, '0')}`,
        dateOfBirth: generateRandomDate(15, 18),
        gender: i % 2 === 0 ? 'male' : 'female',
        phone: generateRandomPhone(),
        address: generateRandomAddress(),
        class_id: classes[i]._id,
        academicYear: '2024-2025',
        school: school._id,
        isNewUser: false,
        active: true
      };

      const student = await User.create(studentData);
      students.push(student);
      console.log(`✅ Đã tạo học sinh ${i + 1}:`, student.email);
    }

    // 6. Tạo 4 tài khoản phụ huynh (CÓ trường children)
    console.log('👨‍👩‍👧‍👦 Tạo tài khoản phụ huynh...');
    const parentNames = ['Trần Văn Bố', 'Lê Thị Mẹ', 'Phạm Văn Cha', 'Hoàng Thị Mẹ'];

    for (let i = 0; i < students.length; i++) {
      const parentData = {
        role: ['parent'],
        name: parentNames[i],
        email: generateEmail(parentNames[i], 'parent'),
        passwordHash: hashPassword(generatePassword('parent')),
        parentId: `PAR${String(i + 1).padStart(3, '0')}`,
        dateOfBirth: generateRandomDate(35, 55),
        gender: i % 2 === 0 ? 'male' : 'female',
        phone: generateRandomPhone(),
        address: generateRandomAddress(),
        children: [students[i]._id], // Chỉ parent mới có trường children
        school: school._id,
        isNewUser: false,
        active: true
      };

      const parent = await User.create(parentData);
      console.log(`✅ Đã tạo phụ huynh ${i + 1}:`, parent.email);
    }

    console.log('🎉 Hoàn thành setup users!');
    console.log('\n📊 Thống kê:');
    console.log(`- Quản lý: 1 tài khoản`);
    console.log(`- Học sinh: ${students.length} tài khoản`);
    console.log(`- Phụ huynh: ${students.length} tài khoản`);
    console.log(`- Tổng cộng: ${1 + students.length * 2} tài khoản`);

    console.log('\n📧 Danh sách email tài khoản:');
    const allUsers = await User.find({}).select('name email role');
    allUsers.forEach(user => {
      const roleName = user.role[0];
      console.log(`${roleName.toUpperCase()}: ${user.email} (${user.name})`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    mongoose.connection.close();
  }
}

setupUsers(); 