const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
const auth = require('../../auth/middleware/auth.middleware');
const newsValidation = require('../middleware/news.validation');

router.use(auth.protect);

// Tạo tin tức mới
router.post('/create', newsValidation.create, newsController.createNews);
// Lấy tất cả tin tức
router.get('/all', newsController.getAllNews);
// Lấy tin tức theo thể loại (subject)
router.get('/by-subject', newsController.getNewsBySubject);
// Lấy tin tức do giáo viên đang đăng nhập tạo
router.get('/mine', newsController.getNewsByTeacher);
// Lấy tin tức yêu thích của user
router.get('/favorites', newsController.getFavoritesByUser);
// Lấy chi tiết tin tức và tăng views
router.get('/:id', newsController.getNewsById);
// Cập nhật tin tức (chỉ giáo viên tạo được cập nhật)
router.patch('/update/:id', newsValidation.update, newsController.updateNews);
// Xóa tin tức (chỉ giáo viên tạo được xóa)
router.delete('/delete/:id', newsController.deleteNews);
// Thêm tin vào mục yêu thích
router.post('/:id/favorite', newsController.addFavorite);
// Bỏ tin khỏi mục yêu thích
router.delete('/:id/favorite', newsController.removeFavorite);

module.exports = router; 