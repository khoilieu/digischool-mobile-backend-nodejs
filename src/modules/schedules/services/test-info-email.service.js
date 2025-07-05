const emailService = require("../../auth/services/email.service");

class TestInfoEmailService {
  // Tạo template HTML cho email thông tin kiểm tra
  createTestInfoEmailTemplate(testInfoData, studentName) {
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

    // Mapping test type
    const testTypeNames = {
      kiemtra15: "Kiểm tra 15 phút",
      kiemtra1tiet: "Kiểm tra 1 tiết",
      kiemtrathuchanh: "Kiểm tra thực hành",
      kiemtramieng: "Kiểm tra miệng",
      baitap: "Bài tập",
      other: "Kiểm tra khác",
    };

    // Mapping priority
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
                        (topic) =>
                          `<li style="margin-bottom: 5px;">${topic}</li>`
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

  // Gửi email thông tin kiểm tra cho tất cả học sinh trong lớp
  async sendTestInfoToStudents(testInfoData, students) {
    try {
      console.log(
        `📧 Sending test info emails to ${students.length} students...`
      );
      const emailPromises = students.map(async (student) => {
        try {
          const subject = `🔔 Thông báo kiểm tra: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
          const htmlContent = this.createTestInfoEmailTemplate(
            testInfoData,
            student.name
          );
          const result = await emailService.sendEmail(
            student.email,
            subject,
            htmlContent
          );
          console.log(
            `✅ Email sent to ${student.name} (${student.email}): ${result.messageId}`
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
          console.error(
            `❌ Failed to send email to ${student.name} (${student.email}):`,
            error.message
          );
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
      const emailResults = results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || "Unknown error",
          };
        }
      });
      const successCount = emailResults.filter((r) => r.success).length;
      const failCount = emailResults.filter((r) => !r.success).length;
      console.log(
        `📊 Email sending completed: ${successCount} success, ${failCount} failed`
      );
      return {
        totalStudents: students.length,
        successCount,
        failCount,
        results: emailResults,
      };
    } catch (error) {
      console.error("❌ Error in sendTestInfoToStudents:", error);
      throw error;
    }
  }

  // Gửi email thông tin kiểm tra cho một học sinh cụ thể
  async sendTestInfoToStudent(testInfoData, student) {
    try {
      const subject = `🔔 Thông báo kiểm tra: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
      const htmlContent = this.createTestInfoEmailTemplate(
        testInfoData,
        student.name
      );
      const result = await emailService.sendEmail(
        student.email,
        subject,
        htmlContent
      );
      console.log(
        `✅ Test info email sent to ${student.name} (${student.email}): ${result.messageId}`
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
      console.error(
        `❌ Failed to send test info email to ${student.name}:`,
        error
      );
      throw error;
    }
  }

  // Test email template
  async sendTestInfoTestEmail(testEmail, testInfoData) {
    try {
      const subject = `🧪 [TEST] Thông báo kiểm tra: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
      const htmlContent = this.createTestInfoEmailTemplate(
        testInfoData,
        "Test Student"
      );
      const result = await emailService.sendEmail(
        testEmail,
        subject,
        htmlContent
      );
      console.log(
        `✅ Test info email sent to ${testEmail}: ${result.messageId}`
      );
      return {
        success: true,
        messageId: result.messageId,
        message: result.message || "Test email sent successfully",
      };
    } catch (error) {
      console.error(`❌ Failed to send test info test email:`, error);
      throw error;
    }
  }

  // Tạo template HTML cho email thông báo hủy thông tin kiểm tra
  createCancelTestInfoEmailTemplate(testInfoData, studentName) {
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

    // Mapping test type
    const testTypeNames = {
      kiemtra15: "Kiểm tra 15 phút",
      kiemtra1tiet: "Kiểm tra 1 tiết",
      kiemtrathuchanh: "Kiểm tra thực hành",
      kiemtramieng: "Kiểm tra miệng",
      baitap: "Bài tập",
      other: "Kiểm tra khác",
    };

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

  // Gửi email thông báo hủy cho tất cả học sinh trong lớp
  async sendCancelTestInfoToStudents(testInfoData, students) {
    try {
      console.log(
        `📧 Sending cancellation emails to ${students.length} students...`
      );
      const emailPromises = students.map(async (student) => {
        try {
          const subject = `❌ THÔNG BÁO HỦY: ${testInfoData.subject.name} - Lớp ${testInfoData.class.className}`;
          const htmlContent = this.createCancelTestInfoEmailTemplate(
            testInfoData,
            student.name
          );
          const result = await emailService.sendEmail(
            student.email,
            subject,
            htmlContent
          );
          console.log(
            `✅ Cancellation email sent to ${student.name} (${student.email}): ${result.messageId}`
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
          console.error(
            `❌ Failed to send cancellation email to ${student.name} (${student.email}):`,
            error.message
          );
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
      const successCount = emailResults.filter(
        (result) => result.success
      ).length;
      const failureCount = emailResults.filter(
        (result) => !result.success
      ).length;
      console.log(
        `📊 Cancellation email summary: ${successCount} successful, ${failureCount} failed out of ${students.length} total`
      );
      return {
        totalStudents: students.length,
        successCount,
        failureCount,
        results: emailResults,
      };
    } catch (error) {
      console.error("❌ Error in sendCancelTestInfoToStudents:", error.message);
      throw error;
    }
  }
}

module.exports = new TestInfoEmailService();
