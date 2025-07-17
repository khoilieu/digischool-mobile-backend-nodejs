const TestInfo = require("../models/test-info.model");
const Lesson = require("../models/lesson.model");
const User = require("../../auth/models/user.model");
const NotificationService = require("../../notification/services/notification.service");

const testTypeNames = {
  kiemtra15: "Kiểm tra 15 phút",
  kiemtra1tiet: "Kiểm tra 1 tiết",
  kiemtrathuchanh: "Kiểm tra thực hành",
  kiemtramieng: "Kiểm tra miệng",
  baitap: "Bài tập",
  other: "Kiểm tra khác",
};
const priorityNames = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};
const priorityColors = {
  low: "#28a745",
  medium: "#ffc107",
  high: "#fd7e14",
  urgent: "#dc3545",
};

class TestInfoService {
  async createTestInfo({ user, params, body }) {
    const { lessonId } = params;
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
    } = body;
    const teacherId = user._id;
    // Tìm lesson và populate thông tin cần thiết
    const lesson = await Lesson.findById(lessonId)
      .populate("class", "_id className")
      .populate("subject", "_id subjectName subjectCode");
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
    // Sau khi tạo testInfo thành công:
    const studentsForNotification = await User.find({
      class: testInfo.class._id,
      role: "student",
    });
    if (studentsForNotification.length > 0) {
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông báo kiểm tra mới",
        content: `Bạn có kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${testInfo.lesson.scheduledDate} (Tiết ${testInfo.lesson.timeSlot.period})`,
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
        },
      },
    };
  }

  async getTeacherTestInfos({ user, query }) {
    const teacherId = user._id;
    const {
      status,
      priority,
      testType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;
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
    return {
      status: 200,
      body: {
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
      },
    };
  }

  async updateTestInfo({ user, params, body }) {
    const { testInfoId } = params;
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
    } = body;
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
    if (testInfo.status === "completed") {
      return {
        status: 400,
        body: { success: false, message: "Cannot update completed test info" },
      };
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
    // Sau khi cập nhật testInfo thành công:
    const studentsForNotification = await User.find({
      class: testInfo.class._id,
      role: "student",
    });
    if (studentsForNotification.length > 0) {
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông tin kiểm tra đã được cập nhật",
        content: `Thông tin kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${testInfo.lesson.scheduledDate} (Tiết ${testInfo.lesson.timeSlot.period}) đã được cập nhật.`,
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
      class: testInfo.class._id,
      role: "student",
    });
    if (studentsForNotification.length > 0) {
      await NotificationService.createNotification({
        type: "activity",
        title: "Thông tin kiểm tra đã bị xóa",
        content: `Thông tin kiểm tra môn ${testInfo.subject.subjectName} vào ngày ${testInfo.lesson.scheduledDate} (Tiết ${testInfo.lesson.timeSlot.period}) đã bị xóa.`,
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
            title: testInfo.title,
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
