require("dotenv").config();
const { Storage } = require("@google-cloud/storage");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const newsService = require("../services/news.service");

// Kiểm tra các biến môi trường GCP
const gcpConfig = {
  projectId: process.env.GCP_PROJECT_ID,
  clientEmail: process.env.GCP_CLIENT_EMAIL,
  privateKey: process.env.GCP_PRIVATE_KEY,
  bucketName: process.env.GCP_BUCKET_NAME
};

// Chỉ khởi tạo storage nếu có đủ config
let storage, bucket;

if (gcpConfig.projectId && gcpConfig.clientEmail && gcpConfig.privateKey && gcpConfig.bucketName) {
  storage = new Storage({
    projectId: gcpConfig.projectId,
    credentials: {
      client_email: gcpConfig.clientEmail,
      private_key: gcpConfig.privateKey.replace(/\\n/g, "\n"),
    },
  });
  
  bucket = storage.bucket(gcpConfig.bucketName);
} else {
  console.warn('⚠️  GCP configuration is incomplete. File upload features will be disabled.');
  console.warn('Required environment variables: GCP_PROJECT_ID, GCP_CLIENT_EMAIL, GCP_PRIVATE_KEY, GCP_BUCKET_NAME');
}



// Helper function để xóa ảnh trên GCS
async function deleteImageFromGCS(imageUrl) {
  try {
    if (!bucket) {
      console.warn('GCS bucket not configured, skipping image deletion');
      return;
    }
    
    if (!imageUrl || imageUrl.includes("news-default.png")) {
      return; // Không xóa ảnh mặc định
    }

    // Lấy filename từ URL
    const urlParts = imageUrl.split("/");
    const filename = urlParts.slice(-2).join("/"); // Lấy 'news/filename'

    const file = bucket.file(filename);
    await file.delete();
  } catch (error) {
    console.error("Error deleting image from GCS:", error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

class NewsController {
  async createNews(req, res, next) {
    try {
      const { title, content } = req.body;
      const createdBy = req.user._id;
      let subject =
        req.user.subject ||
        (Array.isArray(req.user.subjects) && req.user.subjects.length > 0
          ? req.user.subjects[0]
          : null);

      if (!title || !content || !subject) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let coverImageUrl = null;
      if (req.file) {
        if (!bucket) {
          return res.status(500).json({ 
            message: "File upload service is not configured. Please contact administrator." 
          });
        }
        
        const filename = `news/${uuidv4()}_${req.file.originalname}`;
        const file = bucket.file(filename);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          public: true,
        });

        coverImageUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      } else {
        coverImageUrl =
          "https://storage.googleapis.com/digital-school-news/news-default.png";
      }

      const news = await newsService.createNews({
        title,
        content,
        coverImage: coverImageUrl,
        createdBy,
        subject,
      });
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
      if (!subject)
        return res.status(400).json({ message: "Missing subjectId" });
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

      // Lấy news hiện tại để có thông tin ảnh cũ
      const currentNews = await newsService.getNewsById(id);
      if (!currentNews) {
        return res.status(404).json({ message: "News not found" });
      }

      // Xử lý ảnh mới nếu có
      if (req.file) {
        if (!bucket) {
          return res.status(500).json({ 
            message: "File upload service is not configured. Please contact administrator." 
          });
        }
        
        const filename = `news/${uuidv4()}_${req.file.originalname}`;
        const file = bucket.file(filename);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          public: true,
        });
        updateData.coverImage = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        // Xóa ảnh cũ nếu có và không phải ảnh mặc định
        if (
          currentNews.coverImage &&
          !currentNews.coverImage.includes("news-default.png")
        ) {
          await deleteImageFromGCS(currentNews.coverImage);
        }
      }

      const updated = await newsService.updateNews(id, userId, updateData);
      if (!updated)
        return res
          .status(404)
          .json({ message: "News not found or not allowed" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteNews(req, res, next) {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      // Lấy thông tin news trước khi xóa để có URL ảnh
      const newsToDelete = await newsService.getNewsById(id);
      if (!newsToDelete) {
        return res.status(404).json({ message: "News not found" });
      }

      // Xóa ảnh trên GCS trước khi xóa news
      if (
        newsToDelete.coverImage &&
        !newsToDelete.coverImage.includes("news-default.png")
      ) {
        await deleteImageFromGCS(newsToDelete.coverImage);
      }

      const deleted = await newsService.deleteNews(id, userId);
      if (!deleted)
        return res
          .status(404)
          .json({ message: "News not found or not allowed" });
      res.json({ message: "Deleted successfully" });
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
      if (!news) return res.status(404).json({ message: "News not found" });
      await newsService.incrementViews(id);
      res.json(news);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NewsController();
