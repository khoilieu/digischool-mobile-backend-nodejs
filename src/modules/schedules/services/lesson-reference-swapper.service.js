const mongoose = require("mongoose");
const Lesson = require("../models/lesson.model");

class LessonReferenceSwapperService {
  constructor() {
    // Định nghĩa các collection có reference đến lesson
    // Có thể dễ dàng thêm collection mới mà không cần sửa code
    this.lessonReferenceCollections = [
      {
        modelName: "TestInfo",
        modelPath: "../models/test-info.model",
        lessonField: "lesson",
        description: "Test information",
      },
      // Đã loại bỏ TeacherLessonEvaluation và StudentLessonEvaluation
      // vì không cần swap evaluation khi swap lesson
      {
        modelName: "LessonRequest",
        modelPath: "../models/lesson-request.model",
        lessonField: "originalLesson",
        description: "Lesson requests (original lesson)",
      },
      {
        modelName: "LessonRequest",
        modelPath: "../models/lesson-request.model",
        lessonField: "replacementLesson",
        description: "Lesson requests (replacement lesson)",
      },
      {
        modelName: "Note",
        modelPath: "../../note/models/note.model",
        lessonField: "lesson",
        description: "User notes",
        hasReminder: true, // Đánh dấu collection này có reminder cần cập nhật
      },
      // Dễ dàng thêm collection mới ở đây khi cần
      // {
      //   modelName: "NewCollection",
      //   modelPath: "../models/new-collection.model",
      //   lessonField: "lessonId",
      //   description: "New collection description"
      // }
    ];
  }

  /**
   * Tính toán lại remindAt cho note dựa trên lesson mới
   * @param {Object} note - Note object
   * @param {Object} lesson - Lesson object với timeSlot đã populate
   * @returns {Date|null} remindAt mới hoặc null nếu không có reminder
   */
  calculateNewRemindAt(note, lesson) {
    // Chỉ tính toán nếu note có reminder và lesson có timeSlot
    if (!note.remindAt || !note.time || !lesson.timeSlot || !lesson.timeSlot.startTime) {
      return null;
    }

    try {
      const [hour, minute] = lesson.timeSlot.startTime.split(":").map(Number);
      const scheduledDate = new Date(lesson.scheduledDate);
      scheduledDate.setHours(hour, minute, 0, 0);
      
      const newRemindAt = new Date(scheduledDate.getTime() - note.time * 60000);
      
      // Kiểm tra tính hợp lệ
      if (isNaN(newRemindAt.getTime())) {
        console.warn(`⚠️ Invalid remindAt calculated for note ${note._id}`);
        return null;
      }
      
      return newRemindAt;
    } catch (error) {
      console.error(`❌ Error calculating new remindAt for note ${note._id}:`, error.message);
      return null;
    }
  }

  /**
   * Test method để kiểm tra logic tính toán remindAt
   * @param {Object} note - Note object với remindAt và time
   * @param {Object} lesson - Lesson object với timeSlot
   * @returns {Object} Kết quả test
   */
  testRemindAtCalculation(note, lesson) {
    console.log("🧪 Testing remindAt calculation:");
    console.log(`Note: remindAt=${note.remindAt}, time=${note.time} minutes`);
    console.log(`Lesson: scheduledDate=${lesson.scheduledDate}, timeSlot=${lesson.timeSlot?.startTime}`);
    
    const newRemindAt = this.calculateNewRemindAt(note, lesson);
    
    console.log(`Result: ${newRemindAt ? newRemindAt.toISOString() : 'null'}`);
    
    return {
      originalRemindAt: note.remindAt,
      newRemindAt: newRemindAt,
      timeDifference: newRemindAt ? (newRemindAt.getTime() - note.remindAt.getTime()) / 60000 : null
    };
  }

  /**
   * Hoán đổi lesson references trong tất cả collections
   * @param {string} originalLessonId - ID của lesson gốc
   * @param {string} replacementLessonId - ID của lesson thay thế
   * @param {string} processedBy - ID của user xử lý
   * @returns {Object} Kết quả hoán đổi
   */
  async swapLessonReferences(
    originalLessonId,
    replacementLessonId,
    processedBy
  ) {
    const results = {
      success: true,
      swappedCollections: [],
      errors: [],
      totalSwapped: 0,
      reminderUpdates: 0,
    };

    console.log(
      `🔄 Starting lesson reference swap: ${originalLessonId} ↔ ${replacementLessonId}`
    );

    for (const collectionConfig of this.lessonReferenceCollections) {
      try {
        const swapResult = await this.swapCollectionReferences(
          collectionConfig,
          originalLessonId,
          replacementLessonId,
          processedBy
        );

        if (swapResult.success) {
          results.swappedCollections.push({
            collection: collectionConfig.modelName,
            field: collectionConfig.lessonField,
            swapped: swapResult.swapped,
            reminderUpdates: swapResult.reminderUpdates || 0,
            description: collectionConfig.description,
          });
          results.totalSwapped += swapResult.swapped;
          results.reminderUpdates += swapResult.reminderUpdates || 0;
        } else {
          results.errors.push({
            collection: collectionConfig.modelName,
            error: swapResult.error,
          });
        }
      } catch (error) {
        console.error(
          `❌ Error swapping ${collectionConfig.modelName}:`,
          error.message
        );
        results.errors.push({
          collection: collectionConfig.modelName,
          error: error.message,
        });
      }
    }

    // Nếu có lỗi, đánh dấu không thành công
    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(
      `✅ Lesson reference swap completed: ${results.totalSwapped} records swapped, ${results.reminderUpdates} reminders updated`
    );
    return results;
  }

  /**
   * Hoán đổi references trong một collection cụ thể
   * @param {Object} collectionConfig - Cấu hình collection
   * @param {string} originalLessonId - ID lesson gốc
   * @param {string} replacementLessonId - ID lesson thay thế
   * @param {string} processedBy - ID user xử lý
   * @returns {Object} Kết quả hoán đổi
   */
  async swapCollectionReferences(
    collectionConfig,
    originalLessonId,
    replacementLessonId,
    processedBy
  ) {
    try {
      const Model = require(collectionConfig.modelPath);
      const lessonField = collectionConfig.lessonField;

      // Tìm records liên quan đến original lesson
      const originalRecords = await Model.find({
        [lessonField]: originalLessonId,
      });

      // Tìm records liên quan đến replacement lesson
      const replacementRecords = await Model.find({
        [lessonField]: replacementLessonId,
      });

      let swapped = 0;
      let reminderUpdates = 0;

      // Cache lesson data để tránh query nhiều lần
      let originalLesson = null;
      let replacementLesson = null;
      
      if (collectionConfig.hasReminder && (originalRecords.length > 0 || replacementRecords.length > 0)) {
        // Chỉ query lesson nếu có note cần cập nhật reminder
        [originalLesson, replacementLesson] = await Promise.all([
          Lesson.findById(originalLessonId).populate("timeSlot"),
          Lesson.findById(replacementLessonId).populate("timeSlot")
        ]);
      }

      // Hoán đổi original records sang replacement lesson
      for (const record of originalRecords) {
        const updateData = {
          [lessonField]: replacementLessonId,
          lastModifiedBy: processedBy,
          updatedAt: new Date(),
        };

        // Nếu là Note và có reminder, tính toán lại remindAt
        if (collectionConfig.hasReminder && record.remindAt && record.time && replacementLesson) {
          const newRemindAt = this.calculateNewRemindAt(record, replacementLesson);
          if (newRemindAt) {
            updateData.remindAt = newRemindAt;
            reminderUpdates++;
            console.log(`📝 Updated reminder for note ${record._id}: ${record.remindAt.toISOString()} → ${newRemindAt.toISOString()}`);
          }
        }

        await Model.updateOne({ _id: record._id }, updateData);
        swapped++;
      }

      // Hoán đổi replacement records sang original lesson
      for (const record of replacementRecords) {
        const updateData = {
          [lessonField]: originalLessonId,
          lastModifiedBy: processedBy,
          updatedAt: new Date(),
        };

        // Nếu là Note và có reminder, tính toán lại remindAt
        if (collectionConfig.hasReminder && record.remindAt && record.time && originalLesson) {
          const newRemindAt = this.calculateNewRemindAt(record, originalLesson);
          if (newRemindAt) {
            updateData.remindAt = newRemindAt;
            reminderUpdates++;
            console.log(`📝 Updated reminder for note ${record._id}: ${record.remindAt.toISOString()} → ${newRemindAt.toISOString()}`);
          }
        }

        await Model.updateOne({ _id: record._id }, updateData);
        swapped++;
      }

      console.log(
        `✅ Swapped ${swapped} records in ${collectionConfig.modelName}${reminderUpdates > 0 ? `, updated ${reminderUpdates} reminders` : ''}`
      );

      return {
        success: true,
        swapped: swapped,
        reminderUpdates: reminderUpdates,
        collection: collectionConfig.modelName,
      };
    } catch (error) {
      console.error(
        `❌ Error in ${collectionConfig.modelName}:`,
        error.message
      );
      return {
        success: false,
        error: error.message,
        collection: collectionConfig.modelName,
      };
    }
  }
}

module.exports = new LessonReferenceSwapperService();
