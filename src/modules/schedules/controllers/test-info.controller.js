const TestInfo = require("../models/test-info.model");
const testInfoEmailService = require("../services/test-info-email.service");

class TestInfoController {
  // API để tạo thông tin kiểm tra cho tiết học
  async createTestInfo(req, res, next) {
    try {
      const { lessonId } = req.params;
      const {
        testType,
        title,
        content,
        chapters,
        references,
        expectedTestDate,
        testInfoDate,
        priority,
        reminder,
      } = req.body;

      const teacherId = req.user._id;
      const Lesson = require("../models/lesson.model");
      const User = require("../../auth/models/user.model");

      // Tìm lesson và populate thông tin cần thiết
      const lesson = await Lesson.findById(lessonId)
        .populate("class", "_id className")
        .populate("subject", "_id subjectName subjectCode");

      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      if (lesson.status !== "scheduled") {
        return res.status(400).json({
          success: false,
          message: "Can only create test info for scheduled lessons",
        });
      }

      if (lesson.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only create test info for your own lessons",
        });
      }

      // Kiểm tra đã có test info cho lesson này chưa
      const existingTestInfo = await TestInfo.findOne({ lesson: lessonId });
      if (existingTestInfo) {
        return res.status(409).json({
          success: false,
          message: "Test info already exists for this lesson",
        });
      }

      // Nếu không có expectedTestDate, tạo mặc định là 7 ngày sau
      const defaultTestDate = new Date();
      defaultTestDate.setDate(defaultTestDate.getDate() + 7);

      const testInfo = new TestInfo({
        lesson: lessonId,
        teacher: teacherId,
        class: lesson.class._id,
        subject: lesson.subject._id,
        testType: testType || "kiemtra15",
        title,
        content,
        chapters: chapters || [],
        references: references || [],
        expectedTestDate: expectedTestDate
          ? new Date(expectedTestDate)
          : defaultTestDate,
        testInfoDate: testInfoDate ? new Date(testInfoDate) : new Date(),
        priority: priority || "medium",
        reminder: reminder || "",
      });

      await testInfo.save();

      await testInfo.populate([
        { path: "lesson", select: "lessonId scheduledDate topic" },
        { path: "class", select: "className" },
        { path: "subject", select: "subjectName subjectCode" },
        { path: "teacher", select: "name" },
      ]);

      // Lấy danh sách học sinh trong lớp để gửi email
      const students = await User.find({
        class_id: lesson.class._id,
        role: { $in: ["student"] },
        email: { $exists: true, $ne: null, $ne: "" },
      }).select("_id name email studentId");

      // Chuẩn bị dữ liệu cho email
      const testInfoEmailData = {
        lesson: {
          lessonId: testInfo.lesson.lessonId,
          scheduledDate: testInfo.lesson.scheduledDate,
          topic: testInfo.lesson.topic,
        },
        class: {
          className: testInfo.class.className,
        },
        subject: {
          name: testInfo.subject.subjectName,
          code: testInfo.subject.subjectCode,
        },
        testType: testInfo.testType,
        title: testInfo.title,
        content: testInfo.content,
        chapters: testInfo.chapters,
        references: testInfo.references,
        expectedTestDate: testInfo.expectedTestDate,
        priority: testInfo.priority,
        reminder: testInfo.reminder,
      };

      // Gửi email cho học sinh (async, không chờ kết quả)
      if (students.length > 0) {
        testInfoEmailService
          .sendTestInfoToStudents(testInfoEmailData, students)
          .then((emailResults) => {
            console.log(
              `📧 Email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`
            );
          })
          .catch((error) => {
            console.error("❌ Error sending test info emails:", error.message);
          });
      }

      res.status(201).json({
        success: true,
        message: "Tạo thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          lesson: {
            lessonId: testInfo.lesson.lessonId,
            scheduledDate: testInfo.lesson.scheduledDate,
            topic: testInfo.lesson.topic,
          },
          class: testInfo.class.className,
          subject: {
            name: testInfo.subject.subjectName,
            code: testInfo.subject.subjectCode,
          },
          teacher: testInfo.teacher.name,
          testType: testInfo.testType,
          title: testInfo.title,
          content: testInfo.content,
          chapters: testInfo.chapters,
          references: testInfo.references,
          expectedTestDate: testInfo.expectedTestDate,
          testInfoDate: testInfo.testInfoDate,
          priority: testInfo.priority,
          status: testInfo.status,
          reminder: testInfo.reminder,
          createdAt: testInfo.createdAt,
          emailInfo: {
            studentsFound: students.length,
            emailsSent:
              students.length > 0
                ? "Đang gửi email..."
                : "Không có học sinh nào có email",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in createTestInfo:", error.message);
      next(error);
    }
  }

  // API lấy danh sách test info của giáo viên
  async getTeacherTestInfos(req, res, next) {
    try {
      const teacherId = req.user._id;
      const {
        status,
        priority,
        testType,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const options = {};
      if (status) options.status = status;
      if (priority) options.priority = priority;
      if (testType) options.testType = testType;
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const testInfos = await TestInfo.getTeacherTestInfos(teacherId, options)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await TestInfo.countDocuments({
        teacher: teacherId,
        ...(options.status && { status: options.status }),
        ...(options.priority && { priority: options.priority }),
        ...(options.testType && { testType: options.testType }),
        ...(options.startDate && {
          expectedTestDate: { $gte: options.startDate },
        }),
        ...(options.endDate && {
          expectedTestDate: { ...{}, $lte: options.endDate },
        }),
      });

      const totalPages = Math.ceil(total / parseInt(limit));

      res.status(200).json({
        success: true,
        message: "Lấy danh sách thông tin kiểm tra thành công",
        data: {
          testInfos: testInfos.map((testInfo) => ({
            testInfoId: testInfo._id,
            lesson: {
              lessonId: testInfo.lesson.lessonId,
              scheduledDate: testInfo.lesson.scheduledDate,
              topic: testInfo.lesson.topic,
            },
            class: testInfo.class.className,
            subject: {
              name: testInfo.subject.subjectName,
              code: testInfo.subject.subjectCode,
            },
            testType: testInfo.testType,
            title: testInfo.title,
            content: testInfo.content,
            expectedTestDate: testInfo.expectedTestDate,
            testInfoDate: testInfo.testInfoDate,
            priority: testInfo.priority,
            status: testInfo.status,
            reminder: testInfo.reminder,
            createdAt: testInfo.createdAt,
            updatedAt: testInfo.updatedAt,
          })),
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in getTeacherTestInfos:", error.message);
      next(error);
    }
  }

  // API lấy chi tiết test info
  async getTestInfoDetail(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const teacherId = req.user._id;

      const testInfo = await TestInfo.findById(testInfoId)
        .populate("lesson", "lessonId scheduledDate topic")
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");

      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }

      if (testInfo.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own test info",
        });
      }

      res.status(200).json({
        success: true,
        message: "Lấy chi tiết thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          lesson: {
            lessonId: testInfo.lesson.lessonId,
            scheduledDate: testInfo.lesson.scheduledDate,
            topic: testInfo.lesson.topic,
          },
          class: testInfo.class.className,
          subject: {
            name: testInfo.subject.subjectName,
            code: testInfo.subject.subjectCode,
          },
          teacher: testInfo.teacher.name,
          testType: testInfo.testType,
          title: testInfo.title,
          content: testInfo.content,
          chapters: testInfo.chapters,
          references: testInfo.references,
          expectedTestDate: testInfo.expectedTestDate,
          testInfoDate: testInfo.testInfoDate,
          priority: testInfo.priority,
          status: testInfo.status,
          reminder: testInfo.reminder,
          isVisible: testInfo.isVisible,
          createdAt: testInfo.createdAt,
          updatedAt: testInfo.updatedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error in getTestInfoDetail:", error.message);
      next(error);
    }
  }

  // API cập nhật test info
  async updateTestInfo(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const {
        testType,
        title,
        content,
        chapters,
        references,
        expectedTestDate,
        testInfoDate,
        priority,
        reminder,
      } = req.body;

      const teacherId = req.user._id;
      const testInfo = await TestInfo.findById(testInfoId);
      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }

      if (testInfo.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own test info",
        });
      }

      if (testInfo.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Cannot update completed test info",
        });
      }

      if (testType) testInfo.testType = testType;
      if (title) testInfo.title = title;
      if (content) testInfo.content = content;
      if (chapters !== undefined) testInfo.chapters = chapters;
      if (references !== undefined) testInfo.references = references;
      if (expectedTestDate)
        testInfo.expectedTestDate = new Date(expectedTestDate);
      if (testInfoDate) testInfo.testInfoDate = new Date(testInfoDate);
      if (priority) testInfo.priority = priority;
      if (reminder !== undefined) testInfo.reminder = reminder;

      await testInfo.save();

      await testInfo.populate([
        { path: "lesson", select: "lessonId scheduledDate topic" },
        { path: "class", select: "className" },
        { path: "subject", select: "subjectName subjectCode" },
      ]);

      res.status(200).json({
        success: true,
        message: "Cập nhật thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          testType: testInfo.testType,
          title: testInfo.title,
          content: testInfo.content,
          chapters: testInfo.chapters,
          references: testInfo.references,
          expectedTestDate: testInfo.expectedTestDate,
          testInfoDate: testInfo.testInfoDate,
          priority: testInfo.priority,
          status: testInfo.status,
          reminder: testInfo.reminder,
          updatedAt: testInfo.updatedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error in updateTestInfo:", error.message);
      next(error);
    }
  }

  // API xóa test info
  async deleteTestInfo(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const teacherId = req.user._id;
      const testInfo = await TestInfo.findById(testInfoId)
        .populate("lesson", "lessonId scheduledDate topic")
        .populate("class", "_id className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");

      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }

      if (testInfo.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own test info",
        });
      }

      const User = require("../../auth/models/user.model");
      const students = await User.find({
        class_id: testInfo.class._id,
        role: { $in: ["student"] },
        email: { $exists: true, $ne: null, $ne: "" },
      }).select("_id name email studentId");

      const testInfoEmailData = {
        lesson: {
          lessonId: testInfo.lesson.lessonId,
          scheduledDate: testInfo.lesson.scheduledDate,
          topic: testInfo.lesson.topic,
        },
        class: {
          className: testInfo.class.className,
        },
        subject: {
          name: testInfo.subject.subjectName,
          code: testInfo.subject.subjectCode,
        },
        testType: testInfo.testType,
        title: testInfo.title,
        content: testInfo.content,
        chapters: testInfo.chapters,
        references: testInfo.references,
        expectedTestDate: testInfo.expectedTestDate,
        priority: testInfo.priority,
        reminder: testInfo.reminder,
      };

      await TestInfo.findByIdAndDelete(testInfoId);

      if (students.length > 0) {
        testInfoEmailService
          .sendCancelTestInfoToStudents(testInfoEmailData, students)
          .then((emailResults) => {
            console.log(
              `📧 Cancellation email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`
            );
          })
          .catch((error) => {
            console.error(
              "❌ Error sending cancellation emails:",
              error.message
            );
          });
      }

      res.status(200).json({
        success: true,
        message:
          "Xóa thông tin kiểm tra thành công và đã gửi thông báo hủy cho học sinh",
        data: {
          deletedTestInfo: {
            testInfoId: testInfo._id,
            title: testInfo.title,
            testType: testInfo.testType,
            class: testInfo.class.className,
            subject: testInfo.subject.subjectName,
          },
          emailInfo: {
            studentsFound: students.length,
            cancellationEmailsSent:
              students.length > 0
                ? "Đang gửi email hủy..."
                : "Không có học sinh nào có email",
          },
        },
      });
    } catch (error) {
      console.error("❌ Error in deleteTestInfo:", error.message);
      next(error);
    }
  }

  // API lấy test info sắp đến hạn
  async getUpcomingTestInfos(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { days = 7 } = req.query;

      const upcomingTestInfos = await TestInfo.getUpcomingTestInfos(
        teacherId,
        parseInt(days)
      );

      res.status(200).json({
        success: true,
        message: `Lấy thông tin kiểm tra ${days} ngày tới thành công`,
        data: {
          upcomingTestInfos: upcomingTestInfos.map((testInfo) => ({
            testInfoId: testInfo._id,
            lesson: {
              lessonId: testInfo.lesson.lessonId,
              scheduledDate: testInfo.lesson.scheduledDate,
              topic: testInfo.lesson.topic,
            },
            class: testInfo.class.className,
            subject: {
              name: testInfo.subject.subjectName,
              code: testInfo.subject.subjectCode,
            },
            testType: testInfo.testType,
            title: testInfo.title,
            expectedTestDate: testInfo.expectedTestDate,
            priority: testInfo.priority,
            daysUntilTest: Math.ceil(
              (new Date(testInfo.expectedTestDate) - new Date()) /
                (1000 * 60 * 60 * 24)
            ),
          })),
          totalUpcoming: upcomingTestInfos.length,
        },
      });
    } catch (error) {
      console.error("❌ Error in getUpcomingTestInfos:", error.message);
      next(error);
    }
  }

  // API đánh dấu hoàn thành test info
  async markTestInfoCompleted(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const teacherId = req.user._id;
      const testInfo = await TestInfo.findById(testInfoId);
      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }
      if (testInfo.teacher.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own test info",
        });
      }
      await testInfo.markCompleted();
      res.status(200).json({
        success: true,
        message: "Đánh dấu hoàn thành thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          status: testInfo.status,
          updatedAt: testInfo.updatedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error in markTestInfoCompleted:", error.message);
      next(error);
    }
  }

  // API lấy thống kê test info
  async getTestInfoStats(req, res, next) {
    try {
      const teacherId = req.user._id;
      const { startDate, endDate } = req.query;
      const options = {};
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);
      const stats = await TestInfo.getTestInfoStats(teacherId, options);
      res.status(200).json({
        success: true,
        message: "Lấy thống kê thông tin kiểm tra thành công",
        data: stats,
      });
    } catch (error) {
      console.error("❌ Error in getTestInfoStats:", error.message);
      next(error);
    }
  }

  // API gửi lại email test info cho học sinh
  async resendTestInfoEmail(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const teacherId = req.user._id;
      const testInfo = await TestInfo.findById(testInfoId)
        .populate("lesson", "lessonId scheduledDate topic")
        .populate("class", "_id className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");
      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }
      if (testInfo.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only resend emails for your own test info",
        });
      }
      const User = require("../../auth/models/user.model");
      const students = await User.find({
        class_id: testInfo.class._id,
        role: { $in: ["student"] },
        email: { $exists: true, $ne: null, $ne: "" },
      }).select("_id name email studentId");
      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No students with email found in this class",
        });
      }
      const testInfoEmailData = {
        lesson: {
          lessonId: testInfo.lesson.lessonId,
          scheduledDate: testInfo.lesson.scheduledDate,
          topic: testInfo.lesson.topic,
        },
        class: {
          className: testInfo.class.className,
        },
        subject: {
          name: testInfo.subject.subjectName,
          code: testInfo.subject.subjectCode,
        },
        testType: testInfo.testType,
        title: testInfo.title,
        content: testInfo.content,
        chapters: testInfo.chapters,
        references: testInfo.references,
        expectedTestDate: testInfo.expectedTestDate,
        priority: testInfo.priority,
        reminder: testInfo.reminder,
      };
      try {
        const emailResults = await testInfoEmailService.sendTestInfoToStudents(
          testInfoEmailData,
          students
        );
        res.status(200).json({
          success: true,
          message: "Gửi lại email thông tin kiểm tra thành công",
          data: {
            testInfoId: testInfo._id,
            title: testInfo.title,
            class: testInfo.class.className,
            emailResults: {
              totalStudents: emailResults.totalStudents,
              successCount: emailResults.successCount,
              failCount: emailResults.failCount,
              details: emailResults.results.map((result) => ({
                studentName: result.studentName,
                email: result.email,
                success: result.success,
                message: result.message || result.error,
              })),
            },
          },
        });
      } catch (error) {
        console.error("❌ Error sending test info emails:", error);
        res.status(500).json({
          success: false,
          message: "Error sending test info emails",
          error: error.message,
        });
      }
    } catch (error) {
      console.error("❌ Error in resendTestInfoEmail:", error.message);
      next(error);
    }
  }

  // API test gửi email test info
  async testTestInfoEmail(req, res, next) {
    try {
      const { testInfoId } = req.params;
      const { testEmail } = req.body;
      const teacherId = req.user._id;
      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: "Test email is required",
        });
      }
      const testInfo = await TestInfo.findById(testInfoId)
        .populate("lesson", "lessonId scheduledDate topic")
        .populate("class", "className")
        .populate("subject", "subjectName subjectCode")
        .populate("teacher", "name");
      if (!testInfo) {
        return res.status(404).json({
          success: false,
          message: "Test info not found",
        });
      }
      if (testInfo.teacher._id.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only test emails for your own test info",
        });
      }
      const testInfoEmailData = {
        lesson: {
          lessonId: testInfo.lesson.lessonId,
          scheduledDate: testInfo.lesson.scheduledDate,
          topic: testInfo.lesson.topic,
        },
        class: {
          className: testInfo.class.className,
        },
        subject: {
          name: testInfo.subject.subjectName,
          code: testInfo.subject.subjectCode,
        },
        testType: testInfo.testType,
        title: testInfo.title,
        content: testInfo.content,
        chapters: testInfo.chapters,
        references: testInfo.references,
        expectedTestDate: testInfo.expectedTestDate,
        priority: testInfo.priority,
        reminder: testInfo.reminder,
      };
      try {
        const result = await testInfoEmailService.sendTestInfoTestEmail(
          testEmail,
          testInfoEmailData
        );
        res.status(200).json({
          success: true,
          message: "Gửi test email thành công",
          data: {
            testInfoId: testInfo._id,
            title: testInfo.title,
            testEmail: testEmail,
            messageId: result.messageId,
            message: result.message,
          },
        });
      } catch (error) {
        console.error("❌ Error sending test email:", error);
        res.status(500).json({
          success: false,
          message: "Error sending test email",
          error: error.message,
        });
      }
    } catch (error) {
      console.error("❌ Error in testTestInfoEmail:", error.message);
      next(error);
    }
  }
}

module.exports = new TestInfoController();
