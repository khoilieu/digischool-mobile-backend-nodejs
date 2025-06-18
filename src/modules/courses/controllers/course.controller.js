const courseService = require('../services/course.service');

class CourseController {
  async getAllCourses(req, res, next) {
    try {
      const courses = await courseService.getAllCourses();
      res.status(200).json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourseById(req, res, next) {
    try {
      const course = await courseService.getCourseById(req.params.id);
      res.status(200).json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  async createCourse(req, res, next) {
    try {
      const course = await courseService.createCourse(req.body);
      res.status(201).json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCourse(req, res, next) {
    try {
      const course = await courseService.updateCourse(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCourse(req, res, next) {
    try {
      await courseService.deleteCourse(req.params.id);
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CourseController(); 