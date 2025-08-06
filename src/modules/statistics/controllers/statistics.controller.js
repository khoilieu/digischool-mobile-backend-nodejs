const StatisticsService = require("../services/statistics.service");

class StatisticsController {
  /**
   * Lấy thống kê sĩ số toàn trường theo ngày (cập nhật theo yêu cầu mới)
   */
  getDailySchoolStatistics = async (req, res, next) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      
      const statisticsService = new StatisticsService();
      const statistics = await statisticsService.getDailySchoolStatistics(targetDate);
      
      res.status(200).json({
        success: true,
        message: "Lấy thống kê sĩ số toàn trường thành công",
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy thống kê sĩ số toàn trường theo tuần
   */
  getWeeklySchoolStatistics = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      let start, end;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Mặc định lấy tuần hiện tại
        const now = new Date();
        start = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Thứ 2
        end = new Date(now.setDate(now.getDate() + 6)); // Chủ nhật
      }
      
      const statisticsService = new StatisticsService();
      const statistics = await statisticsService.getWeeklyStatistics(start, end);
      
      res.status(200).json({
        success: true,
        message: "Lấy thống kê sĩ số tuần thành công",
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy thống kê điểm danh giáo viên (cập nhật theo yêu cầu mới)
   */
  getTeacherAttendanceStatistics = async (req, res, next) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      
      const statisticsService = new StatisticsService();
      const statistics = await statisticsService.getTeacherAttendanceForDay(targetDate);
      
      res.status(200).json({
        success: true,
        message: "Lấy thống kê điểm danh giáo viên thành công",
        data: statistics
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy thống kê sĩ số giáo viên điểm danh cho UI ChartSchoolTopday
   */
  getTeacherRollcallSummary = async (req, res, next) => {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      
      const statisticsService = new StatisticsService();
      const teacherAttendance = await statisticsService.getTeacherAttendanceForDay(targetDate);
      
      // Format dữ liệu cho UI
      const summary = {
        date: targetDate.toISOString().split('T')[0],
        totalTeachers: teacherAttendance.total,
        attendedTeachers: teacherAttendance.attended,
        attendanceRate: teacherAttendance.total > 0 ? 
          Math.round((teacherAttendance.attended / teacherAttendance.total) * 100) : 0,
        breakdown: {
          attended: teacherAttendance.attended,
          absent: teacherAttendance.absent,
          late: teacherAttendance.late
        }
      };
      
      res.status(200).json({
        success: true,
        message: "Lấy thống kê điểm danh giáo viên thành công",
        data: summary
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy dữ liệu biểu đồ học sinh theo buổi
   */
  getStudentChartData = async (req, res, next) => {
    try {
      const { date, session } = req.query;
      const targetDate = date ? new Date(date) : new Date();
      const targetSession = session || 'morning'; // morning, afternoon
      
      const statisticsService = new StatisticsService();
      const chartData = await statisticsService.getStudentChartData(targetDate, targetSession);
      
      res.status(200).json({
        success: true,
        message: "Lấy dữ liệu biểu đồ học sinh thành công",
        data: chartData
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy tỷ lệ hoàn thành của học sinh và giáo viên
   */
  getCompletionRates = async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      let start, end;
      
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        // Mặc định lấy tuần hiện tại
        const now = new Date();
        start = new Date(now.setDate(now.getDate() - now.getDay() + 1));
        end = new Date(now.setDate(now.getDate() + 6));
      }
      
      const statisticsService = new StatisticsService();
      const rates = await statisticsService.getCompletionRates(start, end);
      
      res.status(200).json({
        success: true,
        message: "Lấy tỷ lệ hoàn thành thành công",
        data: rates
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy dữ liệu điểm danh giáo viên theo ngày
   * Trả về thông tin tiết học đã hoàn thành đầu tiên của mỗi giáo viên trong ngày
   */
  getTeacherRollcall = async (req, res, next) => {
    try {
      const { date, status, subject, weekNumber, academicYear } = req.query;
      
      // Kiểm tra và xử lý date
      let targetDate;
      if (date) {
        targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Định dạng ngày không hợp lệ"
          });
        }
      } else {
        targetDate = new Date();
      }
      
      const filters = {
        status,
        subject,
        weekNumber,
        academicYear
      };
      
      const statisticsService = new StatisticsService();
      const rollcallData = await statisticsService.getTeacherRollcallData(targetDate, filters);
      
      res.status(200).json({
        success: true,
        message: "Lấy dữ liệu điểm danh giáo viên thành công",
        data: rollcallData
      });
    } catch (error) {
      console.error("❌ Error in getTeacherRollcall:", error.message);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Lấy danh sách ngày trong tuần dựa trên TKB
   */
  getWeekDays = async (req, res, next) => {
    try {
      const { weekNumber, academicYear, className } = req.query;
      
      const statisticsService = new StatisticsService();
      const weekDays = await statisticsService.getWeekDays(weekNumber, academicYear, className);
      
      res.status(200).json({
        success: true,
        message: "Lấy danh sách ngày trong tuần thành công",
        data: weekDays
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy dữ liệu tiến trình dạy học
   */
  getTeachingProgress = async (req, res, next) => {
    try {
      const { gradeLevel, semester, weekNumber, academicYear } = req.query;
      
      if (!gradeLevel || !semester || !weekNumber || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: gradeLevel, semester, weekNumber, academicYear"
        });
      }

      const statisticsService = new StatisticsService();
      const progressData = await statisticsService.getTeachingProgress(
        parseInt(gradeLevel),
        parseInt(semester),
        parseInt(weekNumber),
        academicYear
      );
      
      res.status(200).json({
        success: true,
        message: "Lấy dữ liệu tiến trình dạy học thành công",
        data: progressData
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy cấu hình số tiết yêu cầu
   */
  getLessonRequirements = async (req, res, next) => {
    try {
      const { gradeLevel, semester, academicYear } = req.query;
      
      if (!gradeLevel || !semester || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: gradeLevel, semester, academicYear"
        });
      }

      const statisticsService = new StatisticsService();
      const requirements = await statisticsService.getLessonRequirements(
        parseInt(gradeLevel),
        parseInt(semester),
        academicYear
      );
      
      res.status(200).json({
        success: true,
        message: "Lấy cấu hình số tiết yêu cầu thành công",
        data: requirements
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cập nhật cấu hình số tiết yêu cầu
   */
  updateLessonRequirements = async (req, res, next) => {
    try {
      const { gradeLevel, semester, academicYear } = req.query;
      const { requirements } = req.body;
      
      if (!gradeLevel || !semester || !academicYear || !requirements) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: gradeLevel, semester, academicYear, requirements"
        });
      }

      const statisticsService = new StatisticsService();
      const results = await statisticsService.updateLessonRequirements(
        parseInt(gradeLevel),
        parseInt(semester),
        academicYear,
        requirements
      );
      
      res.status(200).json({
        success: true,
        message: "Cập nhật cấu hình số tiết yêu cầu thành công",
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Khởi tạo cấu hình mặc định
   */
  initializeDefaultRequirements = async (req, res, next) => {
    try {
      const { gradeLevel, semester, academicYear } = req.query;
      
      if (!gradeLevel || !semester || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: gradeLevel, semester, academicYear"
        });
      }

      const statisticsService = new StatisticsService();
      const results = await statisticsService.initializeDefaultRequirements(
        parseInt(gradeLevel),
        parseInt(semester),
        academicYear
      );
      
      res.status(200).json({
        success: true,
        message: "Khởi tạo cấu hình mặc định thành công",
        data: results
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Lấy danh sách lớp theo khối
   */
  getClassesByGrade = async (req, res, next) => {
    try {
      const { gradeLevel, academicYear } = req.query;
      
      if (!gradeLevel || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin: gradeLevel, academicYear"
        });
      }

      const statisticsService = new StatisticsService();
      const classes = await statisticsService.getClassesByGrade(
        parseInt(gradeLevel),
        academicYear
      );
      
      res.status(200).json({
        success: true,
        message: "Lấy danh sách lớp theo khối thành công",
        data: classes
      });
    } catch (error) {
      next(error);
    }
  };

}

module.exports = new StatisticsController();