const fs = require("fs");
const path = require("path");
const News = require("../models/news.model");

class NewsService {
  async createNews({ title, content, coverImage, createdBy, subject }) {
    return await News.create({
      title,
      content,
      coverImage,
      createdBy,
      subject,
    });
  }

  async getAllNews(query = {}) {
    return await News.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");
  }

  async getNewsById(id) {
    return await News.findById(id).populate("createdBy", "name");
  }

  async getNewsBySubject(subjectId) {
    return await News.find({ subject: subjectId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");
  }

  async getNewsByTeacher(teacherId) {
    return await News.find({ createdBy: teacherId }).sort({ createdAt: -1 });
  }

  async updateNews(newsId, userId, updateData) {
    // Chỉ cho phép giáo viên tạo mới được cập nhật
    return await News.findOneAndUpdate(
      { _id: newsId, createdBy: userId },
      updateData,
      { new: true }
    );
  }

  async deleteNews(newsId, userId) {
    // Chỉ cho phép giáo viên tạo mới được xóa
    return await News.findOneAndDelete({ _id: newsId, createdBy: userId });
  }

  async addFavorite(newsId, userId) {
    return await News.findByIdAndUpdate(
      newsId,
      { $addToSet: { favorites: userId } },
      { new: true }
    );
  }

  async removeFavorite(newsId, userId) {
    return await News.findByIdAndUpdate(
      newsId,
      { $pull: { favorites: userId } },
      { new: true }
    );
  }

  async getFavoritesByUser(userId) {
    return await News.find({ favorites: userId }).sort({ createdAt: -1 });
  }

  async incrementViews(newsId) {
    return await News.findByIdAndUpdate(
      newsId,
      { $inc: { views: 1 } },
      { new: true }
    );
  }
}

module.exports = new NewsService();
