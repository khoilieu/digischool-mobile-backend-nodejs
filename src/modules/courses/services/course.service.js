const Course = require('../models/course.model');

class CourseService {
  async getAllCourses() {
    try {
      return await Course.find();
    } catch (error) {
      throw error;
    }
  }

  async getCourseById(id) {
    try {
      const course = await Course.findById(id);
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    } catch (error) {
      throw error;
    }
  }

  async createCourse(courseData) {
    try {
      const course = new Course(courseData);
      return await course.save();
    } catch (error) {
      throw error;
    }
  }

  async updateCourse(id, courseData) {
    try {
      const course = await Course.findByIdAndUpdate(
        id,
        courseData,
        { new: true, runValidators: true }
      );
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    } catch (error) {
      throw error;
    }
  }

  async deleteCourse(id) {
    try {
      const course = await Course.findByIdAndDelete(id);
      if (!course) {
        throw new Error('Course not found');
      }
      return course;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new CourseService(); 