require('dotenv').config();
const connectDB = require('./config/database');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Email Host: ${process.env.EMAIL_HOST || 'NOT SET'}`);
      console.log(`Email User: ${process.env.EMAIL_USER || 'NOT SET'}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }); 