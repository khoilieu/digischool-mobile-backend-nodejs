const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware xác thực JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Kiểm tra token trong header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Kiểm tra token có bị vô hiệu hóa không
    if (global.invalidTokens && global.invalidTokens.has(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated. Please login again.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Lấy thông tin user từ token
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Kiểm tra session token có match không
      if (user.currentSessionToken !== token) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }

      // Thêm user vào request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Middleware kiểm tra role
const authorize = (...roles) => {
  return (req, res, next) => {
    // Kiểm tra nếu user.role là array
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    
    // Kiểm tra xem có role nào của user trùng với roles được phép không
    const hasPermission = userRoles.some(userRole => roles.includes(userRole));
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `User roles [${userRoles.join(', ')}] are not authorized to access this route. Required: [${roles.join(', ')}]`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
}; 