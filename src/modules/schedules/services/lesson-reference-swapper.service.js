const mongoose = require("mongoose");

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
            description: collectionConfig.description,
          });
          results.totalSwapped += swapResult.swapped;
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
      `✅ Lesson reference swap completed: ${results.totalSwapped} records swapped`
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

      // Hoán đổi original records sang replacement lesson
      for (const record of originalRecords) {
        await Model.updateOne(
          { _id: record._id },
          {
            [lessonField]: replacementLessonId,
            lastModifiedBy: processedBy,
            updatedAt: new Date(),
          }
        );
        swapped++;
      }

      // Hoán đổi replacement records sang original lesson
      for (const record of replacementRecords) {
        await Model.updateOne(
          { _id: record._id },
          {
            [lessonField]: originalLessonId,
            lastModifiedBy: processedBy,
            updatedAt: new Date(),
          }
        );
        swapped++;
      }

      console.log(
        `✅ Swapped ${swapped} records in ${collectionConfig.modelName}`
      );

      return {
        success: true,
        swapped: swapped,
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
