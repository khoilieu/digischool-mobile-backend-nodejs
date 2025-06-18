const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const validateCourse = require('../middleware/course.validation');

// GET /api/courses - Get all courses
router.get('/', courseController.getAllCourses);

// GET /api/courses/:id - Get single course
router.get('/:id', validateCourse.id, courseController.getCourseById);

// POST /api/courses - Create new course
router.post('/', validateCourse.create, courseController.createCourse);

// PUT /api/courses/:id - Update course
router.put('/:id', validateCourse.update, courseController.updateCourse);

// DELETE /api/courses/:id - Delete course
router.delete('/:id', validateCourse.id, courseController.deleteCourse);

module.exports = router; 