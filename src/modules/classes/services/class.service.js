const Class = require('../models/class.model');
const User = require('../../auth/models/user.model');
const jwt = require('jsonwebtoken');

class ClassService {
  // Tạo lớp học mới
  async createClass(classData, token) {
    try {
      // Verify token và kiểm tra quyền
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (!currentUser || !currentUser.role.some(role => ['manager', 'admin'].includes(role))) {
        throw new Error('Only managers and admins can create classes');
      }

      const { className, academicYear, homeroomTeacherId } = classData;

      // Validate dữ liệu đầu vào
      if (!className || !academicYear || !homeroomTeacherId) {
        throw new Error('Missing required fields: className, academicYear, homeroomTeacherId');
      }

      // Kiểm tra tên lớp đã tồn tại trong năm học này
      const existingClass = await Class.findOne({ 
        className, 
        academicYear 
      });
      
      if (existingClass) {
        throw new Error(`Class ${className} already exists in academic year ${academicYear}`);
      }

      // Kiểm tra giáo viên có tồn tại và có role phù hợp
      const teacher = await User.findById(homeroomTeacherId);
      if (!teacher) {
        throw new Error('Homeroom teacher not found');
      }

      if (!teacher.role.some(role => ['teacher', 'homeroom_teacher', 'admin'].includes(role))) {
        throw new Error('Selected user must have teacher, homeroom_teacher, or admin role');
      }

      // Kiểm tra giáo viên đã làm chủ nhiệm lớp nào khác trong năm học này chưa
      const existingHomeroomClass = await Class.findOne({
        homeroomTeacher: homeroomTeacherId,
        academicYear,
        active: true
      });

      if (existingHomeroomClass) {
        throw new Error(`Teacher is already homeroom teacher of class ${existingHomeroomClass.className} in ${academicYear}`);
      }

      // Tạo lớp mới
      const newClass = new Class({
        className,
        academicYear,
        homeroomTeacher: homeroomTeacherId,
        active: true
      });

      const savedClass = await newClass.save();

      // Cập nhật role cho giáo viên chủ nhiệm
      if (!teacher.role.includes('homeroom_teacher')) {
        teacher.role.push('homeroom_teacher');
        await teacher.save();
      }

      // Populate thông tin giáo viên chủ nhiệm và academic year
      await savedClass.populate([
        { path: 'homeroomTeacher', select: 'name email role' },
        { path: 'academicYear', select: 'name' }
      ]);

      return {
        id: savedClass._id,
        className: savedClass.className,
        academicYear: savedClass.academicYearName,
        homeroomTeacher: {
          id: savedClass.homeroomTeacher._id,
          name: savedClass.homeroomTeacher.name,
          email: savedClass.homeroomTeacher.email,
          role: savedClass.homeroomTeacher.role
        },
        active: savedClass.active,
        createdAt: savedClass.createdAt,
        updatedAt: savedClass.updatedAt
      };

    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách lớp học
  async getClasses({ page = 1, limit = 10, academicYear, search, active }) {
    try {
      const query = {};
      
      if (academicYear) {
        query.academicYear = academicYear;
      }

      if (search) {
        query.$or = [
          { className: { $regex: search, $options: 'i' } }
        ];
      }

      if (active !== undefined) {
        query.active = active;
      }

      const skip = (page - 1) * limit;
      
      const [classes, total] = await Promise.all([
        Class.find(query)
          .populate('homeroomTeacher', 'name email role')
          .populate('academicYear', 'name')
          .populate('studentCount')
          .sort({ academicYear: -1, className: 1 })
          .skip(skip)
          .limit(limit),
        Class.countDocuments(query)
      ]);

      return {
        classes: classes.map(cls => ({
          id: cls._id,
          className: cls.className,
          academicYear: cls.academicYearName,
          homeroomTeacher: {
            id: cls.homeroomTeacher._id,
            name: cls.homeroomTeacher.name,
            email: cls.homeroomTeacher.email,
            role: cls.homeroomTeacher.role
          },
          studentCount: cls.studentCount || 0,
          active: cls.active,
          createdAt: cls.createdAt,
          updatedAt: cls.updatedAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin chi tiết lớp học
  async getClassById(id) {
    try {
      const classInfo = await Class.findById(id)
        .populate('homeroomTeacher', 'name email role dateOfBirth gender')
        .populate('academicYear', 'name')
        .populate('studentCount');

      if (!classInfo) {
        throw new Error('Class not found');
      }

      // Lấy danh sách học sinh trong lớp
      const students = await classInfo.getStudents();

      return {
        id: classInfo._id,
        className: classInfo.className,
        academicYear: classInfo.academicYearName,
        homeroomTeacher: {
          id: classInfo.homeroomTeacher._id,
          name: classInfo.homeroomTeacher.name,
          email: classInfo.homeroomTeacher.email,
          role: classInfo.homeroomTeacher.role,
          dateOfBirth: classInfo.homeroomTeacher.dateOfBirth,
          gender: classInfo.homeroomTeacher.gender
        },
        students: students.map(student => ({
          id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender
        })),
        studentCount: students.length,
        active: classInfo.active,
        createdAt: classInfo.createdAt,
        updatedAt: classInfo.updatedAt
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách giáo viên có thể làm chủ nhiệm
  async getAvailableHomeroomTeachers(academicYear) {
    try {
      // Lấy danh sách giáo viên có role teacher hoặc homeroom_teacher
      const teachers = await User.find({
        role: { $in: ['teacher', 'homeroom_teacher', 'admin'] },
        active: true
      }).select('name email role');

      // Lấy danh sách giáo viên đã làm chủ nhiệm trong năm học này
      const busyTeachers = await Class.find({
        academicYear,
        active: true
      }).select('homeroomTeacher');

      const busyTeacherIds = busyTeachers.map(cls => cls.homeroomTeacher.toString());

      // Lọc ra những giáo viên chưa làm chủ nhiệm
      const availableTeachers = teachers.filter(teacher => 
        !busyTeacherIds.includes(teacher._id.toString())
      );

      return availableTeachers.map(teacher => ({
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role
      }));

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ClassService();
