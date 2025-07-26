const { body, param, query } = require("express-validator");
const { validationResult } = require("express-validator");

class ScheduleValidation {
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
    }
    next();
  }

  validateCreateSchedule() {
    return [
      body("academicYear")
        .trim()
        .notEmpty()
        .withMessage("Academic year is required"),

      body("gradeLevel")
        .trim()
        .notEmpty()
        .withMessage("Grade level is required"),

      body("weekNumber")
        .optional()
        .isInt({ min: 1, max: 52 })
        .withMessage("Week number must be between 1 and 52"),

      body("scheduleType")
        .optional()
        .isIn(["MONDAY_TO_SATURDAY", "MONDAY_TO_FRIDAY"])
        .withMessage(
          "Schedule type must be MONDAY_TO_SATURDAY or MONDAY_TO_FRIDAY"
        ),

      body("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid ISO date"),

      body("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO date"),

      body("semester").trim().notEmpty().withMessage("Semester is required"),

      (req, res, next) => {
        const { startDate, endDate } = req.body;

        if (startDate && !endDate) {
          return res.status(400).json({
            success: false,
            message: "If startDate is provided, endDate is required",
          });
        }

        if (!startDate && endDate) {
          return res.status(400).json({
            success: false,
            message: "If endDate is provided, startDate is required",
          });
        }

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (end <= start) {
            return res.status(400).json({
              success: false,
              message: "End date must be after start date",
            });
          }

          const diffDays = (end - start) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) {
            return res.status(400).json({
              success: false,
              message: "Date range cannot exceed 7 days",
            });
          }
        }

        next();
      },

      this.handleValidationErrors,
    ];
  }

  validateGetWeeklySchedule() {
    return [
      param("className")
        .trim()
        .notEmpty()
        .withMessage("Class name is required"),

      param("academicYear")
        .trim()
        .notEmpty()
        .withMessage("Academic year is required"),

      param("weekNumber")
        .isInt({ min: 1, max: 52 })
        .withMessage("Week number must be between 1 and 52"),

      this.handleValidationErrors,
    ];
  }

  validateGetTeacherSchedule() {
    return [
      param("teacherId")
        .isMongoId()
        .withMessage("Teacher ID must be a valid MongoDB ID"),

      param("academicYear")
        .trim()
        .notEmpty()
        .withMessage("Academic year is required"),

      param("weekNumber")
        .isInt({ min: 1, max: 52 })
        .withMessage("Week number must be between 1 and 52"),

      this.handleValidationErrors,
    ];
  }

  validateGetLessonDetail() {
    return [
      param("lessonId")
        .isMongoId()
        .withMessage("Lesson ID must be a valid MongoDB ID"),

      this.handleValidationErrors,
    ];
  }

  validateUpdateLessonDescription() {
    return [
      param("lessonId")
        .isMongoId()
        .withMessage("Lesson ID must be a valid MongoDB ID"),

      body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required")
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters"),

      this.handleValidationErrors,
    ];
  }

  validateImportExcel() {
    return [
      (req, res, next) => {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "Vui lòng upload file Excel (.xlsx)",
          });
        }
        next();
      },
      this.handleValidationErrors,
    ];
  }
}

module.exports = new ScheduleValidation();
