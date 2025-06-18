const XLSX = require('xlsx');
const Subject = require('../models/subject.model');

class SubjectService {
  
  // Import subjects from Excel file
  async importFromExcel(fileBuffer) {
    try {
      // Parse Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (!data || data.length === 0) {
        throw new Error('Excel file is empty or has no valid data');
      }

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        errors: [],
        successfulSubjects: [],
        failedSubjects: []
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate and transform Excel row data
          const subjectData = this.validateAndTransformExcelRow(row, i + 2); // +2 because Excel starts from 1 and we have header
          
          // Check if subject already exists
          const existingSubject = await Subject.findOne({
            $or: [
              { subjectName: subjectData.subjectName },
              { subjectCode: subjectData.subjectCode }
            ]
          });

          if (existingSubject) {
            // Update existing subject
            const updatedSubject = await Subject.findByIdAndUpdate(
              existingSubject._id,
              subjectData,
              { new: true, runValidators: true }
            );
            results.successfulSubjects.push({
              row: i + 2,
              action: 'updated',
              subject: updatedSubject
            });
          } else {
            // Create new subject
            const newSubject = new Subject(subjectData);
            await newSubject.save();
            results.successfulSubjects.push({
              row: i + 2,
              action: 'created',
              subject: newSubject
            });
          }
          
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            data: row,
            error: error.message
          });
          results.failedSubjects.push({
            row: i + 2,
            data: row,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error.message}`);
    }
  }

  // Validate and transform Excel row data
  validateAndTransformExcelRow(row, rowNumber) {
    const errors = [];

    // Required fields validation
    if (!row.subjectName || !row.subjectName.toString().trim()) {
      errors.push('Subject name is required');
    }
    
    if (!row.subjectCode || !row.subjectCode.toString().trim()) {
      errors.push('Subject code is required');
    }

    if (!row.gradeLevels) {
      errors.push('Grade levels are required');
    }

    if (errors.length > 0) {
      throw new Error(`Row ${rowNumber}: ${errors.join(', ')}`);
    }

    // Transform and validate data
    const subjectData = {
      subjectName: row.subjectName.toString().trim(),
      subjectCode: row.subjectCode.toString().trim().toUpperCase(),
      description: row.description ? row.description.toString().trim() : '',
      gradeLevels: this.parseGradeLevels(row.gradeLevels, rowNumber),
      credits: row.credits ? parseInt(row.credits) : 1,
      weeklyHours: row.weeklyHours ? parseFloat(row.weeklyHours) : 1,
      category: row.category ? row.category.toString().toLowerCase() : 'core',
      department: row.department ? row.department.toString().toLowerCase() : 'other',
      isActive: row.isActive !== undefined ? Boolean(row.isActive) : true
    };

    // Validate enum values
    const validCategories = ['core', 'elective', 'extra_curricular', 'vocational', 'special'];
    if (!validCategories.includes(subjectData.category)) {
      throw new Error(`Row ${rowNumber}: Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    const validDepartments = [
      'mathematics', 'literature', 'english', 'science', 'physics', 'chemistry',
      'biology', 'history', 'geography', 'civic_education', 'physical_education',
      'arts', 'music', 'technology', 'informatics', 'foreign_language', 'other'
    ];
    if (!validDepartments.includes(subjectData.department)) {
      throw new Error(`Row ${rowNumber}: Invalid department. Must be one of: ${validDepartments.join(', ')}`);
    }

    // Validate subject code format
    if (!/^[A-Z0-9]{2,6}$/.test(subjectData.subjectCode)) {
      throw new Error(`Row ${rowNumber}: Subject code must be 2-6 characters long and contain only letters and numbers`);
    }

    // Validate credits range
    if (subjectData.credits < 0 || subjectData.credits > 10) {
      throw new Error(`Row ${rowNumber}: Credits must be between 0 and 10`);
    }

    // Validate weekly hours
    if (subjectData.weeklyHours < 0 || subjectData.weeklyHours > 20 || subjectData.weeklyHours % 0.5 !== 0) {
      throw new Error(`Row ${rowNumber}: Weekly hours must be between 0 and 20 in increments of 0.5`);
    }

    return subjectData;
  }

  // Parse grade levels from Excel (can be comma-separated string or range)
  parseGradeLevels(gradeLevelsStr, rowNumber) {
    try {
      const str = gradeLevelsStr.toString().trim();
      let grades = [];

      // Handle range format (e.g., "1-3" or "10-12")
      if (str.includes('-')) {
        const [start, end] = str.split('-').map(n => parseInt(n.trim()));
        if (isNaN(start) || isNaN(end) || start > end) {
          throw new Error('Invalid range format');
        }
        for (let i = start; i <= end; i++) {
          grades.push(i);
        }
      } 
      // Handle comma-separated format (e.g., "1,2,3" or "10, 11, 12")
      else if (str.includes(',')) {
        grades = str.split(',').map(n => {
          const grade = parseInt(n.trim());
          if (isNaN(grade)) throw new Error('Invalid grade number');
          return grade;
        });
      }
      // Handle single grade
      else {
        const grade = parseInt(str);
        if (isNaN(grade)) throw new Error('Invalid grade number');
        grades = [grade];
      }

      // Validate grade range (1-12)
      const invalidGrades = grades.filter(g => g < 1 || g > 12);
      if (invalidGrades.length > 0) {
        throw new Error(`Invalid grade levels: ${invalidGrades.join(', ')}. Must be between 1 and 12`);
      }

      // Remove duplicates and sort
      return [...new Set(grades)].sort((a, b) => a - b);
    } catch (error) {
      throw new Error(`Row ${rowNumber}: Error parsing grade levels - ${error.message}`);
    }
  }

  // Get all subjects with pagination
  async getAllSubjects(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const query = { isActive: true };

    // Apply filters
    if (filters.department) {
      query.department = filters.department;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.gradeLevel) {
      query.gradeLevels = parseInt(filters.gradeLevel);
    }
    if (filters.search) {
      query.$or = [
        { subjectName: { $regex: filters.search, $options: 'i' } },
        { subjectCode: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .populate('teacherCount')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ subjectName: 1 }),
      Subject.countDocuments(query)
    ]);

    return {
      subjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  }

  // Get subject by ID
  async getSubjectById(id) {
    const subject = await Subject.findById(id).populate('teacherCount');
    if (!subject) {
      throw new Error('Subject not found');
    }
    return subject;
  }

  // Create new subject
  async createSubject(subjectData) {
    const subject = new Subject(subjectData);
    await subject.save();
    return subject;
  }

  // Update subject
  async updateSubject(id, updateData) {
    const subject = await Subject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!subject) {
      throw new Error('Subject not found');
    }
    return subject;
  }

  // Delete subject (soft delete)
  async deleteSubject(id) {
    const subject = await Subject.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!subject) {
      throw new Error('Subject not found');
    }
    return subject;
  }

  // Get subject statistics
  async getSubjectStats() {
    const [
      totalSubjects,
      activeSubjects,
      categoryStats,
      departmentStats,
      gradeLevelStats
    ] = await Promise.all([
      Subject.countDocuments(),
      Subject.countDocuments({ isActive: true }),
      Subject.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Subject.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Subject.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$gradeLevels' },
        { $group: { _id: '$gradeLevels', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    return {
      totalSubjects,
      activeSubjects,
      inactiveSubjects: totalSubjects - activeSubjects,
      categoryBreakdown: categoryStats,
      departmentBreakdown: departmentStats,
      gradeLevelBreakdown: gradeLevelStats
    };
  }

  // Generate Excel template for import
  generateExcelTemplate() {
    const template = [
      {
        subjectName: 'Toán học',
        subjectCode: 'MATH',
        description: 'Môn toán học cơ bản',
        gradeLevels: '1-12',
        credits: 3,
        weeklyHours: 4,
        category: 'core',
        department: 'mathematics',
        isActive: true
      },
      {
        subjectName: 'Ngữ văn',
        subjectCode: 'LIT',
        description: 'Môn ngữ văn Việt Nam',
        gradeLevels: '1,2,3,4,5',
        credits: 3,
        weeklyHours: 5,
        category: 'core',
        department: 'literature',
        isActive: true
      },
      {
        subjectName: 'Tiếng Anh',
        subjectCode: 'ENG',
        description: 'Tiếng Anh cơ bản',
        gradeLevels: '6-12',
        credits: 2,
        weeklyHours: 3,
        category: 'core',
        department: 'english',
        isActive: true
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new SubjectService(); 