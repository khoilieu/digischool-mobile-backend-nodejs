const TestInfo = require("../models/test-info.model");
const Lesson = require("../models/lesson.model");
const User = require("../../auth/models/user.model");
const emailService = require("../../auth/services/email.service");

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

function createTestInfoEmailTemplate(testInfoData, studentName) {
  const {
    lesson,
    class: classInfo,
    subject,
    testType,
    title,
    content,
    expectedTestDate,
    priority,
    chapters,
    references,
  } = testInfoData;

  // Format ngày giờ tiết học
  const lessonDate = new Date(lesson.scheduledDate);
  const formatDate = lessonDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formatTime = lessonDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f8f9fa;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: black">🔔 THÔNG BÁO KIỂM TRA</h1>
        <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9; color: black">Hệ thống quản lý trường học EcoSchool</p>
      </div>
      
      <!-- Greeting -->
      <div style="padding: 30px 20px 20px; background: white;">
        <h2 style="color: #2c3e50; margin: 0 0 15px; font-size: 22px;">Xin chào ${studentName}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
          Giáo viên đã tạo thông báo nhắc nhở về bài kiểm tra sắp tới. Vui lòng xem thông tin chi tiết bên dưới.
        </p>
      </div>
      
      <!-- Main Content -->
      <div style="background: white; padding: 0 20px 20px;">
        <!-- Test Info Card -->
        <div style="border: 2px solid #e9ecef; border-radius: 10px; overflow: hidden; margin-bottom: 25px;">
          <div style="background: #f8f9fa; padding: 15px; border-bottom: 1px solid #e9ecef;">
            <h3 style="margin: 0; color: #495057; font-size: 18px;">📋 ${title}</h3>
          </div>
          <div style="padding: 20px;">
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">📚 Môn học:</span>
                <span style="color: #007bff; font-weight: 500;">${
                  subject.name
                } (${subject.code})</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">🏫 Lớp:</span>
                <span style="color: #28a745; font-weight: 500;">${
                  classInfo.className
                }</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">📝 Loại:</span>
                <span style="color: #6f42c1; font-weight: 500;">${
                  testTypeNames[testType] || testType
                }</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">⚡ Mức độ:</span>
                <span style="background: ${
                  priorityColors[priority]
                }; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                  ${priorityNames[priority] || priority}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Date Time Card -->
        <div style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; border-radius: 10px; padding: 25px; margin-bottom: 25px; text-align: center;">
          <h3 style="margin: 0 0 15px; font-size: 20px;">📅 THỜI GIAN TIẾT HỌC</h3>
          <div style="background: rgba(255,255,255,0.2); border-radius: 8px; padding: 15px; margin: 15px 0;">
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">${formatDate}</div>
            <div style="font-size: 24px; font-weight: 700;">${formatTime}</div>
          </div>
          <p style="margin: 15px 0 0; font-size: 14px; opacity: 0.9;">
            Thời gian diễn ra tiết học có kiểm tra
          </p>
        </div>
        
        <!-- Content -->
        <div style="border-left: 4px solid #007bff; background: #f8f9fa; padding: 20px; margin-bottom: 25px;">
          <h4 style="margin: 0 0 15px; color: #495057; font-size: 16px;">📖 NỘI DUNG KIỂM TRA:</h4>
          <p style="margin: 0; color: #666; line-height: 1.6; font-size: 15px;">${content}</p>
        </div>
        
        ${
          chapters && chapters.length > 0
            ? `
        <!-- Chapters -->
        <div style="margin-bottom: 25px;">
          <h4 style="color: #495057; font-size: 16px; margin: 0 0 15px;">📚 CHƯƠNG/BÀI CẦN ÔN TẬP:</h4>
          ${chapters
            .map(
              (chapter) => `
            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <h5 style="color: #007bff; margin: 0 0 10px; font-size: 15px;">${
                chapter.chapterName
              }</h5>
              ${
                chapter.topics && chapter.topics.length > 0
                  ? `
                <ul style="margin: 0; padding-left: 20px; color: #666;">
                  ${chapter.topics
                    .map(
                      (topic) => `<li style="margin-bottom: 5px;">${topic}</li>`
                    )
                    .join("")}
                </ul>
              `
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }
        
        ${
          references && references.length > 0
            ? `
        <!-- References -->
        <div style="margin-bottom: 25px;">
          <h4 style="color: #495057; font-size: 16px; margin: 0 0 15px;">📖 TÀI LIỆU THAM KHẢO:</h4>
          ${references
            .map(
              (ref) => `
            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
              <h6 style="margin: 0 0 8px; color: #1976d2; font-size: 14px;">${
                ref.title
              }</h6>
              ${
                ref.description
                  ? `<p style="margin: 0 0 8px; color: #666; font-size: 13px;">${ref.description}</p>`
                  : ""
              }
              ${
                ref.url
                  ? `<a href="${ref.url}" style="color: #1976d2; text-decoration: none; font-size: 13px;">🔗 Xem tài liệu</a>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
        `
            : ""
        }
        
        <!-- Tips -->
        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #155724; margin: 0 0 15px; font-size: 16px;">💡 KHUYẾN NGHỊ:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #155724; line-height: 1.8;">
            <li>Ôn tập kỹ lý thuyết và làm bài tập thực hành</li>
            <li>Chuẩn bị đầy đủ dụng cụ: bút, thước, máy tính (nếu cần)</li>
            <li>Có mặt đúng giờ, không được phép đến muộn</li>
            <li>Giữ gìn trật tự và không gian thi cử nghiêm túc</li>
            <li>Hỏi giáo viên nếu có thắc mắc về nội dung kiểm tra</li>
          </ul>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px;">
          Chúc bạn ôn tập tốt và đạt kết quả cao! 🌟
        </p>
        <hr style="border: none; border-top: 1px solid #495057; margin: 15px 0;">
        <p style="margin: 0; font-size: 12px; color: #adb5bd;">
          Email này được gửi tự động từ hệ thống EcoSchool<br>
          Vui lòng không phản hồi email này
        </p>
      </div>
    </div>
  `;
}

function createCancelTestInfoEmailTemplate(testInfoData, studentName) {
  const {
    lesson,
    class: classInfo,
    subject,
    testType,
    title,
    content,
    expectedTestDate,
  } = testInfoData;

  // Format ngày giờ tiết học
  const lessonDate = new Date(lesson.scheduledDate);
  const formatDate = lessonDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formatTime = lessonDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f8f9fa;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 300; color: black">❌ THÔNG BÁO HỦY KIỂM TRA</h1>
        <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9; color: black">Hệ thống quản lý trường học EcoSchool</p>
      </div>
      
      <!-- Greeting -->
      <div style="padding: 30px 20px 20px; background: white;">
        <h2 style="color: #2c3e50; margin: 0 0 15px; font-size: 22px;">Xin chào ${studentName}!</h2>
        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
          Giáo viên đã <strong style="color: #dc3545;">HỦY</strong> thông báo nhắc nhở kiểm tra. Vui lòng xem thông tin chi tiết bên dưới.
        </p>
      </div>
      
      <!-- Main Content -->
      <div style="background: white; padding: 0 20px 20px;">
        <!-- Cancel Notice -->
        <div style="background: #f8d7da; border: 2px solid #f5c6cb; border-radius: 10px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <h3 style="color: #721c24; margin: 0 0 10px; font-size: 20px;">🚫 KIỂM TRA ĐÃ BỊ HỦY</h3>
          <p style="color: #721c24; margin: 0; font-size: 16px;">
            Bài kiểm tra dưới đây đã được giáo viên hủy bỏ. Bạn không cần chuẩn bị cho bài kiểm tra này nữa.
          </p>
        </div>
        
        <!-- Test Info Card -->
        <div style="border: 2px solid #dc3545; border-radius: 10px; overflow: hidden; margin-bottom: 25px; opacity: 0.8;">
          <div style="background: #dc3545; color: white; padding: 15px; border-bottom: 1px solid #c82333;">
            <h3 style="margin: 0; font-size: 18px;">📋 ${title} (ĐÃ HỦY)</h3>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">📚 Môn học:</span>
                <span style="color: #007bff; font-weight: 500;">${
                  subject.name
                } (${subject.code})</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">🏫 Lớp:</span>
                <span style="color: #28a745; font-weight: 500;">${
                  classInfo.className
                }</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">📝 Loại:</span>
                <span style="color: #6f42c1; font-weight: 500;">${
                  testTypeNames[testType] || testType
                }</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="font-weight: 600; color: #495057; width: 120px; display: inline-block;">📅 Tiết học:</span>
                <span style="color: #dc3545; font-weight: 500; text-decoration: line-through;">
                  ${formatDate} - ${formatTime}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="border-left: 4px solid #dc3545; background: #f8f9fa; padding: 20px; margin-bottom: 25px;">
          <h4 style="margin: 0 0 15px; color: #495057; font-size: 16px;">📖 NỘI DUNG ĐÃ HỦY:</h4>
          <p style="margin: 0; color: #666; line-height: 1.6; font-size: 15px; text-decoration: line-through; opacity: 0.7;">${content}</p>
        </div>
        
        <!-- Notice -->
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h4 style="color: #0c5460; margin: 0 0 15px; font-size: 16px;">📢 LƯU Ý QUAN TRỌNG:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #0c5460; line-height: 1.8;">
            <li>Bài kiểm tra này đã được hủy bỏ hoàn toàn</li>
            <li>Bạn không cần chuẩn bị hay ôn tập cho bài kiểm tra này</li>
            <li>Nếu có bài kiểm tra thay thế, giáo viên sẽ thông báo riêng</li>
            <li>Vui lòng liên hệ giáo viên nếu có thắc mắc</li>
            <li>Tiếp tục theo dõi email để nhận thông báo mới</li>
          </ul>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #343a40; color: white; padding: 20px; text-align: center;">
        <p style="margin: 0 0 10px; font-size: 14px;">
          Cảm ơn bạn đã quan tâm! 📚
        </p>
        <hr style="border: none; border-top: 1px solid #495057; margin: 15px 0;">
        <p style="margin: 0; font-size: 12px; color: #adb5bd;">
          Email này được gửi tự động từ hệ thống EcoSchool<br>
          Vui lòng không phản hồi email này
        </p>
      </div>
    </div>
  `;
}

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
      class: { className: testInfo.class.className },
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
      this.sendTestInfoToStudents(testInfoEmailData, students)
        .then((emailResults) => {
          console.log(
            `📧 Email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`
          );
        })
        .catch((error) => {
          console.error("❌ Error sending test info emails:", error.message);
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
          emailInfo: {
            studentsFound: students.length,
            emailsSent:
              students.length > 0
                ? "Đang gửi email..."
                : "Không có học sinh nào có email",
          },
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
  async getTestInfoDetail({ user, params }) {
    const { testInfoId } = params;
    const teacherId = user._id;
    const testInfo = await TestInfo.findById(testInfoId)
      .populate("lesson", "lessonId scheduledDate topic")
      .populate("class", "className")
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
          message: "You can only view your own test info",
        },
      };
    }
    return {
      status: 200,
      body: {
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
      class: { className: testInfo.class.className },
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
      this.sendCancelTestInfoToStudents(testInfoEmailData, students)
        .then((emailResults) => {
          console.log(
            `📧 Cancellation email sending completed: ${emailResults.successCount}/${emailResults.totalStudents} successful`
          );
        })
        .catch((error) => {
          console.error("❌ Error sending cancellation emails:", error.message);
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
          emailInfo: {
            studentsFound: students.length,
            cancellationEmailsSent:
              students.length > 0
                ? "Đang gửi email hủy..."
                : "Không có học sinh nào có email",
          },
        },
      },
    };
  }
  async getUpcomingTestInfos({ user, query }) {
    const teacherId = user._id;
    const { days = 7 } = query;
    const upcomingTestInfos = await TestInfo.getUpcomingTestInfos(
      teacherId,
      parseInt(days)
    );
    return {
      status: 200,
      body: {
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
      },
    };
  }
  async markTestInfoCompleted({ user, params }) {
    const { testInfoId } = params;
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
    await testInfo.markCompleted();
    return {
      status: 200,
      body: {
        success: true,
        message: "Đánh dấu hoàn thành thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          status: testInfo.status,
          updatedAt: testInfo.updatedAt,
        },
      },
    };
  }
  async getTestInfoStats({ user, query }) {
    const teacherId = user._id;
    const { startDate, endDate } = query;
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    const stats = await TestInfo.getTestInfoStats(teacherId, options);
    return {
      status: 200,
      body: {
        success: true,
        message: "Lấy thống kê thông tin kiểm tra thành công",
        data: stats,
      },
    };
  }
  async resendTestInfoEmail({ user, params }) {
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
          message: "You can only resend emails for your own test info",
        },
      };
    }
    const students = await User.find({
      class_id: testInfo.class._id,
      role: { $in: ["student"] },
      email: { $exists: true, $ne: null, $ne: "" },
    }).select("_id name email studentId");
    if (students.length === 0) {
      return {
        status: 400,
        body: {
          success: false,
          message: "No students with email found in this class",
        },
      };
    }
    const testInfoEmailData = {
      lesson: {
        lessonId: testInfo.lesson.lessonId,
        scheduledDate: testInfo.lesson.scheduledDate,
        topic: testInfo.lesson.topic,
      },
      class: { className: testInfo.class.className },
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
    const emailResults = await this.sendTestInfoToStudents(
      testInfoEmailData,
      students
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Gửi lại email thông tin kiểm tra thành công",
        data: {
          testInfoId: testInfo._id,
          title: testInfo.title,
          class: testInfo.class.className,
          emailResults,
        },
      },
    };
  }
  async testTestInfoEmail({ user, params, body }) {
    const { testInfoId } = params;
    const { testEmail } = body;
    const teacherId = user._id;
    if (!testEmail) {
      return {
        status: 400,
        body: { success: false, message: "Test email is required" },
      };
    }
    const testInfo = await TestInfo.findById(testInfoId)
      .populate("lesson", "lessonId scheduledDate topic")
      .populate("class", "className")
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
          message: "You can only test emails for your own test info",
        },
      };
    }
    const testInfoEmailData = {
      lesson: {
        lessonId: testInfo.lesson.lessonId,
        scheduledDate: testInfo.lesson.scheduledDate,
        topic: testInfo.lesson.topic,
      },
      class: { className: testInfo.class.className },
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
    const subject = `🧪 [TEST] Thông báo kiểm tra: ${testInfoEmailData.subject.name} - Lớp ${testInfoEmailData.class.className}`;
    const htmlContent = createTestInfoEmailTemplate(
      testInfoEmailData,
      "Test Student"
    );
    const result = await emailService.sendEmail(
      testEmail,
      subject,
      htmlContent
    );
    return {
      status: 200,
      body: {
        success: true,
        message: "Gửi test email thành công",
        data: {
          testInfoId: testInfo._id,
          title: testInfo.title,
          testEmail: testEmail,
          messageId: result.messageId,
          message: result.message,
        },
      },
    };
  }
  async sendTestInfoToStudents(testInfoData, students) {
    try {
      const emailPromises = students.map(async (student) => {
        try {
          const subject = `🔔 Thông báo kiểm tra: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
          const htmlContent = createTestInfoEmailTemplate(
            testInfoData,
            student.name
          );
          const result = await emailService.sendEmail(
            student.email,
            subject,
            htmlContent
          );
          return {
            studentId: student._id,
            studentName: student.name,
            email: student.email,
            success: true,
            messageId: result.messageId,
            message: result.message || "Email sent successfully",
          };
        } catch (error) {
          return {
            studentId: student._id,
            studentName: student.name,
            email: student.email,
            success: false,
            error: error.message,
          };
        }
      });
      const results = await Promise.allSettled(emailPromises);
      const emailResults = results.map((result) =>
        result.status === "fulfilled" ? result.value : result.reason
      );
      const successCount = emailResults.filter((r) => r.success).length;
      const failCount = emailResults.filter((r) => !r.success).length;
      return {
        totalStudents: students.length,
        successCount,
        failCount,
        results: emailResults,
      };
    } catch (error) {
      throw error;
    }
  }
  async sendCancelTestInfoToStudents(testInfoData, students) {
    try {
      const emailPromises = students.map(async (student) => {
        try {
          const subject = `❌ THÔNG BÁO HỦY: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
          const htmlContent = createCancelTestInfoEmailTemplate(
            testInfoData,
            student.name
          );
          const result = await emailService.sendEmail(
            student.email,
            subject,
            htmlContent
          );
          return {
            studentId: student._id,
            studentName: student.name,
            email: student.email,
            success: true,
            messageId: result.messageId,
            message: result.message || "Cancellation email sent successfully",
          };
        } catch (error) {
          return {
            studentId: student._id,
            studentName: student.name,
            email: student.email,
            success: false,
            error: error.message,
          };
        }
      });
      const results = await Promise.allSettled(emailPromises);
      const emailResults = results.map((result) =>
        result.status === "fulfilled" ? result.value : result.reason
      );
      const successCount = emailResults.filter((r) => r.success).length;
      const failCount = emailResults.filter((r) => !r.success).length;
      return {
        totalStudents: students.length,
        successCount,
        failCount,
        results: emailResults,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new TestInfoService();
