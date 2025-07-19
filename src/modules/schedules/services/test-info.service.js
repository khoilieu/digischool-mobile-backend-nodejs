const TestInfo = require("../models/test-info.model");
const Lesson = require("../models/lesson.model");
const User = require("../../auth/models/user.model");
const NotificationService = require("../../notification/services/notification.service");

class TestInfoService {
  // Helper function để format ngày tháng
  formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async createTestInfo({ user, params, body }) {
    const { lessonId } = params;
    const { testType, content, reminder } = body;
    const teacherId = user._id;

    // Tìm lesson và populate thông tin cần thiết
    const lesson = await Lesson.findById(lessonId)
      .populate("class", "_id className")
      .populate("subject", "_id subjectName subjectCode")
      .populate("timeSlot", "period");

    if (!lesson) {
      return {
        status: 404,
        body: { success: false, message: "Lesson not found" },
      };
    }

    if (lesson.status !== "scheduled") {
      return {
        status: 400,
        body: {
          success: false,
          message: "Can only create test info for scheduled lessons",
        },
      };
    }

    if (lesson.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only create test info for your own lessons",
        },
      };
    }

    // Kiểm tra đã có test info cho lesson này chưa
    const existingTestInfo = await TestInfo.findOne({ lesson: lessonId });
    if (existingTestInfo) {
      return {
        status: 409,
        body: {
          success: false,
          message: "Test info already exists for this lesson",
        },
      };
    }

    const testInfo = new TestInfo({
      lesson: lessonId,
      teacher: teacherId,
      class: lesson.class._id,
      subject: lesson.subject._id,
      testType: testType || "kiemtra15",
      content,
      reminder: reminder || "",
    });

    await testInfo.save();
    await testInfo.populate([
      { path: "lesson", select: "lessonId scheduledDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
      { path: "teacher", select: "name" },
    ]);

    // Sau khi tạo testInfo thành công:
    const studentsForNotification = await User.find({
      class_id: testInfo.class._id,
      role: "student",
    });

    if (studentsForNotification.length > 0) {
      const periodText = lesson.timeSlot
        ? `(Tiết ${lesson.timeSlot.period})`
        : "";
      const formattedDate = this.formatDate(testInfo.lesson.scheduledDate);
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông báo kiểm tra mới",
        content: `Bạn có kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${formattedDate} ${periodText}`,
        sender: user._id,
        receiverScope: { type: "class", ids: [testInfo.class._id.toString()] },
        relatedObject: { id: testInfo._id, requestType: "test_info" },
      });
    }

    return {
      status: 201,
      body: {
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
          content: testInfo.content,
          reminder: testInfo.reminder,
          createdAt: testInfo.createdAt,
        },
      },
    };
  }

  async getTeacherTestInfos({ user, query }) {
    const teacherId = user._id;
    const { testType, page = 1, limit = 20 } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const testInfos = await TestInfo.getTeacherTestInfos(teacherId)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await TestInfo.countDocuments({
      teacher: teacherId,
      ...(testType && { testType }),
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy danh sách thông tin kiểm tra thành công",
        data: {
          testInfos: testInfos.map((testInfo) => ({
            testInfoId: testInfo._id,
            lesson: {
              _id: testInfo.lesson._id,
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
            content: testInfo.content,
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
      },
    };
  }

  async updateTestInfo({ user, params, body }) {
    const { testInfoId } = params;
    const { testType, content, reminder } = body;
    const teacherId = user._id;

    const testInfo = await TestInfo.findById(testInfoId);
    if (!testInfo) {
      return {
        status: 404,
        body: { success: false, message: "Test info not found" },
      };
    }

    if (testInfo.teacher.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only update your own test info",
        },
      };
    }

    if (testType) testInfo.testType = testType;
    if (content) testInfo.content = content;
    if (reminder !== undefined) testInfo.reminder = reminder;

    await testInfo.save();
    await testInfo.populate([
      { path: "lesson", select: "lessonId scheduledDate topic" },
      { path: "class", select: "className" },
      { path: "subject", select: "subjectName subjectCode" },
    ]);

    // Sau khi cập nhật testInfo thành công:
    const studentsForNotification = await User.find({
      class_id: testInfo.class._id,
      role: "student",
    });

    if (studentsForNotification.length > 0) {
      const formattedDate = this.formatDate(testInfo.lesson.scheduledDate);
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông tin kiểm tra đã được cập nhật",
        content: `Thông tin kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${formattedDate} đã được cập nhật.`,
        sender: user._id,
        receiverScope: { type: "class", ids: [testInfo.class._id.toString()] },
        relatedObject: { id: testInfo._id, requestType: "test_info" },
      });
    }

    return {
      status: 200,
      body: {
        success: true,
        message: "Cập nhật thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          testType: testInfo.testType,
          content: testInfo.content,
          reminder: testInfo.reminder,
          updatedAt: testInfo.updatedAt,
        },
      },
    };
  }

  async deleteTestInfo({ user, params }) {
    const { testInfoId } = params;
    const teacherId = user._id;

    const testInfo = await TestInfo.findById(testInfoId)
      .populate("lesson", "lessonId scheduledDate topic")
      .populate("class", "_id className")
      .populate("subject", "subjectName subjectCode")
      .populate("teacher", "name");

    if (!testInfo) {
      return {
        status: 404,
        body: { success: false, message: "Test info not found" },
      };
    }

    if (testInfo.teacher._id.toString() !== teacherId.toString()) {
      return {
        status: 403,
        body: {
          success: false,
          message: "You can only delete your own test info",
        },
      };
    }

    await TestInfo.findByIdAndDelete(testInfoId);

    // Sau khi xóa testInfo thành công:
    const studentsForNotification = await User.find({
      class_id: testInfo.class._id,
      role: "student",
    });

    if (studentsForNotification.length > 0) {
      const formattedDate = this.formatDate(testInfo.lesson.scheduledDate);
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông tin kiểm tra đã bị xóa",
        content: `Thông tin kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${formattedDate} đã bị xóa.`,
        sender: user._id,
        receiverScope: { type: "class", ids: [testInfo.class._id.toString()] },
        relatedObject: { id: testInfo._id, requestType: "test_info" },
      });
    }

    return {
      status: 200,
      body: {
        success: true,
        message:
          "Xóa thông tin kiểm tra thành công và đã gửi thông báo hủy cho học sinh",
        data: {
          deletedTestInfo: {
            testInfoId: testInfo._id,
            testType: testInfo.testType,
            class: testInfo.class.className,
            subject: testInfo.subject.subjectName,
          },
        },
      },
    };
  }
}

module.exports = new TestInfoService();
