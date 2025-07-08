const scheduleService = require("../services/schedule.service");
const Lesson = require("../models/lesson.model");

class ScheduleController {
  // Khởi tạo thời khóa biểu cho các lớp trong năm học (NEW ARCHITECTURE)
  async initializeSchedulesForAcademicYear(req, res, next) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      console.log("🚀 Using NEW architecture for schedule initialization...");
      console.log("📋 Request body:", JSON.stringify(req.body, null, 2));

      // Thêm scheduleType vào request body nếu không có (default MONDAY_TO_SATURDAY)
      const requestData = {
        ...req.body,
        scheduleType: req.body.scheduleType || "MONDAY_TO_SATURDAY",
      };

      console.log(`📅 Schedule type: ${requestData.scheduleType}`);

      // Sử dụng method mới với Lesson-based architecture
      const result =
        await scheduleService.initializeSchedulesWithNewArchitecture(
          requestData,
          token
        );

      res.status(201).json({
        success: true,
        message: "Schedules initialized successfully with new architecture",
        data: result,
        architecture: "lesson-based",
        scheduleType: requestData.scheduleType,
      });
    } catch (error) {
      console.error("❌ Schedule initialization error:", error.message);
      next(error);
    }
  }

  // Xem thời khóa biểu của một lớp cụ thể - Version mới với date range
  async getClassSchedule(req, res, next) {
    try {
      const { className, academicYear, weekNumber, startOfWeek, endOfWeek } =
        req.query;

      if (!className || !academicYear) {
        return res.status(400).json({
          success: false,
          message: "Class name and academic year are required",
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
        data: result,
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
          message: "Class name and academic year are required",
        });
      }

      const result = await scheduleService.checkClassExists(
        className,
        academicYear
      );

      res.status(200).json({
        success: true,
        data: result,
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
          message:
            "teacherId, academicYear, startOfWeek, and endOfWeek are required",
        });
      }

      // Kiểm tra phân quyền: giáo viên chỉ có thể xem lịch của chính mình
      if (
        currentUser.role.includes("teacher") &&
        !currentUser.role.includes("manager")
      ) {
        if (currentUser._id.toString() !== teacherId) {
          return res.status(403).json({
            success: false,
            message: "Teachers can only view their own schedule",
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
        data: result,
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
          message: "lessonId is required",
        });
      }

      // Lấy chi tiết tiết học
      const lessonDetail = await scheduleService.getLessonDetailById(
        lessonId,
        currentUser
      );

      if (!lessonDetail) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      console.log(
        `✅ Retrieved lesson detail for ${lessonId} by user ${currentUser._id}`
      );

      // Trả về trực tiếp data của lesson
      res.status(200).json(lessonDetail);
    } catch (error) {
      console.error("❌ Error in getLessonDetail:", error.message);
      next(error);
    }
  }

  // API để lấy danh sách học sinh của một lesson cụ thể
  async getLessonStudents(req, res, next) {
    try {
      const { lessonId } = req.params;
      const teacherId = req.user._id;

      // Import models
      const Lesson = require("../models/lesson.model");
      const User = require("../../auth/models/user.model");
      const Class = require("../../classes/models/class.model");

      // Tìm lesson và kiểm tra quyền
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      // Kiểm tra chỉ giáo viên dạy tiết này mới được xem
      if (lesson.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view students of your own lessons",
        });
      }

      // Lấy danh sách học sinh của lớp
      const students = await User.find({
        class_id: lesson.class._id,
        role: "student",
      })
        .select("_id name studentId class_id")
        .sort("name");

      // Lấy thông tin lớp
      const classInfo = await Class.findById(lesson.class._id).select(
        "className grade"
      );

      res.status(200).json({
        success: true,
        message: "Lấy danh sách học sinh thành công",
        data: {
          lesson: {
            lessonId: lesson.lessonId,
            topic: lesson.topic,
            scheduledDate: lesson.scheduledDate,
            status: lesson.status,
          },
          class: {
            className: classInfo.className,
            grade: classInfo.grade,
          },
          subject: {
            subjectName: lesson.subject.subjectName,
            subjectCode: lesson.subject.subjectCode,
          },
          teacher: {
            name: lesson.teacher.name,
          },
          students: students.map((student) => ({
            id: student._id,
            name: student.name,
            studentId: student.studentId,
            className: classInfo.className,
          })),
          totalStudents: students.length,
        },
      });
    } catch (error) {
      console.error("❌ Error in getLessonStudents:", error.message);
      next(error);
    }
  }

  // API: Cập nhật mô tả thêm cho lesson (thêm hoặc update)
  async updateLessonDescription(req, res, next) {
    try {
      const { lessonId } = req.params;
      const { description } = req.body;
      const currentUser = req.user;

      if (!description || description.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Description is required and cannot be empty",
        });
      }

      // Tìm lesson và populate thông tin cần thiết
      const lesson = await Lesson.findById(lessonId)
        .populate("teacher", "name email")
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      // Kiểm tra quyền: chỉ giáo viên dạy tiết này hoặc admin/manager mới được cập nhật
      const isTeacherOfLesson =
        lesson.teacher &&
        lesson.teacher._id.toString() === currentUser._id.toString();
      const isAdminOrManager =
        currentUser.role.includes("admin") ||
        currentUser.role.includes("manager");

      if (!isTeacherOfLesson && !isAdminOrManager) {
        return res.status(403).json({
          success: false,
          message: "You can only update description for your own lessons",
        });
      }

      // Cập nhật description
      const oldDescription = lesson.description;
      lesson.description = description.trim();
      lesson.lastModifiedBy = currentUser._id;
      lesson.updatedAt = new Date();

      await lesson.save();

      console.log(
        `✅ Description ${
          oldDescription ? "updated" : "added"
        } for lesson ${lessonId} by user ${currentUser._id}`
      );

      res.status(200).json({
        success: true,
        message: oldDescription
          ? "Mô tả đã được cập nhật thành công"
          : "Mô tả đã được thêm thành công",
        data: {
          lessonId: lesson.lessonId,
          description: lesson.description,
          updatedAt: lesson.updatedAt,
          lastModifiedBy: {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
          },
          lesson: {
            lessonId: lesson.lessonId,
            topic: lesson.topic,
            scheduledDate: lesson.scheduledDate,
            status: lesson.status,
          },
          class: {
            className: lesson.class?.className,
          },
          subject: {
            subjectName: lesson.subject?.subjectName,
            subjectCode: lesson.subject?.subjectCode,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in updateLessonDescription:", error.message);
      next(error);
    }
  }

  // API: Xóa mô tả thêm cho lesson
  async deleteLessonDescription(req, res, next) {
    try {
      const { lessonId } = req.params;
      const currentUser = req.user;

      // Tìm lesson và populate thông tin cần thiết
      const lesson = await Lesson.findById(lessonId)
        .populate("teacher", "name email")
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      // Kiểm tra quyền: chỉ giáo viên dạy tiết này hoặc admin/manager mới được xóa
      const isTeacherOfLesson =
        lesson.teacher &&
        lesson.teacher._id.toString() === currentUser._id.toString();
      const isAdminOrManager =
        currentUser.role.includes("admin") ||
        currentUser.role.includes("manager");

      if (!isTeacherOfLesson && !isAdminOrManager) {
        return res.status(403).json({
          success: false,
          message: "You can only delete description for your own lessons",
        });
      }

      // Kiểm tra xem lesson có description không
      if (!lesson.description || lesson.description.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Lesson does not have a description to delete",
        });
      }

      // Lưu description cũ để trả về
      const deletedDescription = lesson.description;

      // Xóa description
      lesson.description = undefined; // hoặc null
      lesson.lastModifiedBy = currentUser._id;
      lesson.updatedAt = new Date();

      await lesson.save();

      console.log(
        `🗑️ Description deleted for lesson ${lessonId} by user ${currentUser._id}`
      );

      res.status(200).json({
        success: true,
        message: "Mô tả đã được xóa thành công",
        data: {
          lessonId: lesson.lessonId,
          deletedDescription: deletedDescription,
          updatedAt: lesson.updatedAt,
          lastModifiedBy: {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
          },
          lesson: {
            lessonId: lesson.lessonId,
            topic: lesson.topic,
            scheduledDate: lesson.scheduledDate,
            status: lesson.status,
          },
          class: {
            className: lesson.class?.className,
          },
          subject: {
            subjectName: lesson.subject?.subjectName,
            subjectCode: lesson.subject?.subjectCode,
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in deleteLessonDescription:", error.message);
      next(error);
    }
  }

  // API mới: Complete lesson
  async completeLessonById(req, res, next) {
    try {
      const { lessonId } = req.params;
      const teacherId = req.user._id;

      // Tìm lesson
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name email")
        .populate("substituteTeacher", "name email");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      // Kiểm tra quyền: chỉ giáo viên đảm nhiệm hoặc giáo viên dạy thay mới được complete
      const isMainTeacher =
        lesson.teacher &&
        lesson.teacher._id.toString() === teacherId.toString();
      const isSubstituteTeacher =
        lesson.substituteTeacher &&
        lesson.substituteTeacher._id.toString() === teacherId.toString();

      if (!isMainTeacher && !isSubstituteTeacher) {
        return res.status(403).json({
          success: false,
          message:
            "Only the assigned teacher or substitute teacher can complete this lesson",
        });
      }

      // Kiểm tra trạng thái lesson
      if (lesson.status !== "scheduled") {
        return res.status(400).json({
          success: false,
          message: `Cannot complete lesson with status: ${lesson.status}. Only scheduled lessons can be completed.`,
        });
      }

      // Complete lesson
      lesson.status = "completed";
      lesson.actualDate = new Date();
      lesson.lastModifiedBy = teacherId;

      await lesson.save();

      // Xử lý đặc biệt cho makeup lesson
      let originalLessonUpdated = false;
      let originalLessonInfo = null;

      if (
        lesson.type === "makeup" &&
        lesson.makeupInfo &&
        lesson.makeupInfo.originalLesson
      ) {
        try {
          console.log(
            `🔄 Processing makeup lesson completion for lesson: ${lesson.lessonId}`
          );
          console.log(
            `📝 Original lesson ID: ${lesson.makeupInfo.originalLesson}`
          );

          const originalLesson = await Lesson.findById(
            lesson.makeupInfo.originalLesson
          );

          if (!originalLesson) {
            console.log(
              `❌ Original lesson not found: ${lesson.makeupInfo.originalLesson}`
            );
          } else {
            console.log(
              `📋 Original lesson found - Status: ${originalLesson.status}, Type: ${originalLesson.type}`
            );

            originalLessonInfo = {
              id: originalLesson._id,
              lessonId: originalLesson.lessonId,
              previousStatus: originalLesson.status,
              currentStatus: originalLesson.status,
            };

            // Chuyển original lesson sang completed nếu đang cancelled, postponed, hoặc absent
            if (
              originalLesson.status === "cancelled" ||
              originalLesson.status === "postponed" ||
              originalLesson.status === "absent"
            ) {
              console.log(
                `✅ Updating original lesson status from ${originalLesson.status} to completed`
              );

              originalLesson.status = "completed";
              originalLesson.actualDate = lesson.actualDate;
              originalLesson.notes = `Completed through makeup lesson: ${lesson.lessonId}`;
              originalLesson.lastModifiedBy = teacherId;

              await originalLesson.save();
              console.log(`✅ Original lesson updated successfully`);

              originalLessonUpdated = true;
              originalLessonInfo.currentStatus = "completed";
            } else {
              console.log(
                `⚠️ Original lesson status is ${originalLesson.status}, not updating`
              );
            }
          }
        } catch (error) {
          console.error("❌ Error updating original lesson status:", error);
          // Không throw error để không ảnh hưởng đến việc complete makeup lesson
        }
      }

      res.status(200).json({
        success: true,
        message: "Lesson completed successfully",
        data: {
          lessonId: lesson._id,
          lessonCode: lesson.lessonId,
          type: lesson.type,
          status: lesson.status,
          scheduledDate: lesson.scheduledDate,
          actualDate: lesson.actualDate,
          class: lesson.class ? lesson.class.className : null,
          subject: lesson.subject
            ? {
                name: lesson.subject.subjectName,
                code: lesson.subject.subjectCode,
              }
            : null,
          teacher: lesson.teacher
            ? {
                name: lesson.teacher.name,
                email: lesson.teacher.email,
              }
            : null,
          substituteTeacher: lesson.substituteTeacher
            ? {
                name: lesson.substituteTeacher.name,
                email: lesson.substituteTeacher.email,
              }
            : null,
          notes: lesson.notes,
          completedBy: isMainTeacher ? "main_teacher" : "substitute_teacher",
          makeupInfo: lesson.makeupInfo,
          originalLessonUpdate: originalLessonUpdated
            ? {
                updated: true,
                originalLesson: originalLessonInfo,
              }
            : {
                updated: false,
                reason: originalLessonInfo
                  ? `Original lesson status was ${originalLessonInfo.previousStatus}`
                  : "No original lesson found",
              },
        },
      });
    } catch (error) {
      console.error("❌ Error in completeLessonById:", error.message);
      next(error);
    }
  }
}

module.exports = new ScheduleController();
