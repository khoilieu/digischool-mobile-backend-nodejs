const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Kiểm tra cấu hình email (sử dụng cùng config với user service)
    this.emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    
    if (this.emailConfigured) {
      // Sử dụng cấu hình giống user service
      if (process.env.EMAIL_HOST) {
        // Cấu hình SMTP tùy chỉnh
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      } else {
        // Cấu hình Gmail service (mặc định)
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
      }
    } else {
      console.log('⚠️  Email not configured. Reset tokens will be logged to console.');
      console.log('⚠️  Please configure EMAIL_USER and EMAIL_PASS in .env file');
      this.transporter = null;
    }
  }

  // Gửi email reset password
  async sendResetPasswordEmail(email, resetToken) {
    try {
      // Nếu email không được cấu hình, chỉ log token
      if (!this.emailConfigured || !this.transporter) {
        console.log('📧 [NO EMAIL CONFIG] One-time password sent to console:');
        console.log(`📧 Email: ${email}`);
        console.log(`📧 One-Time Password: ${resetToken}`);
        console.log('📧 Password expires in 15 minutes');
        console.log('⚠️  Configure EMAIL_USER and EMAIL_PASS in .env to send real emails');
        
        return {
          success: true,
          messageId: 'console-log',
          message: 'One-time password logged to console (email not configured)'
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Your One-Time Password for Password Reset - DigiSchool',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2c3e50;">DigiSchool - Password Reset</h1>
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu reset mật khẩu cho tài khoản DigiSchool của mình. Vui lòng sử dụng mật khẩu tạm thời sau để đăng nhập:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h2 style="color: #e74c3c; font-size: 24px; letter-spacing: 2px; font-family: monospace; word-break: break-all;">${resetToken}</h2>
            </div>
            <p><strong>Hướng dẫn sử dụng:</strong></p>
            <ol style="color: #666;">
              <li>Truy cập trang đăng nhập hệ thống</li>
              <li>Sử dụng email và mật khẩu tạm thời ở trên</li>
              <li>Hệ thống sẽ tự động chuyển đến trang thiết lập mật khẩu mới</li>
              <li>Nhập mật khẩu mới theo yêu cầu</li>
              <li>Hoàn tất và tiếp tục sử dụng hệ thống</li>
            </ol>
            <p><strong>Lưu ý quan trọng:</strong></p>
            <ul style="color: #666;">
              <li>Mật khẩu này có hiệu lực trong <strong>15 phút</strong></li>
              <li>Chỉ sử dụng một lần để đăng nhập và đặt mật khẩu mới</li>
              <li>Không chia sẻ mật khẩu này với bất kỳ ai</li>
              <li>Nếu bạn không yêu cầu reset password, vui lòng bỏ qua email này</li>
            </ul>
            <hr style="margin: 30px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">Email này được gửi tự động từ hệ thống DigiSchool. Vui lòng không phản hồi email này.</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Reset password email sent:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
      
    } catch (error) {
      console.error('❌ Error sending reset password email:', error);
      
      // Fallback: log token to console if email fails
      console.log('📧 [EMAIL FAILED - FALLBACK] One-time password:');
      console.log(`📧 Email: ${email}`);
      console.log(`📧 One-Time Password: ${resetToken}`);
      console.log('📧 Password expires in 15 minutes');
      
      // Không throw error để không làm gián đoạn flow
      return {
        success: true,
        messageId: 'console-fallback',
        message: 'Email failed, one-time password logged to console'
      };
    }
  }

  // Gửi email chung (method mới)
  async sendEmail(to, subject, html) {
    try {
      // Nếu email không được cấu hình, chỉ log
      if (!this.emailConfigured || !this.transporter) {
        console.log('📧 [NO EMAIL CONFIG] Email would be sent:');
        console.log(`📧 To: ${to}`);
        console.log(`📧 Subject: ${subject}`);
        console.log('⚠️  Configure EMAIL_USER and EMAIL_PASS in .env to send real emails');
        
        return {
          success: true,
          messageId: 'console-log',
          message: 'Email logged to console (email not configured)'
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', info.messageId);
      
      return {
        success: true,
        messageId: info.messageId
      };
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      
      // Fallback: log email details to console if email fails
      console.log('📧 [EMAIL FAILED - FALLBACK] Email details:');
      console.log(`📧 To: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      
      // Không throw error để không làm gián đoạn flow
      return {
        success: true,
        messageId: 'console-fallback',
        message: 'Email failed, details logged to console'
      };
    }
  }

  // Test email connection
  async testConnection() {
    try {
      if (!this.emailConfigured || !this.transporter) {
        console.log('⚠️  Email not configured - skipping connection test');
        return false;
      }
      
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 