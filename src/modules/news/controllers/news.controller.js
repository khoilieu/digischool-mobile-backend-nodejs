const newsService = require('../services/news.service');

class NewsController {
  async createNews(req, res, next) {
    try {
      const { title, content, coverImage } = req.body;
      const createdBy = req.user._id;
      // Lấy subjectId từ user
      let subject = req.user.subject || (Array.isArray(req.user.subjects) && req.user.subjects.length > 0 ? req.user.subjects[0] : null);
      if (!title || !content || !subject) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const news = await newsService.createNews({ title, content, coverImage, createdBy, subject });
      res.status(201).json(news);
    } catch (err) {
      next(err);
    }
  }

  async getAllNews(req, res, next) {
    try {
      const news = await newsService.getAllNews();
      res.json(news);
    } catch (err) {
      next(err);
    }
  }

  async getNewsBySubject(req, res, next) {
    try {
      const { subject } = req.query;
      if (!subject) return res.status(400).json({ message: 'Missing subjectId' });
      const news = await newsService.getNewsBySubject(subject);
      res.json(news);
    } catch (err) {
      next(err);
    }
  }

  async getNewsByTeacher(req, res, next) {
    try {
      const teacherId = req.user._id;
      const news = await newsService.getNewsByTeacher(teacherId);
      res.json(news);
    } catch (err) {
      next(err);
    }
  }

  async updateNews(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const updateData = req.body;
      const updated = await newsService.updateNews(id, userId, updateData);
      if (!updated) return res.status(404).json({ message: 'News not found or not allowed' });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteNews(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const deleted = await newsService.deleteNews(id, userId);
      if (!deleted) return res.status(404).json({ message: 'News not found or not allowed' });
      res.json({ message: 'Deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async addFavorite(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const updated = await newsService.addFavorite(id, userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async removeFavorite(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const updated = await newsService.removeFavorite(id, userId);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async getFavoritesByUser(req, res, next) {
    try {
      const userId = req.user._id;
      const news = await newsService.getFavoritesByUser(userId);
      res.json(news);
    } catch (err) {
      next(err);
    }
  }

  async getNewsById(req, res, next) {
    try {
      const { id } = req.params;
      const news = await newsService.getNewsById(id);
      if (!news) return res.status(404).json({ message: 'News not found' });
      await newsService.incrementViews(id);
      res.json(news);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NewsController(); 