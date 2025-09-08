# 🏫 Digital School Backend API

A comprehensive backend system for digital school management, built with Node.js and Express.js. This API provides complete functionality for managing students, teachers, classes, schedules, notifications, and real-time communication in an educational environment.

## 📋 What & Why

**What:** A robust REST API backend for a digital school management system that handles all core educational operations including user management, class scheduling, real-time messaging, leave requests, and academic tracking.

**Why:** Modern educational institutions need digital solutions to streamline administrative tasks, improve communication between stakeholders, and provide real-time access to academic information. This backend serves as the foundation for a complete digital school ecosystem.

## ✨ Key Features

- **🔐 Authentication & Authorization** - JWT-based auth with role-based access control (Student, Teacher, Admin, Parent)
- **👥 User Management** - Complete CRUD operations for students, teachers, parents, and administrators
- **📚 Class & Subject Management** - Organize classes, subjects, and academic years
- **📅 Smart Scheduling** - Automated timetable generation with constraint-based scheduling
- **💬 Real-time Chat** - Socket.IO powered messaging system with media support
- **📝 Leave Request System** - Separate workflows for student and teacher leave requests
- **🔔 Notification System** - Push notifications and in-app messaging
- **📊 Statistics & Analytics** - Academic progress tracking and reporting
- **📰 News Management** - School announcements and news updates
- **📝 Note Management** - Digital note-taking and sharing
- **📁 File Management** - Google Cloud Storage integration for media files
- **📧 Email Services** - Automated email notifications

## 🛠️ Technologies Used

- **Backend Framework:** Node.js + Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time Communication:** Socket.IO
- **File Storage:** Google Cloud Storage
- **Email Service:** Nodemailer
- **Push Notifications:** Firebase Admin SDK
- **Validation:** Joi + Express Validator
- **Security:** Helmet, CORS, bcryptjs
- **Logging:** Winston + Morgan
- **Testing:** Jest + Supertest
- **Development:** Nodemon

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Google Cloud Storage account
- Firebase project (for push notifications)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/khoilieu/digischool-backend-api-nodejs.git
   cd digischool-backend-api-nodejs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017/digischool
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   
   # Google Cloud Storage
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
   GOOGLE_CLOUD_KEY_FILE=path/to/service-account.json
   
   # Firebase
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Run tests**
   ```bash
   npm test
   ```

The API will be available at `http://localhost:8080`

## 📖 Usage Guide

**Đang cập nhật**

## 📸 Screenshots/Demo

**Đang cập nhật**

## 📊 Project Status

- ✅ **Core API Development** - Complete
- ✅ **Authentication System** - Complete
- ✅ **User Management** - Complete
- ✅ **Class & Schedule Management** - Complete
- ✅ **Real-time Chat** - Complete
- ✅ **Notification System** - Complete
- ✅ **File Upload & Storage** - Complete
- 🔄 **API Documentation** - In Progress
- 🔄 **Frontend Integration** - In Progress
- 📋 **Mobile App Development** - Planned

## 👨‍💻 Author & Contact

**Khôi Liêu**

- 📧 **Email:** [khoilieuct03@gmail.com](mailto:khoilieuct03@gmail.com)
- 💼 **LinkedIn:** [https://www.linkedin.com/in/lieu-khoi-6b4a09322/](https://www.linkedin.com/in/lieu-khoi-6b4a09322/)
- 🐙 **GitHub:** [@khoilieu](https://github.com/khoilieu)

---

⭐ **Star this repository if you find it helpful!**
