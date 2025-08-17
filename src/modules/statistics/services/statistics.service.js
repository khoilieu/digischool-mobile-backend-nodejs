const User = require("../../auth/models/user.model");
const Class = require("../../classes/models/class.model");
const Lesson = require("../../schedules/models/lesson.model");
const TeacherLessonEvaluation = require("../../schedules/models/teacher-lesson-evaluation.model");
const StudentLessonEvaluation = require("../../schedules/models/student-lesson-evaluation.model");
const TimeSlot = require("../../schedules/models/time-slot.model");
const WeeklySchedule = require("../../schedules/models/weekly-schedule.model");
const AcademicYear = require("../../schedules/models/academic-year.model");
const LessonRequirement = require("../models/lesson-requirement.model");
const Subject = require("../../subjects/models/subject.model");

const mongoose = require("mongoose");

class StatisticsService {
  /**
   * Lấy thống kê sĩ số toàn trường theo ngày
   */
  async getDailyStatistics(targetDate) {
    try {
      // Lấy ngày bắt đầu và kết thúc của ngày
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Đếm sĩ số theo role
      const [students, teachers, managers] = await Promise.all([
        User.countDocuments({ 
          role: { $in: ['student'] }, 
          active: true 
        }),
        User.countDocuments({ 
          role: { $in: ['teacher', 'homeroom_teacher'] }, 
          active: true 
        }),
        User.countDocuments({ 
          role: { $in: ['manager', 'admin'] }, 
          active: true 
        })
      ]);

      // Lấy thống kê theo khối
      const gradeStats = await this.getGradeLevelStatistics();

      return {
        date: targetDate,
        total: students + teachers + managers,
        breakdown: {
          students,
          teachers,
          managers
        },
        gradeLevels: gradeStats
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê ngày: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê sĩ số theo khối
   */
  async getGradeLevelStatistics() {
    try {
      const gradeStats = await Class.aggregate([
        {
          $lookup: {
            from: 'users',
            let: { classId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$class_id', '$$classId'] },
                  role: { $in: ['student'] },
                  active: true
                }
              }
            ],
            as: 'students'
          }
        },
        {
          $group: {
            _id: '$gradeLevel',
            count: { $sum: { $size: '$students' } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Chuyển đổi thành object với key là gradeLevel
      const result = {};
      gradeStats.forEach(stat => {
        result[`grade${stat._id}`] = stat.count;
      });

      return result;
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê khối: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê điểm danh giáo viên theo ngày
   * Giáo viên được tính là đã điểm danh khi họ xác nhận lesson completed
   * (không phải khi đánh giá tiết học)
   */
  async getTeacherAttendanceStatistics(targetDate) {
    try {
      // Lấy ngày bắt đầu và kết thúc của ngày
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Tổng số giáo viên
      const totalTeachers = await User.countDocuments({ 
        role: { $in: ['teacher', 'homeroom_teacher'] }, 
        active: true 
      });

      // Tìm các giáo viên đã điểm danh (có lesson completed trong ngày)
      // Giáo viên được tính là đã điểm danh khi họ xác nhận lesson completed
      const attendedTeachers = await Lesson.distinct('teacher', {
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed',
        teacher: { $exists: true, $ne: null }
      });

      const attendedCount = attendedTeachers.length;

      return {
        date: targetDate,
        total: totalTeachers,
        attended: attendedCount,
        absent: totalTeachers - attendedCount,
        attendanceRate: totalTeachers > 0 ? Math.round((attendedCount / totalTeachers) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê điểm danh giáo viên: ${error.message}`);
    }
  }

  /**
   * Lấy dữ liệu biểu đồ học sinh theo buổi
   */
  async getStudentChartData(targetDate, session) {
    try {
      // Lấy ngày bắt đầu và kết thúc của ngày
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy các time slots theo session
      const timeSlots = await TimeSlot.find({ 
        type: session,
        isActive: true 
      }).sort({ period: 1 });

      const chartData = [];

      // Duyệt qua từng tiết
      for (const timeSlot of timeSlots) {
        const periodData = {
          period: timeSlot.period,
          grade10: 0,
          grade11: 0,
          grade12: 0
        };

        // Lấy các lesson trong tiết này dựa trên timeSlot (bao gồm cả scheduled và completed)
        const lessons = await Lesson.find({
          scheduledDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate([
          { path: 'class', select: 'className gradeLevel' },
          { path: 'timeSlot', select: 'period type' }
        ]);

        // Lọc lessons theo timeSlot
        const relevantLessons = lessons.filter(lesson => {
          return lesson.timeSlot && 
                 lesson.timeSlot.period === timeSlot.period && 
                 lesson.timeSlot.type === session;
        });

        // Tính số học sinh theo khối (có mặt, không tính vắng)
        for (const lesson of relevantLessons) {
          if (lesson.class && lesson.class.gradeLevel) {
            // Lấy tổng sĩ số của lớp
            const totalStudents = await User.countDocuments({
              class_id: lesson.class._id,
              role: 'student',
              active: true
            });

            // Nếu lesson đã completed, kiểm tra evaluation để tính học sinh vắng
            let studentsPresent = totalStudents;
            if (lesson.status === 'completed') {
              const evaluation = await TeacherLessonEvaluation.findOne({
                lesson: lesson._id
              });
              
              if (evaluation && evaluation.absentStudents) {
                // Trừ số học sinh vắng
                studentsPresent = Math.max(0, totalStudents - evaluation.absentStudents.length);
              }
            }

            // Thêm vào theo khối
            const gradeLevel = lesson.class.gradeLevel;
            if (gradeLevel === 'grade10' || gradeLevel === 10) {
              periodData.grade10 += studentsPresent;
            } else if (gradeLevel === 'grade11' || gradeLevel === 11) {
              periodData.grade11 += studentsPresent;
            } else if (gradeLevel === 'grade12' || gradeLevel === 12) {
              periodData.grade12 += studentsPresent;
            }
          }
        }

        chartData.push(periodData);
      }

      return {
        date: targetDate,
        session,
        periods: chartData
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy dữ liệu biểu đồ học sinh: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê sĩ số toàn trường theo tuần
   */
  async getWeeklyStatistics(weekNumber, academicYearId) {
    try {
      // Lấy thông tin tuần học từ database
      const weeklySchedule = await WeeklySchedule.findOne({
        weekNumber,
        academicYear: academicYearId
      }).populate('academicYear');

      if (!weeklySchedule) {
        throw new Error(`Không tìm thấy thời khóa biểu tuần ${weekNumber} của năm học ${academicYearId}`);
      }

      const { startDate, endDate } = weeklySchedule;
      const weeklyData = [];
      const currentDate = new Date(startDate);

      // Duyệt qua từng ngày trong tuần học
      while (currentDate <= endDate) {
        // Lấy thống kê học sinh có mặt thực tế
        const studentsPresent = await this.getStudentAttendanceForDay(currentDate);
        
        // Lấy thống kê giáo viên có mặt thực tế
        const teacherStats = await this.getTeacherAttendanceForDay(currentDate);
        
        // Lấy thống kê tổng quan
        const dayStats = await this.getDailyStatistics(currentDate);
        
        weeklyData.push({
          date: new Date(currentDate),
          dayOfWeek: currentDate.getDay(),
          dayName: this.getDayName(currentDate.getDay()),
          total: dayStats.total,
          breakdown: dayStats.breakdown,
          gradeLevels: dayStats.gradeLevels,
          studentsPresent,
          teacherStats
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        weekNumber,
        academicYear: weeklySchedule.academicYear.name,
        startDate,
        endDate,
        weeklyData
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê tuần: ${error.message}`);
    }
  }

  /**
   * Lấy tỷ lệ hoàn thành của học sinh và giáo viên
   */
  async getCompletionRates(weekNumber, academicYearId) {
    try {
      // Lấy thông tin tuần học từ database
      const weeklySchedule = await WeeklySchedule.findOne({
        weekNumber,
        academicYear: academicYearId
      }).populate('academicYear');

      if (!weeklySchedule) {
        throw new Error(`Không tìm thấy thời khóa biểu tuần ${weekNumber} của năm học ${academicYearId}`);
      }

      const { startDate, endDate } = weeklySchedule;

      // Lấy tổng số học sinh và giáo viên
      const [totalStudents, totalTeachers] = await Promise.all([
        User.countDocuments({ 
          role: { $in: ['student'] }, 
          active: true 
        }),
        User.countDocuments({ 
          role: { $in: ['teacher', 'homeroom_teacher'] }, 
          active: true 
        })
      ]);

      // Lấy lessons completed trong khoảng thời gian của tuần học
      const completedLessons = await Lesson.find({
        scheduledDate: { $gte: startDate, $lte: endDate },
        status: 'completed'
      });

      // Lấy evaluations trong khoảng thời gian của tuần học
      const evaluations = await TeacherLessonEvaluation.find({
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Tính số học sinh có evaluation (đã được đánh giá)
      const studentsWithEvaluations = new Set();
      evaluations.forEach(evaluation => {
        if (evaluation.absentStudents) {
          evaluation.absentStudents.forEach(absentStudent => {
            if (absentStudent.student) {
              studentsWithEvaluations.add(absentStudent.student.toString());
            }
          });
        }
      });

      // Lấy tất cả học sinh từ các lớp có lesson completed
      const studentsInCompletedClasses = await User.find({
        class_id: { $in: completedLessons.map(l => l.class) },
        role: 'student',
        active: true
      });

      // Tính số học sinh đã hoàn thành (có mặt trong lesson completed)
      const studentsCompleted = studentsInCompletedClasses.filter(student => 
        !studentsWithEvaluations.has(student._id.toString())
      ).length;

      // Tính số giáo viên có evaluation
      const teachersWithEvaluations = new Set();
      evaluations.forEach(evaluation => {
        if (evaluation.teacher) {
          teachersWithEvaluations.add(evaluation.teacher.toString());
        }
      });

      const studentCompletionRate = totalStudents > 0 
        ? Math.round((studentsCompleted / totalStudents) * 100) 
        : 0;

      const teacherCompletionRate = totalTeachers > 0 
        ? Math.round((teachersWithEvaluations.size / totalTeachers) * 100) 
        : 0;

      return {
        weekNumber,
        academicYear: weeklySchedule.academicYear.name,
        period: { startDate, endDate },
        students: {
          total: totalStudents,
          completed: studentsCompleted,
          rate: studentCompletionRate
        },
        teachers: {
          total: totalTeachers,
          completed: teachersWithEvaluations.size,
          rate: teacherCompletionRate
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy tỷ lệ hoàn thành: ${error.message}`);
    }
  }

  /**
   * Lấy dữ liệu điểm danh giáo viên theo ngày
   * Logic: Giáo viên được coi là đã điểm danh nếu có lesson với status 'completed' trong ngày
   * Trả về thông tin tiết học đã hoàn thành đầu tiên của mỗi giáo viên
   */
  async getTeacherRollcallData(targetDate, filters = {}) {
    try {
      const { status, subject, weekNumber, academicYear } = filters;
      
      // Kiểm tra targetDate có hợp lệ không
      if (!targetDate || isNaN(new Date(targetDate).getTime())) {
        throw new Error("Ngày không hợp lệ");
      }
      
      // Lấy ngày bắt đầu và kết thúc của ngày
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy tất cả lessons trong ngày
      const lessonsQuery = {
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        teacher: { $exists: true, $ne: null },
        type: { $ne: 'empty' }
      };

      // Filter theo môn học nếu có
      if (subject && subject !== 'Tất cả') {
        const subjectDoc = await require('../../subjects/models/subject.model').findOne({ 
          subjectName: subject 
        });
        if (subjectDoc) {
          lessonsQuery.subject = subjectDoc._id;
        }
      }

      const lessons = await Lesson.find(lessonsQuery)
        .populate([
          { path: 'teacher', select: 'name email' },
          { path: 'class', select: 'className gradeLevel' },
          { path: 'subject', select: 'subjectName subjectCode' },
          { path: 'timeSlot', select: 'period startTime endTime type' }
        ])
        .sort({ 'timeSlot.period': 1 });

      // Lấy teacher evaluations trong ngày
      const evaluations = await TeacherLessonEvaluation.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).populate('lesson');

      // Tạo map để dễ lookup
      const evaluationMap = new Map();
      evaluations.forEach(evaluation => {
        if (evaluation && evaluation.lesson) {
          evaluationMap.set(evaluation.lesson.toString(), evaluation);
        }
      });

      // Nhóm lessons theo teacher
      const teacherLessonsMap = new Map();
      lessons.forEach(lesson => {
        // Kiểm tra lesson.teacher có tồn tại không
        if (!lesson.teacher || !lesson.teacher._id) {
          return; // Bỏ qua lesson này
        }
        
        const teacherId = lesson.teacher._id.toString();
        if (!teacherLessonsMap.has(teacherId)) {
          teacherLessonsMap.set(teacherId, []);
        }
        teacherLessonsMap.get(teacherId).push(lesson);
      });

      // Tạo danh sách điểm danh
      const rollcalls = [];
      for (const [teacherId, teacherLessons] of teacherLessonsMap) {
        // Kiểm tra teacherLessons có dữ liệu không
        if (!teacherLessons || teacherLessons.length === 0) {
          continue;
        }
        
        // Tìm tiết học đã hoàn thành đầu tiên của giáo viên trong ngày
        let completedLesson = null;
        let completedEvaluation = null;
        
        // Sắp xếp theo period để tìm tiết hoàn thành đầu tiên
        teacherLessons.sort((a, b) => {
          if (!a.timeSlot || !b.timeSlot) return 0;
          return a.timeSlot.period - b.timeSlot.period;
        });
        
        for (const lesson of teacherLessons) {
          // Kiểm tra lesson có tồn tại không
          if (!lesson) {
            continue;
          }
          
          // Kiểm tra status của lesson thay vì đánh giá
          if (lesson.status === 'completed') {
            completedLesson = lesson;
            // Tìm đánh giá tương ứng nếu có
            completedEvaluation = evaluationMap.get(lesson._id.toString()) || null;
            break; // Tìm thấy tiết hoàn thành đầu tiên
          }
        }

        // Nếu không có tiết nào hoàn thành, lấy tiết đầu tiên với trạng thái "Chưa điểm danh"
        if (!completedLesson) {
          if (teacherLessons.length > 0) {
            completedLesson = teacherLessons[0];
          } else {
            continue;
          }
        }

        // Tính toán trạng thái điểm danh
        const attendanceStatus = this.calculateAttendanceStatus(completedLesson, completedEvaluation);
        
        // Filter theo trạng thái nếu có
        if (status && status !== 'Tất cả') {
          if (status === 'Đã điểm danh' && attendanceStatus !== 'Đã điểm danh') continue;
          if (status === 'Chưa điểm danh' && attendanceStatus !== 'Chưa điểm danh') continue;
          if (status === 'Trễ' && attendanceStatus !== 'Trễ') continue;
        }

        // Kiểm tra các thuộc tính cần thiết trước khi tạo rollcall
        if (!completedLesson.teacher || !completedLesson.teacher._id) {
          continue;
        }
        
        if (!completedLesson.class || !completedLesson.class.className) {
          continue;
        }
        
        if (!completedLesson.subject || !completedLesson.subject.subjectName) {
          continue;
        }
        
        if (!completedLesson.timeSlot) {
          continue;
        }
        
        rollcalls.push({
          teacherId: completedLesson.teacher._id,
          teacherName: completedLesson.teacher.name,
          class: completedLesson.class.className,
          subject: completedLesson.subject.subjectName,
          period: completedLesson.timeSlot.period,
          startTime: completedLesson.timeSlot.startTime,
          endTime: completedLesson.timeSlot.endTime,
          status: attendanceStatus,
          completedAt: completedEvaluation ? completedEvaluation.createdAt : null,
          lessonId: completedLesson._id
        });
      }

      // Tính toán thống kê
      const totalTeachers = rollcalls.length;
      const attended = rollcalls.filter(r => r.status === 'Đã điểm danh').length;
      const absent = rollcalls.filter(r => r.status === 'Chưa điểm danh').length;
      const late = rollcalls.filter(r => r.status === 'Trễ').length;

      return {
        date: targetDate,
        totalTeachers,
        attended,
        absent,
        late,
        rollcalls: rollcalls.sort((a, b) => a.period - b.period)
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy dữ liệu điểm danh giáo viên: ${error.message}`);
    }
  }

  /**
   * Tính toán trạng thái điểm danh
   * Logic: Kiểm tra status của lesson trước, sau đó kiểm tra thời gian đánh giá nếu có
   */
  calculateAttendanceStatus(lesson, evaluation) {
    // Kiểm tra status của lesson trước
    if (lesson.status !== 'completed') {
      return 'Chưa điểm danh';
    }

    // Nếu lesson đã completed nhưng không có đánh giá, vẫn coi là đã điểm danh
    if (!evaluation) {
      return 'Đã điểm danh';
    }

    // Kiểm tra nếu hoàn thành sau thời gian kết thúc tiết học
    const lessonEndTime = new Date(lesson.scheduledDate);
    const [endHour, endMinute] = lesson.timeSlot.endTime.split(':');
    lessonEndTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    if (evaluation.createdAt > lessonEndTime) {
      return 'Trễ';
    }

    return 'Đã điểm danh';
  }

  /**
   * Helper function để lấy tên ngày trong tuần
   */
  getDayName(dayOfWeek) {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayOfWeek];
  }

  /**
   * Lấy danh sách ngày trong tuần dựa trên TKB
   */
  async getWeekDays(weekNumber, academicYear, className) {
    try {
      // Nếu không có weekNumber, lấy tuần hiện tại
      const currentWeekNumber = weekNumber || this.getCurrentWeekNumber();
      
      // Nếu không có academicYear, lấy năm học hiện tại
      let targetAcademicYear = academicYear;
      let academicYearDoc;
      
      if (!targetAcademicYear) {
        academicYearDoc = await AcademicYear.findOne({ isActive: true });
        if (academicYearDoc) {
          targetAcademicYear = academicYearDoc.name;
        } else {
          throw new Error("Không tìm thấy năm học hiện tại");
        }
      } else {
        // Nếu academicYear là ObjectId, tìm trực tiếp
        if (mongoose.Types.ObjectId.isValid(targetAcademicYear)) {
          academicYearDoc = await AcademicYear.findById(targetAcademicYear);
        } else {
          // Nếu là string, tìm theo name
          academicYearDoc = await AcademicYear.findOne({ name: targetAcademicYear });
        }
        
        if (!academicYearDoc) {
          throw new Error(`Không tìm thấy năm học ${targetAcademicYear}`);
        }
      }

      // Tìm weekly schedule
      let weeklySchedule;
      if (className) {
        // Nếu có className, tìm theo lớp cụ thể
        const classDoc = await Class.findOne({ 
          className: className, 
          academicYear: academicYearDoc._id 
        });
        if (!classDoc) {
          throw new Error(`Không tìm thấy lớp ${className} trong năm học ${targetAcademicYear}`);
        }

        weeklySchedule = await WeeklySchedule.findOne({
          class: classDoc._id,
          academicYear: academicYearDoc._id,
          weekNumber: currentWeekNumber
        });
      } else {
        // Nếu không có className, lấy weekly schedule đầu tiên tìm được
        weeklySchedule = await WeeklySchedule.findOne({
          academicYear: academicYearDoc._id,
          weekNumber: currentWeekNumber
        });
      }

      if (!weeklySchedule) {
        // Nếu không tìm thấy weekly schedule, tạo danh sách ngày dựa trên academic year
        return this.generateWeekDaysFromAcademicYear(academicYearDoc, currentWeekNumber);
      }

      // Tạo danh sách ngày từ startDate đến endDate
      const weekDays = [];
      const currentDate = new Date(weeklySchedule.startDate);
      const endDate = new Date(weeklySchedule.endDate);

      while (currentDate <= endDate) {
        weekDays.push({
          date: new Date(currentDate),
          dayOfWeek: currentDate.getDay(),
          dayName: this.getDayName(currentDate.getDay()),
          formattedDate: this.formatDate(currentDate),
          isToday: this.isToday(currentDate)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        weekNumber: currentWeekNumber,
        academicYear: targetAcademicYear,
        className: className || null,
        startDate: weeklySchedule.startDate,
        endDate: weeklySchedule.endDate,
        days: weekDays
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách ngày trong tuần: ${error.message}`);
    }
  }

  /**
   * Tạo danh sách ngày từ academic year khi không có weekly schedule
   */
  generateWeekDaysFromAcademicYear(academicYearDoc, weekNumber) {
    const startDate = new Date(academicYearDoc.startDate);
    const weekStartDate = new Date(startDate);
    weekStartDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

    const weekDays = [];
    const currentDate = new Date(weekStartDate);
    const endDate = new Date(weekStartDate);
    endDate.setDate(weekStartDate.getDate() + 6);

    while (currentDate <= endDate) {
      weekDays.push({
        date: new Date(currentDate),
        dayOfWeek: currentDate.getDay(),
        dayName: this.getDayName(currentDate.getDay()),
        formattedDate: this.formatDate(currentDate),
        isToday: this.isToday(currentDate)
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      weekNumber: weekNumber,
      academicYear: academicYearDoc.name,
      className: null,
      startDate: weekStartDate,
      endDate: endDate,
      days: weekDays
    };
  }

  /**
   * Lấy số tuần hiện tại
   */
  getCurrentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  /**
   * Format ngày thành dd/mm/yyyy
   */
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Kiểm tra xem ngày có phải là hôm nay không
   */
  isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Lấy dữ liệu tiến trình dạy học theo khối, học kỳ, tuần
   */
  async getTeachingProgress(gradeLevel, semester, weekNumber, academicYear) {
    try {
      // Xử lý academicYear có thể là string hoặc ObjectId
      let academicYearDoc;
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        academicYearDoc = await AcademicYear.findById(academicYear);
      } else {
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      }
      
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      // Lấy danh sách lớp theo khối
      const classes = await Class.find({
        gradeLevel: gradeLevel,
        academicYear: academicYearDoc._id,
        active: true
      }).sort({ className: 1 });

      // Lấy cấu hình số tiết yêu cầu cho khối này
      const requirements = await LessonRequirement.find({
        gradeLevel: gradeLevel,
        semester: semester,
        academicYear: academicYearDoc._id,
        isActive: true
      }).populate('subject', 'subjectName subjectCode');

      // Tạo map requirements để dễ lookup
      const requirementMap = new Map();
      requirements.forEach(req => {
        requirementMap.set(req.subject.subjectName, req.requiredLessons);
      });

      // Nếu chưa có cấu hình, sử dụng cấu hình mặc định
      if (requirementMap.size === 0) {
        const defaultRequirements = this.getDefaultRequirements();
        Object.entries(defaultRequirements).forEach(([subject, lessons]) => {
          requirementMap.set(subject, lessons);
        });
      }

      // Lấy thời gian bắt đầu và kết thúc của tuần
      const weekDates = await this.getWeekDates(weekNumber, academicYearDoc._id);
      if (!weekDates) {
        throw new Error(`Không tìm thấy dữ liệu tuần ${weekNumber} trong năm học ${academicYear}`);
      }

      const { startDate, endDate } = weekDates;

      // Lấy tất cả lessons trong tuần
      const lessons = await Lesson.find({
        scheduledDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['completed'] }
      }).populate([
        { path: 'class', select: 'className gradeLevel' },
        { path: 'subject', select: 'subjectName subjectCode' }
      ]);

      // Nhóm lessons theo môn học và lớp
      const progressData = [];
      const subjects = [...new Set(lessons.map(l => l.subject.subjectName))];

      for (const subject of subjects) {
        const subjectData = {
          subject: subject,
          data: []
        };

        for (const cls of classes) {
          // Đếm số tiết của môn học này trong lớp này trong tuần
          const lessonCount = lessons.filter(lesson => 
            lesson.class._id.toString() === cls._id.toString() &&
            lesson.subject.subjectName === subject
          ).length;

          subjectData.data.push(lessonCount);
        }

        progressData.push(subjectData);
      }

      // Thêm các môn học chưa có dữ liệu với số tiết = 0
      const existingSubjects = progressData.map(item => item.subject);
      const allSubjects = await Subject.find({ isActive: true }).select('subjectName');
      
      for (const subject of allSubjects) {
        if (!existingSubjects.includes(subject.subjectName)) {
          const subjectData = {
            subject: subject.subjectName,
            data: new Array(classes.length).fill(0)
          };
          progressData.push(subjectData);
        }
      }

      // Sắp xếp theo tên môn học
      progressData.sort((a, b) => a.subject.localeCompare(b.subject));

      return {
        gradeLevel,
        semester,
        weekNumber,
        academicYear: academicYearDoc.name,
        classes: classes.map(cls => cls.className),
        requirements: Object.fromEntries(requirementMap),
        progressData,
        weekDates: {
          startDate,
          endDate
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy dữ liệu tiến trình dạy học: ${error.message}`);
    }
  }

  /**
   * Lấy cấu hình số tiết yêu cầu
   */
  async getLessonRequirements(gradeLevel, semester, academicYear) {
    try {
      const requirements = await LessonRequirement.find({
        gradeLevel: gradeLevel,
        semester: semester,
        academicYear: academicYear,
        isActive: true
      }).populate('subject', 'subjectName subjectCode');

      // Chuyển đổi thành object với key là subjectName
      const result = {};
      requirements.forEach(req => {
        result[req.subject.subjectName] = req.requiredLessons;
      });

      // Nếu chưa có cấu hình, trả về cấu hình mặc định
      if (Object.keys(result).length === 0) {
        return this.getDefaultRequirements();
      }

      return result;
    } catch (error) {
      throw new Error(`Lỗi khi lấy cấu hình số tiết yêu cầu: ${error.message}`);
    }
  }

  /**
   * Lấy cấu hình mặc định cho số tiết yêu cầu
   */
  getDefaultRequirements() {
    return {
      'Toán': 4,
      'Ngữ văn': 4,
      'Vật lý': 3,
      'Hóa học': 2,
      'Sinh học': 3,
      'Lịch sử': 2,
      'Địa lý': 2,
      'GDCD': 2,
      'Ngoại ngữ': 3,
      'Thể dục': 2,
      'GDQP': 2,
      'Tin học': 2,
    };
  }

  /**
   * Cập nhật cấu hình số tiết yêu cầu
   */
  async updateLessonRequirements(gradeLevel, semester, academicYear, requirements) {
    try {
      const results = [];

      for (const [subjectName, requiredLessons] of Object.entries(requirements)) {
        // Tìm subject
        const subject = await Subject.findOne({ 
          subjectName: subjectName,
          isActive: true 
        });

        if (!subject) {
          throw new Error(`Không tìm thấy môn học: ${subjectName}`);
        }

        // Tìm hoặc tạo requirement
        let requirement = await LessonRequirement.findOne({
          subject: subject._id,
          gradeLevel: gradeLevel,
          semester: semester,
          academicYear: academicYearDoc._id
        });

        if (requirement) {
          // Cập nhật
          requirement.requiredLessons = requiredLessons;
          await requirement.save();
        } else {
          // Tạo mới
          requirement = new LessonRequirement({
            subject: subject._id,
            gradeLevel: gradeLevel,
            semester: semester,
            academicYear: academicYearDoc._id,
            requiredLessons: requiredLessons
          });
          await requirement.save();
        }

        results.push({
          subject: subjectName,
          requiredLessons: requiredLessons,
          action: requirement.isNew ? 'created' : 'updated'
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật cấu hình số tiết yêu cầu: ${error.message}`);
    }
  }

  /**
   * Khởi tạo cấu hình mặc định cho khối, học kỳ, năm học
   */
  async initializeDefaultRequirements(gradeLevel, semester, academicYear) {
    try {
      const defaultRequirements = this.getDefaultRequirements();
      const results = [];

      for (const [subjectName, requiredLessons] of Object.entries(defaultRequirements)) {
        // Tìm subject
        const subject = await Subject.findOne({ 
          subjectName: subjectName,
          isActive: true 
        });

        if (!subject) {
          console.warn(`Không tìm thấy môn học: ${subjectName}`);
          continue;
        }

        // Kiểm tra xem đã có requirement chưa
        const existingRequirement = await LessonRequirement.findOne({
          subject: subject._id,
          gradeLevel: gradeLevel,
          semester: semester,
          academicYear: academicYearDoc._id
        });

        if (!existingRequirement) {
          // Tạo mới requirement
          const requirement = new LessonRequirement({
            subject: subject._id,
            gradeLevel: gradeLevel,
            semester: semester,
            academicYear: academicYearDoc._id,
            requiredLessons: requiredLessons
          });
          await requirement.save();

          results.push({
            subject: subjectName,
            requiredLessons: requiredLessons,
            action: 'created'
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Lỗi khi khởi tạo cấu hình mặc định: ${error.message}`);
    }
  }

  /**
   * Lấy danh sách lớp theo khối
   */
  async getClassesByGrade(gradeLevel, academicYear) {
    try {
      // Xử lý academicYear có thể là string hoặc ObjectId
      let academicYearDoc;
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        academicYearDoc = await AcademicYear.findById(academicYear);
      } else {
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      }
      
      if (!academicYearDoc) {
        throw new Error(`Academic year ${academicYear} not found`);
      }

      const classes = await Class.find({
        gradeLevel: gradeLevel,
        academicYear: academicYearDoc._id,
        isActive: true
      }).select('className gradeLevel').sort({ className: 1 });

      return classes;
    } catch (error) {
      throw new Error(`Lỗi khi lấy danh sách lớp: ${error.message}`);
    }
  }

  /**
   * Lấy thời gian bắt đầu và kết thúc của tuần
   */
  async getWeekDates(weekNumber, academicYear) {
    try {
      // Xử lý academicYear có thể là string hoặc ObjectId
      let academicYearDoc;
      if (mongoose.Types.ObjectId.isValid(academicYear)) {
        academicYearDoc = await AcademicYear.findById(academicYear);
      } else {
        academicYearDoc = await AcademicYear.findOne({ name: academicYear });
      }
      
      if (!academicYearDoc) {
        throw new Error(`Không tìm thấy năm học: ${academicYear}`);
      }

      // Tìm weekly schedule
      const weeklySchedule = await WeeklySchedule.findOne({
        academicYear: academicYearDoc._id,
        weekNumber: weekNumber
      });

      if (weeklySchedule) {
        return {
          startDate: weeklySchedule.startDate,
          endDate: weeklySchedule.endDate
        };
      }

      // Nếu không tìm thấy weekly schedule, tính toán dựa trên academic year
      const startDate = new Date(academicYearDoc.startDate);
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);

      return {
        startDate: weekStartDate,
        endDate: weekEndDate
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thời gian tuần: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê sĩ số toàn trường theo ngày (cập nhật theo yêu cầu mới)
   */
  async getDailySchoolStatistics(targetDate) {
    try {
      // Lấy ngày bắt đầu và kết thúc của ngày
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Tính sĩ số quản lý (đơn giản - tổng số account quản lý)
      const managers = await User.countDocuments({ 
        role: { $in: ['manager', 'admin'] }, 
        active: true 
      });

      // 2. Tính sĩ số giáo viên (số giáo viên đã điểm danh trong ngày)
      const teacherAttendance = await this.getTeacherAttendanceForDay(targetDate);
      const teachersPresent = teacherAttendance.attended; // Chỉ tính giáo viên đã điểm danh

      // 3. Tính sĩ số học sinh (dựa trên đánh giá tiết học mới nhất của từng lớp)
      const studentAttendance = await this.getStudentAttendanceForDay(targetDate);
      const studentsPresent = studentAttendance.present || 0;

      const total = studentsPresent + teachersPresent + managers;

      return {
        date: targetDate,
        total,
        breakdown: {
          students: studentsPresent,
          teachers: teachersPresent,
          managers
        },
        teacherAttendance: {
          total: teacherAttendance.total,
          attended: teacherAttendance.attended,
          absent: teacherAttendance.absent,
          late: teacherAttendance.late
        }
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê sĩ số toàn trường: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê điểm danh giáo viên cho một ngày cụ thể
   * Giáo viên được tính là đã điểm danh khi họ xác nhận lesson completed
   * (không phải khi đánh giá tiết học)
   */
  async getTeacherAttendanceForDay(targetDate) {
    try {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy tất cả tiết học trong ngày (bao gồm cả completed và scheduled)
      const lessonsInDay = await Lesson.find({
        scheduledDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      }).populate('teacher', 'name');

      // Lấy danh sách giáo viên có tiết dạy trong ngày
      const teachersWithLessons = [...new Set(lessonsInDay.map(lesson => lesson.teacher?._id?.toString()).filter(Boolean))];
      const totalTeachers = teachersWithLessons.length;

      // Tính toán trạng thái điểm danh dựa trên lesson completed
      let attended = 0;
      let absent = 0;
      let late = 0;

      for (const teacherId of teachersWithLessons) {
        const teacherLessons = lessonsInDay.filter(l => l.teacher?._id?.toString() === teacherId);
        const completedLessons = teacherLessons.filter(l => l.status === 'completed');

        if (completedLessons.length > 0) {
          // Giáo viên có ít nhất 1 lesson completed -> đã điểm danh
          attended++;
        } else {
          // Giáo viên chưa có lesson nào completed -> chưa điểm danh
          absent++;
        }
      }

      return {
        date: targetDate,
        total: totalTeachers,
        attended,
        absent,
        late,
        attendanceRate: totalTeachers > 0 ? Math.round((attended / totalTeachers) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy thống kê điểm danh giáo viên: ${error.message}`);
    }
  }

  /**
   * Lấy sĩ số học sinh hiện tại dựa trên đánh giá tiết học mới nhất
   */
  async getStudentAttendanceForDay(targetDate) {
    try {
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy tất cả lớp học
      const allClasses = await Class.find({ active: true });

      let totalStudentsPresent = 0;
      let totalStudentsAbsent = 0;
      let totalStudentsInAllClasses = 0;

      for (const classItem of allClasses) {
        // Lấy tiết học đã completed của lớp này trong ngày
        const completedLessons = await Lesson.find({
          class: classItem._id,
          scheduledDate: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          status: 'completed'
        }).sort({ _id: -1 });

        // Tìm lesson có evaluation
        let completedLesson = null;
        let completedEvaluation = null;

        for (const lesson of completedLessons) {
          const evaluation = await TeacherLessonEvaluation.findOne({
            lesson: lesson._id
          });
          if (evaluation) {
            completedLesson = lesson;
            completedEvaluation = await TeacherLessonEvaluation.findOne({
              lesson: lesson._id
            }).populate('oralTests.student violations.student');
            break;
          }
        }

        if (completedLesson && completedEvaluation) {
          // Tính số học sinh có mặt dựa trên đánh giá
          const totalStudentsInClass = await User.countDocuments({
            class_id: classItem._id,
            role: 'student',
            active: true
          });

          totalStudentsInAllClasses += totalStudentsInClass;

          // Số học sinh vắng = chỉ tính học sinh trong danh sách vắng (không tính vi phạm)
          const absentStudents = new Set();
          
          // Thêm học sinh vắng từ absentStudents array
          completedEvaluation.absentStudents.forEach(absentStudent => {
            if (absentStudent.student) {
              absentStudents.add(absentStudent.student._id.toString());
            }
          });

          // Không tính học sinh vi phạm vì họ vẫn có mặt trong lớp

          // Tính số học sinh có mặt = tổng sĩ số - số học sinh vắng
          const studentsPresent = Math.max(0, totalStudentsInClass - absentStudents.size);
          const studentsAbsent = absentStudents.size;
          
          totalStudentsPresent += studentsPresent;
          totalStudentsAbsent += studentsAbsent;
        }
      }

      return {
        date: targetDate,
        total: totalStudentsInAllClasses,
        present: totalStudentsPresent,
        absent: totalStudentsAbsent,
        attendanceRate: totalStudentsInAllClasses > 0 ? Math.round((totalStudentsPresent / totalStudentsInAllClasses) * 100) : 0
      };
    } catch (error) {
      throw new Error(`Lỗi khi lấy sĩ số học sinh: ${error.message}`);
    }
  }

}

module.exports = StatisticsService;