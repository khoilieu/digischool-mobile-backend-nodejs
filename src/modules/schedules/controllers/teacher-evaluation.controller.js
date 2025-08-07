const teacherEvaluationService = require("../services/teacher-evaluation.service");

class TeacherEvaluationController {
  async createEvaluation(req, res, next) {
    try {
      const result = await teacherEvaluationService.createEvaluation({
        user: req.user,
        params: req.params,
        body: req.body,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TeacherEvaluationController();
