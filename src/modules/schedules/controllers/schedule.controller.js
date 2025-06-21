const scheduleService = require('../services/schedule.service');

class ScheduleController {
  // Khởi tạo thời khóa biểu cho các lớp trong năm học (33 tiết/tuần)
  async initializeSchedulesForAcademicYear(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await scheduleService.initializeSchedulesForAcademicYear(req.body, token);
      res.status(201).json({
        success: true,
        message: 'Schedules initialized successfully',
        data: result
      });
    } catch (error) {
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
      
      // Nếu có startOfWeek và endOfWeek, dùng date range
      if (startOfWeek && endOfWeek) {
        result = await scheduleService.getClassScheduleByDateRange(
          className, 
          academicYear, 
          startOfWeek,
          endOfWeek
        );
      } else {
        // Fallback to weekNumber approach
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
}

module.exports = new ScheduleController(); 