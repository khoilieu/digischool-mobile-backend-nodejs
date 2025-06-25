const scheduleService = require('../services/schedule.service');

class ScheduleController {
  // Khởi tạo thời khóa biểu cho các lớp trong năm học (NEW ARCHITECTURE)
  async initializeSchedulesForAcademicYear(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      console.log('🚀 Using NEW architecture for schedule initialization...');
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

      // Thêm scheduleType vào request body nếu không có (default MONDAY_TO_SATURDAY)
      const requestData = {
        ...req.body,
        scheduleType: req.body.scheduleType || 'MONDAY_TO_SATURDAY'
      };

      console.log(`📅 Schedule type: ${requestData.scheduleType}`);

      // Sử dụng method mới với Lesson-based architecture
      const result = await scheduleService.initializeSchedulesWithNewArchitecture(requestData, token);
      
      res.status(201).json({
        success: true,
        message: 'Schedules initialized successfully with new architecture',
        data: result,
        architecture: 'lesson-based',
        scheduleType: requestData.scheduleType
      });
    } catch (error) {
      console.error('❌ Schedule initialization error:', error.message);
      next(error);
    }
  }

  // Khởi tạo thời khóa biểu tối ưu với thuật toán Heuristic/Greedy
  async initializeOptimizedSchedules(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      console.log('🚀 Starting optimized schedule generation with advanced constraints...');
      
      const result = await scheduleService.initializeSchedulesForAcademicYear(req.body, token);
      
      // Tính toán thống kê tối ưu hóa
      const optimizationStats = {
        totalClasses: result.totalClasses,
        successfullyOptimized: result.results.filter(r => r.status === 'created').length,
        averageOptimizationScore: result.results
          .filter(r => r.status === 'created')
          .reduce((sum, r) => sum + (r.optimizationScore || 0), 0) / 
          Math.max(result.results.filter(r => r.status === 'created').length, 1),
        constraints: {
          teacherClustering: '✅ Giáo viên dạy theo cụm',
          subjectBalance: '✅ Cân bằng môn học trong ngày',
          noConflicts: '✅ Không xung đột giáo viên/phòng học',
          practicalBalance: '✅ Tránh ngày chỉ có lý thuyết'
        }
      };

      res.status(201).json({
        success: true,
        message: 'Optimized schedules created successfully with advanced constraints',
        data: result,
        optimization: optimizationStats
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo thời khóa biểu cho một lớp cụ thể
  async initializeScheduleForClass(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      console.log('🚀 Creating schedule for specific class...');
      
      const result = await scheduleService.initializeScheduleForClass(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Schedule created successfully for class',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Xem thời khóa biểu của một lớp cụ thể - Version mới với date range
  async getClassSchedule(req, res, next) {
    try {
      const { className, academicYear, weekNumber, startOfWeek, endOfWeek } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      let result;
      
      // Nếu có startOfWeek và endOfWeek, dùng NEW detailed lesson-based method
      if (startOfWeek && endOfWeek) {
        result = await scheduleService.getDetailedLessonScheduleByDateRange(
          className, 
          academicYear, 
          startOfWeek,
          endOfWeek
        );
      } else {
        // Fallback to weekNumber approach (legacy)
        result = await scheduleService.getClassSchedule(
          className, 
          academicYear, 
          weekNumber ? parseInt(weekNumber) : 1
        );
      }
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy tất cả schedules có sẵn cho debugging
  async getAvailableSchedules(req, res, next) {
    try {
      const { academicYear, className } = req.query;
      
      const result = await scheduleService.getAvailableSchedules(academicYear, className);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Kiểm tra lớp có tồn tại không
  async checkClassExists(req, res, next) {
    try {
      const { className, academicYear } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      const result = await scheduleService.checkClassExists(className, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Tạo thời khóa biểu cho khối lớp (legacy - giữ lại để tương thích)
  async createScheduleForGrade(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await scheduleService.createScheduleForGrade(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Schedules created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách thời khóa biểu
  async getSchedules(req, res, next) {
    try {
      const { page, limit, academicYear, gradeLevel, status } = req.query;
      
      const result = await scheduleService.getSchedules({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        academicYear,
        gradeLevel: gradeLevel ? parseInt(gradeLevel) : undefined,
        status
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy chi tiết thời khóa biểu
  async getScheduleById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await scheduleService.getScheduleById(id);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thời khóa biểu
  async updateSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await scheduleService.updateSchedule(id, req.body, token);
      
      res.status(200).json({
        success: true,
        message: 'Schedule updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật trạng thái thời khóa biểu
  async updateScheduleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await scheduleService.updateScheduleStatus(id, status, token);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.schedule
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa thời khóa biểu
  async deleteSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await scheduleService.deleteSchedule(id, token);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thống kê thời khóa biểu
  async getScheduleStats(req, res, next) {
    try {
      const { academicYear } = req.query;
      
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year is required'
        });
      }

      const result = await scheduleService.getScheduleStats(academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách lớp theo khối và năm học (helper endpoint)
  async getClassesByGrade(req, res, next) {
    try {
      const { academicYear, gradeLevel } = req.query;
      
      if (!academicYear || !gradeLevel) {
        return res.status(400).json({
          success: false,
          message: 'Academic year and grade level are required'
        });
      }

      const result = await scheduleService.getClassesByGradeAndYear(academicYear, parseInt(gradeLevel));
      
      res.status(200).json({
        success: true,
        data: {
          academicYear,
          gradeLevel: parseInt(gradeLevel),
          totalClasses: result.length,
          classes: result.map(cls => ({
            id: cls._id,
            className: cls.className,
            homeroomTeacher: {
              id: cls.homeroomTeacher?._id,
              name: cls.homeroomTeacher?.name,
              email: cls.homeroomTeacher?.email
            }
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Kiểm tra xung đột thời khóa biểu (preview trước khi tạo)
  async previewScheduleCreation(req, res, next) {
    try {
      const { academicYear, gradeLevel } = req.body;
      
      if (!academicYear || !gradeLevel) {
        return res.status(400).json({
          success: false,
          message: 'Academic year and grade level are required'
        });
      }

      // Lấy danh sách lớp
      const classes = await scheduleService.getClassesByGradeAndYear(academicYear, gradeLevel);
      
      // Kiểm tra lớp nào đã có thời khóa biểu
      const existingSchedules = await scheduleService.getSchedules({
        academicYear,
        gradeLevel,
        status: 'active',
        limit: 100
      });

      const existingClassIds = existingSchedules.schedules.map(s => s.className);
      
      const preview = {
        academicYear,
        gradeLevel,
        totalClasses: classes.length,
        classesWithSchedule: existingClassIds.length,
        classesWithoutSchedule: classes.length - existingClassIds.length,
        classesList: classes.map(cls => ({
          id: cls._id,
          className: cls.className,
          homeroomTeacher: cls.homeroomTeacher?.name,
          hasSchedule: existingClassIds.includes(cls.className)
        }))
      };
      
      res.status(200).json({
        success: true,
        data: preview
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thời khóa biểu của học sinh
  async getStudentSchedule(req, res, next) {
    try {
      const { academicYear, className } = req.query;
      
      if (!className) {
        return res.status(400).json({
          success: false,
          message: 'Class name is required (e.g., 12A1)'
        });
      }

      const result = await scheduleService.getStudentScheduleByClassName(className, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thời khóa biểu của học sinh theo ngày
  async getStudentScheduleByDay(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const { dayOfWeek } = req.params;
      const { academicYear } = req.query;
      
      // Validate dayOfWeek
      const day = parseInt(dayOfWeek);
      if (!day || day < 1 || day > 6) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 1 (Monday) and 6 (Saturday)'
        });
      }

      const result = await scheduleService.getStudentScheduleByDay(token, day, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy lịch dạy của giáo viên
  async getTeacherSchedule(req, res, next) {
    try {
      const { teacherId, academicYear, startOfWeek, endOfWeek } = req.query;
      const currentUser = req.user; // Từ authMiddleware.protect
      
      if (!teacherId || !academicYear || !startOfWeek || !endOfWeek) {
        return res.status(400).json({
          success: false,
          message: 'teacherId, academicYear, startOfWeek, and endOfWeek are required'
        });
      }

      // Kiểm tra phân quyền: giáo viên chỉ có thể xem lịch của chính mình
      if (currentUser.role.includes('teacher') && !currentUser.role.includes('manager')) {
        if (currentUser._id.toString() !== teacherId) {
          return res.status(403).json({
            success: false,
            message: 'Teachers can only view their own schedule'
          });
        }
      }

      const result = await scheduleService.getTeacherScheduleByDateRange(
        teacherId, 
        academicYear, 
        startOfWeek, 
        endOfWeek
      );
      
      res.status(200).json({
        success: true,
        message: `Teacher schedule retrieved successfully for ${startOfWeek} to ${endOfWeek}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách năm học (options cho dropdown)
  async getAcademicYearOptions(req, res, next) {
    try {
      const result = await scheduleService.getAcademicYearOptions();
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách tất cả lớp học có sẵn
  async getClassesList(req, res, next) {
    try {
      const result = await scheduleService.getAllClasses();
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách tuần học cho năm học (options cho dropdown)
  async getWeekOptions(req, res, next) {
    try {
      const { academicYear } = req.query;
      
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year is required'
        });
      }

      const result = await scheduleService.getWeekOptions(academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin time slots (khung giờ học)
  async getTimeSlots(req, res, next) {
    try {
      const result = scheduleService.getTimeSlots();
      
      res.status(200).json({
        success: true,
        data: {
          timeSlots: result,
          totalSlots: result.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thời khóa biểu theo tuần cụ thể
  async getScheduleByWeek(req, res, next) {
    try {
      const { academicYear, weekStartDate, weekEndDate, className } = req.query;
      
      if (!academicYear || !weekStartDate || !weekEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Academic year, week start date, and week end date are required'
        });
      }

      if (!className) {
        return res.status(400).json({
          success: false,
          message: 'Class name is required (e.g., 12A1)'
        });
      }

      const result = await scheduleService.getScheduleByWeekAndClass(className, academicYear, weekStartDate, weekEndDate);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật trạng thái tiết học
  async updatePeriodStatus(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, periodNumber, status, options = {} } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!dayOfWeek || !periodNumber || !status) {
        return res.status(400).json({
          success: false,
          message: 'dayOfWeek, periodNumber, and status are required'
        });
      }

      const result = await scheduleService.updatePeriodStatus(
        scheduleId, 
        dayOfWeek, 
        periodNumber, 
        status, 
        options, 
        token
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.updatedPeriod
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy tiến độ học tập
  async getLearningProgress(req, res, next) {
    try {
      const { className, academicYear } = req.query;
      const { includeDetails } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      const options = {
        includeDetails: includeDetails === 'true'
      };

      const result = await scheduleService.getLearningProgress(className, academicYear, options);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy báo cáo điểm danh
  async getAttendanceReport(req, res, next) {
    try {
      const { className, academicYear } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      const result = await scheduleService.getAttendanceReport(className, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk update trạng thái nhiều tiết
  async bulkUpdatePeriodStatus(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { updates } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }

      const result = await scheduleService.bulkUpdatePeriodStatus(scheduleId, updates, token);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark period as completed (shortcut)
  async markPeriodCompleted(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, periodNumber, attendance, notes } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const options = {
        actualDate: new Date(),
        attendance,
        notes
      };

      const result = await scheduleService.updatePeriodStatus(
        scheduleId, 
        dayOfWeek, 
        periodNumber, 
        'completed', 
        options, 
        token
      );
      
      res.status(200).json({
        success: true,
        message: 'Period marked as completed',
        data: result.updatedPeriod
      });
    } catch (error) {
      next(error);
    }
  }

  // Mark period as absent (shortcut)
  async markPeriodAbsent(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, periodNumber, notes } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const options = {
        actualDate: new Date(),
        notes
      };

      const result = await scheduleService.updatePeriodStatus(
        scheduleId, 
        dayOfWeek, 
        periodNumber, 
        'absent', 
        options, 
        token
      );
      
      res.status(200).json({
        success: true,
        message: 'Period marked as absent',
        data: result.updatedPeriod
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thống kê theo loại tiết học
  async getPeriodTypeStatistics(req, res, next) {
    try {
      const { className, academicYear } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      const result = await scheduleService.getPeriodTypeStatistics(className, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách tiết học theo loại
  async getPeriodsByType(req, res, next) {
    try {
      const { className, academicYear, periodType } = req.query;
      
      if (!className || !academicYear || !periodType) {
        return res.status(400).json({
          success: false,
          message: 'Class name, academic year, and period type are required'
        });
      }

      const validPeriodTypes = ['regular', 'makeup', 'extracurricular', 'fixed'];
      if (!validPeriodTypes.includes(periodType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid period type. Must be one of: ${validPeriodTypes.join(', ')}`
        });
      }

      const result = await scheduleService.getPeriodsByType(className, academicYear, periodType);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Nhận biết loại tiết học
  async identifyPeriodType(req, res, next) {
    try {
      const { className, academicYear, dayOfWeek, periodNumber } = req.query;
      
      if (!className || !academicYear || !dayOfWeek || !periodNumber) {
        return res.status(400).json({
          success: false,
          message: 'Class name, academic year, day of week, and period number are required'
        });
      }

      const result = await scheduleService.identifyPeriodType(
        className, 
        academicYear, 
        parseInt(dayOfWeek), 
        parseInt(periodNumber)
      );
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Thêm tiết dạy bù
  async addMakeupPeriod(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { 
        dayOfWeek, 
        periodNumber, 
        teacherId, 
        subjectId, 
        makeupInfo,
        timeSlot 
      } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!dayOfWeek || !periodNumber || !teacherId || !subjectId || !makeupInfo) {
        return res.status(400).json({
          success: false,
          message: 'dayOfWeek, periodNumber, teacherId, subjectId, and makeupInfo are required'
        });
      }

      const result = await scheduleService.addMakeupPeriod(
        scheduleId,
        dayOfWeek,
        periodNumber,
        teacherId,
        subjectId,
        makeupInfo,
        timeSlot,
        token
      );
      
      res.status(201).json({
        success: true,
        message: 'Makeup period added successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Thêm hoạt động ngoại khóa
  async addExtracurricularPeriod(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { 
        dayOfWeek, 
        periodNumber, 
        teacherId, 
        extracurricularInfo,
        timeSlot 
      } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!dayOfWeek || !periodNumber || !teacherId || !extracurricularInfo) {
        return res.status(400).json({
          success: false,
          message: 'dayOfWeek, periodNumber, teacherId, and extracurricularInfo are required'
        });
      }

      const result = await scheduleService.addExtracurricularPeriod(
        scheduleId,
        dayOfWeek,
        periodNumber,
        teacherId,
        extracurricularInfo,
        timeSlot,
        token
      );
      
      res.status(201).json({
        success: true,
        message: 'Extracurricular period added successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Kiểm tra slot trống để thêm tiết học
  async checkAvailableSlots(req, res, next) {
    try {
      const { className, academicYear } = req.query;
      
      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Class name and academic year are required'
        });
      }

      const result = await scheduleService.getAvailableSlots(className, academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Xem chi tiết tiết học
  async getPeriodDetails(req, res, next) {
    try {
      const { className, academicYear, dayOfWeek, periodNumber } = req.query;
      
      if (!className || !academicYear || !dayOfWeek || !periodNumber) {
        return res.status(400).json({
          success: false,
          message: 'Class name, academic year, day of week, and period number are required'
        });
      }

      // Validate dayOfWeek và periodNumber
      const day = parseInt(dayOfWeek);
      const period = parseInt(periodNumber);
      
      if (isNaN(day) || day < 2 || day > 7) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 2 (Monday) and 7 (Saturday)'
        });
      }

      if (isNaN(period) || period < 1 || period > 7) {
        return res.status(400).json({
          success: false,
          message: 'Period number must be between 1 and 7'
        });
      }

      const result = await scheduleService.getPeriodDetails(
        className, 
        academicYear, 
        day, 
        period
      );
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Đánh giá tiết học
  async evaluatePeriod(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, periodNumber, evaluation } = req.body;
      
      if (!scheduleId || !dayOfWeek || !periodNumber || !evaluation) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID, day of week, period number, and evaluation data are required'
        });
      }

      // Validate dayOfWeek và periodNumber
      const day = parseInt(dayOfWeek);
      const period = parseInt(periodNumber);
      
      if (isNaN(day) || day < 2 || day > 7) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 2 (Monday) and 7 (Saturday)'
        });
      }

      if (isNaN(period) || period < 1 || period > 7) {
        return res.status(400).json({
          success: false,
          message: 'Period number must be between 1 and 7'
        });
      }

      // Validate evaluation data
      if (evaluation.overallRating && (evaluation.overallRating < 1 || evaluation.overallRating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'Overall rating must be between 1 and 5'
        });
      }

      const result = await scheduleService.evaluatePeriod(
        scheduleId,
        day,
        period,
        evaluation,
        req.user._id,
        req.user.role[0] // Lấy role đầu tiên
      );
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Period evaluated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy đánh giá tiết học
  async getPeriodEvaluation(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, periodNumber } = req.query;
      
      if (!scheduleId || !dayOfWeek || !periodNumber) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID, day of week, and period number are required'
        });
      }

      // Validate dayOfWeek và periodNumber
      const day = parseInt(dayOfWeek);
      const period = parseInt(periodNumber);
      
      if (isNaN(day) || day < 2 || day > 7) {
        return res.status(400).json({
          success: false,
          message: 'Day of week must be between 2 (Monday) and 7 (Saturday)'
        });
      }

      if (isNaN(period) || period < 1 || period > 7) {
        return res.status(400).json({
          success: false,
          message: 'Period number must be between 1 and 7'
        });
      }

      const result = await scheduleService.getPeriodEvaluation(scheduleId, day, period);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy chi tiết tiết học theo ID
  async getPeriodById(req, res, next) {
    try {
      const { scheduleId, periodId } = req.params;
      
      if (!scheduleId || !periodId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID and Period ID are required'
        });
      }

      const result = await scheduleService.getPeriodById(scheduleId, periodId);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy danh sách tiết rỗng
  async getEmptySlots(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { weekNumber } = req.query;
      
      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      const result = await scheduleService.getEmptySlots(scheduleId, weekNumber ? parseInt(weekNumber) : null);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Cập nhật trạng thái tiết học theo ID
  async updatePeriodStatusById(req, res, next) {
    try {
      const { scheduleId, periodId } = req.params;
      const { status, options = {} } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!periodId || !status) {
        return res.status(400).json({
          success: false,
          message: 'Period ID and status are required'
        });
      }

      const result = await scheduleService.updatePeriodStatusById(
        scheduleId, 
        periodId, 
        status, 
        options, 
        token
      );
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.updatedPeriod
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Thêm tiết dạy bù vào slot rỗng
  async addMakeupToEmptySlot(req, res, next) {
    try {
      const { scheduleId, periodId } = req.params;
      const { teacherId, subjectId, makeupInfo } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!periodId || !teacherId || !subjectId || !makeupInfo) {
        return res.status(400).json({
          success: false,
          message: 'Period ID, teacher ID, subject ID, and makeup info are required'
        });
      }

      const result = await scheduleService.addMakeupToEmptySlot(
        scheduleId,
        periodId,
        teacherId,
        subjectId,
        makeupInfo,
        token
      );
      
      res.status(201).json({
        success: true,
        message: 'Makeup period added successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Thêm hoạt động ngoại khóa vào slot rỗng
  async addExtracurricularToEmptySlot(req, res, next) {
    try {
      const { scheduleId, periodId } = req.params;
      const { teacherId, extracurricularInfo } = req.body;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      if (!periodId || !teacherId || !extracurricularInfo) {
        return res.status(400).json({
          success: false,
          message: 'Period ID, teacher ID, and extracurricular info are required'
        });
      }

      const result = await scheduleService.addExtracurricularToEmptySlot(
        scheduleId,
        periodId,
        teacherId,
        extracurricularInfo,
        token
      );
      
      res.status(201).json({
        success: true,
        message: 'Extracurricular activity added successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy thời khóa biểu theo tuần
  async getScheduleByWeek(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { weekNumber } = req.query;
      
      if (!scheduleId || !weekNumber) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID and week number are required'
        });
      }

      const week = parseInt(weekNumber);
      if (isNaN(week) || week < 1 || week > 38) {
        return res.status(400).json({
          success: false,
          message: 'Week number must be between 1 and 38'
        });
      }

      const result = await scheduleService.getScheduleByWeek(scheduleId, week);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy lịch học theo ngày cụ thể với đầy đủ thông tin
  async getDaySchedule(req, res, next) {
    try {
      const { className, academicYear, date } = req.query;
      
      if (!className || !academicYear || !date) {
        return res.status(400).json({
          success: false,
          message: 'Class name, academic year, and date are required'
        });
      }

      const result = await scheduleService.getDaySchedule(className, academicYear, date);
      
      res.status(200).json({
        success: true,
        message: 'Day schedule retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy thông tin chi tiết của tiết học với metadata đầy đủ
  async getDetailedPeriodInfo(req, res, next) {
    try {
      const { periodId } = req.params;
      
      if (!periodId) {
        return res.status(400).json({
          success: false,
          message: 'Period ID is required'
        });
      }

      const result = await scheduleService.getDetailedPeriodInfo(periodId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Period not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Period details retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Bulk update nhiều tiết học cùng lúc
  async bulkUpdatePeriods(req, res, next) {
    try {
      const { periods } = req.body;
      const userId = req.user._id;
      
      if (!periods || !Array.isArray(periods) || periods.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Periods array is required and cannot be empty'
        });
      }

      const result = await scheduleService.bulkUpdatePeriods(periods, userId);
      
      res.status(200).json({
        success: true,
        message: `Updated ${result.updated} periods successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Lấy lịch giảng dạy của giáo viên theo tuần
  async getTeacherWeeklySchedule(req, res, next) {
    try {
      const { teacherId, weekNumber, academicYear } = req.query;
      
      if (!teacherId || !weekNumber || !academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Teacher ID, week number, and academic year are required'
        });
      }

      const result = await scheduleService.getTeacherWeeklySchedule(
        teacherId, 
        parseInt(weekNumber), 
        academicYear
      );
      
      res.status(200).json({
        success: true,
        message: 'Teacher weekly schedule retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // API mới: Search và filter periods với điều kiện phức tạp
  async searchPeriods(req, res, next) {
    try {
      const filters = req.query;
      const result = await scheduleService.searchPeriods(filters);
      
      res.status(200).json({
        success: true,
        message: 'Periods search completed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy chi tiết tiết học
  async getLessonDetail(req, res, next) {
    try {
      const { lessonId } = req.params;
      const currentUser = req.user; // Từ authMiddleware.protect
      
      if (!lessonId) {
        return res.status(400).json({
          success: false,
          message: 'lessonId is required'
        });
      }

      // Lấy chi tiết tiết học
      const lessonDetail = await scheduleService.getLessonDetailById(lessonId, currentUser);
      
      if (!lessonDetail) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      console.log(`✅ Retrieved lesson detail for ${lessonId} by user ${currentUser._id}`);

      // Trả về trực tiếp data của lesson
      res.status(200).json(lessonDetail);

    } catch (error) {
      console.error('❌ Error in getLessonDetail:', error.message);
      next(error);
    }
  }
}

module.exports = new ScheduleController(); 