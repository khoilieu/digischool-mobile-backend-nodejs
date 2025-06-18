const path = require('path');

// Middleware for handling base64 Excel file upload
const handleBase64Upload = (req, res, next) => {
  try {
    const { fileData, fileName, mimeType } = req.body;

    // Check if required fields are present
    if (!fileData) {
      return res.status(400).json({
        success: false,
        message: 'No file data provided. Please include "fileData" field with base64 encoded file.'
      });
    }

    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'No file name provided. Please include "fileName" field.'
      });
    }

    // Validate file extension
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'
      });
    }

    // Validate mime type if provided
    if (mimeType) {
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      
      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid MIME type. Only Excel files are allowed.'
        });
      }
    }

    // Remove data URL prefix if present (data:application/...,base64,)
    let base64Data = fileData;
    if (base64Data.startsWith('data:')) {
      const base64Index = base64Data.indexOf(',');
      if (base64Index !== -1) {
        base64Data = base64Data.substring(base64Index + 1);
      }
    }

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid base64 format.'
      });
    }

    try {
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(base64Data, 'base64');
      
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileBuffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }

      // Check minimum file size (should be at least 100 bytes for a valid Excel file)
      if (fileBuffer.length < 100) {
        return res.status(400).json({
          success: false,
          message: 'File too small. Please check if the file is valid.'
        });
      }

      // Attach file info to request object (similar to multer)
      req.file = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: mimeType || (fileExtension === '.xlsx' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/vnd.ms-excel'),
        size: fileBuffer.length
      };

      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to decode base64 data. Please check the file encoding.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while processing file upload.'
    });
  }
};

// Error handling middleware (keeping for consistency)
const handleUploadError = (error, req, res, next) => {
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message.includes('File too large')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  uploadExcelFile: handleBase64Upload, // Renamed for consistency
  handleUploadError
}; 