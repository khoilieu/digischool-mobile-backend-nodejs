# Tổng quan Validation cho 3 chức năng: Swap, Makeup, Substitute

## 📋 **1. SWAP VALIDATION (Đổi tiết)**

### **Tạo yêu cầu đổi tiết (`createSwapRequest`)**

#### **Basic Validation:**

- ✅ `originalLessonId`: Required, valid ObjectId
- ✅ `replacementLessonId`: Required, valid ObjectId
- ✅ `reason`: Required, 10-500 characters

#### **Business Logic Validation:**

**1. Kiểm tra Original Lesson:**

- ✅ Tồn tại trong database
- ✅ Thuộc về giáo viên đang request
- ✅ Status = "scheduled"

**2. Kiểm tra Replacement Lesson:**

- ✅ Tồn tại trong database
- ✅ Type ≠ "empty" (không được là tiết trống)
- ✅ Có giáo viên dạy
- ✅ Status = "scheduled"

**3. Kiểm tra tương thích:**

- ✅ Cùng lớp học
- ✅ Cùng tuần học

**4. Kiểm tra xung đột:**

- ✅ Không có request pending cho original lesson
- ✅ Không xung đột thời gian cho giáo viên original (khi đổi sang thời gian replacement)
- ✅ Không xung đột thời gian cho giáo viên replacement (khi đổi sang thời gian original)
- ✅ Không xung đột với các yêu cầu khác đang pending

#### **Approve Swap (`validateSwapApproval`):**

- ✅ Request tồn tại
- ✅ Request type = "swap"
- ✅ Status = "pending"
- ✅ Chỉ replacement teacher mới được approve

#### **Cancel Swap (`validateCancelRequest`):**

- ✅ Request tồn tại
- ✅ Status = "pending"
- ✅ Chỉ requesting teacher mới được cancel

---

## 📋 **2. MAKEUP VALIDATION (Dạy bù)**

### **Tạo yêu cầu dạy bù (`createMakeupRequest`)**

#### **Basic Validation:**

- ✅ `originalLessonId`: Required, valid ObjectId
- ✅ `replacementLessonId`: Required, valid ObjectId
- ✅ `reason`: Required, 10-500 characters

#### **Business Logic Validation:**

**1. Kiểm tra Original Lesson:**

- ✅ Tồn tại trong database
- ✅ Thuộc về giáo viên đang request
- ✅ Status = "scheduled"

**2. Kiểm tra Replacement Lesson:**

- ✅ Tồn tại trong database
- ✅ Type = "empty" (phải là tiết trống)
- ✅ Status = "scheduled"

**3. Kiểm tra tương thích:**

- ✅ Cùng lớp học
- ✅ Cùng tuần học

**4. Kiểm tra xung đột:**

- ✅ Không có request pending cho original lesson
- ✅ Không xung đột với các yêu cầu khác đang pending

#### **Approve/Reject Makeup:**

- ✅ Sử dụng `processRequest()` - validation chung
- ✅ Manager/Admin có quyền approve/reject

#### **Cancel Makeup (`validateCancelRequest`):**

- ✅ Request tồn tại
- ✅ Status = "pending"
- ✅ Chỉ requesting teacher mới được cancel

---

## 📋 **3. SUBSTITUTE VALIDATION (Dạy thay)**

### **Tạo yêu cầu dạy thay (`validateCreateSubstituteRequest`)**

#### **Basic Validation:**

- ✅ `lessonId`: Required, valid ObjectId
- ✅ `candidateTeacherIds`: Array, ít nhất 1 teacher, valid ObjectIds, không duplicate
- ✅ `reason`: Required, 1-300 characters

#### **Business Logic Validation:**

- ✅ **Kiểm tra lesson tồn tại**
- ✅ **Kiểm tra lesson thuộc về giáo viên đang request**
- ✅ **Kiểm tra lesson status = "scheduled"**
- ✅ **Kiểm tra candidate teachers tồn tại và là giáo viên**
- ✅ **Không được chọn chính mình làm candidate**
- ✅ **Kiểm tra candidate teachers không có pending substitute requests**
- ✅ **Kiểm tra candidate teachers không có xung đột thời gian**

#### **Approve Substitute (`validateSubstituteApproval`):**

- ✅ Request tồn tại
- ✅ Request type = "substitute"
- ✅ Status = "pending"
- ✅ Chỉ candidate teacher mới được approve

#### **Reject Substitute (`validateRejectSubstituteRequest`):**

- ✅ Request tồn tại
- ✅ Request type = "substitute"
- ✅ Status = "pending"
- ✅ Chỉ candidate teacher mới được reject

#### **Cancel Substitute (`validateCancelRequest`):**

- ✅ Request tồn tại
- ✅ Status = "pending"
- ✅ Chỉ requesting teacher mới được cancel

---

## 📊 **SO SÁNH VALIDATION (SAU KHI CHUYỂN)**

| Validation Type       | Swap | Makeup | Substitute |
| --------------------- | ---- | ------ | ---------- |
| **Basic Fields**      | ✅   | ✅     | ✅         |
| **Lesson Existence**  | ✅   | ✅     | ✅         |
| **Teacher Ownership** | ✅   | ✅     | ✅         |
| **Lesson Status**     | ✅   | ✅     | ✅         |
| **Type Validation**   | ✅   | ✅     | ✅         |
| **Same Class**        | ✅   | ✅     | ❌         |
| **Same Week**         | ✅   | ✅     | ❌         |
| **Time Conflicts**    | ✅   | ✅     | ✅         |
| **Pending Conflicts** | ✅   | ✅     | ✅         |
| **Approval Rights**   | ✅   | ✅     | ✅         |
| **Cancel Rights**     | ✅   | ✅     | ✅         |

---

## ✅ **CẢI THIỆN ĐÃ THỰC HIỆN**

### **1. Chuyển validation từ Service sang Middleware:**

- ✅ **Swap Service**: Đã xóa validation, chỉ giữ business logic
- ✅ **Makeup Service**: Đã xóa validation, chỉ giữ business logic
- ✅ **Substitute Service**: Đã xóa validation, chỉ giữ business logic

### **2. Bổ sung Substitute Validation:**

- ✅ **Lesson existence check**
- ✅ **Teacher ownership check**
- ✅ **Lesson status check**
- ✅ **Candidate teachers validation**
- ✅ **Self-selection prevention**

### **3. Thêm validation mới:**

- ✅ **`validateSubstituteApproval()`** - Approve substitute
- ✅ **`validateCancelRequest()`** - Cancel any request type

### **4. Clean Code Principles:**

- ✅ **Separation of Concerns**: Validation trong middleware, business logic trong service
- ✅ **Single Responsibility**: Mỗi file có chức năng rõ ràng
- ✅ **Consistency**: Tất cả validation đều trong middleware

### **5. Cải thiện API Available Teachers:**

- ✅ **Lọc giáo viên theo xung đột thời gian**
- ✅ **Lọc giáo viên theo pending requests**
- ✅ **Trả về thông tin chi tiết về lý do giáo viên không có sẵn**
- ✅ **Hiển thị số lượng giáo viên được kiểm tra và có sẵn**

---

## 🎯 **TỔNG KẾT CÁC CẢI THIỆN**

### **1. Validation Rules:**

- ✅ Giảm độ dài reason field từ 10-500 xuống 1-300 cho tất cả chức năng
- ✅ Bỏ yêu cầu "same week" cho swap và makeup
- ✅ Thêm kiểm tra xung đột thời gian cho makeup
- ✅ Thêm kiểm tra pending requests cho substitute

### **2. API Improvements:**

- ✅ API lấy danh sách giáo viên dạy thay có sẵn đã được cải thiện với filtering
- ✅ Trả về thông tin chi tiết về những giáo viên không có sẵn
- ✅ Hiển thị lý do cụ thể tại sao giáo viên không thể dạy thay

### **3. Code Quality:**

- ✅ Tất cả validation logic đã được chuyển từ service sang middleware
- ✅ Clean separation giữa validation và business logic
- ✅ Consistent validation patterns across all functionalities

### **2. Bổ sung Makeup Validation:**

```javascript
// Cần thêm kiểm tra xung đột thời gian
const teacherConflicts = await Lesson.find({
  teacher: originalLesson.teacher._id,
  scheduledDate: replacementLesson.scheduledDate,
  _id: { $ne: originalLesson._id },
  status: "scheduled",
});
```

### **3. Chuẩn hóa validation:**

- Tạo validation template chung
- Áp dụng consistent validation cho tất cả request types
- Thêm unit tests cho validation

---

## 🎯 **KẾT QUẢ**

### **Trước khi chuyển:**

- ❌ Validation rải rác trong service
- ❌ Code không clean, khó maintain
- ❌ Substitute validation thiếu nhiều

### **Sau khi chuyển:**

- ✅ **Validation tập trung trong middleware**
- ✅ **Service chỉ focus vào business logic**
- ✅ **Substitute validation đầy đủ**
- ✅ **Code clean, dễ maintain**
- ✅ **Consistent validation pattern**
