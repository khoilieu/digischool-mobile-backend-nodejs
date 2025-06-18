const classService = require('../services/class.service');

class ClassController {
  // Tạo lớp học mới
  async createClass(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await classService.createClass(req.body, token);
      
      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách lớp học
  async getClasses(req, res, next) {
    try {
      const { page, limit, academicYear, search, active } = req.query;
      
      const result = await classService.getClasses({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        academicYear,
        search,
        active: active !== undefined ? active === 'true' : undefined
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy thông tin chi tiết lớp học
  async getClassById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await classService.getClassById(id);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cập nhật thông tin lớp học
  async updateClass(req, res, next) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await classService.updateClass(id, req.body, token);
      
      res.status(200).json({
        success: true,
        message: 'Class updated successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Xóa lớp học
  async deleteClass(req, res, next) {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const result = await classService.deleteClass(id, token);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Lấy danh sách giáo viên có thể làm chủ nhiệm
  async getAvailableHomeroomTeachers(req, res, next) {
    try {
      const { academicYear } = req.query;
      
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          message: 'Academic year is required'
        });
      }

      const result = await classService.getAvailableHomeroomTeachers(academicYear);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClassController(); 