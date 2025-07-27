const multer = require("multer");
const { Storage } = require("@google-cloud/storage");

// Kiểm tra các biến môi trường GCP
const gcpConfig = {
  projectId: process.env.GCP_PROJECT_ID,
  clientEmail: process.env.GCP_CLIENT_EMAIL,
  privateKey: process.env.GCP_PRIVATE_KEY,
  bucketName: process.env.GCP_BUCKET_NAME
};

// Cấu hình storage
let storage;

if (gcpConfig.projectId && gcpConfig.clientEmail && gcpConfig.privateKey && gcpConfig.bucketName) {
  try {
    const gcsStorage = new Storage({
      projectId: gcpConfig.projectId,
      credentials: {
        client_email: gcpConfig.clientEmail,
        private_key: gcpConfig.privateKey.replace(/\\n/g, "\n"),
      },
    });
    
    storage = multer.memoryStorage(); // Vẫn dùng memory storage để xử lý file
  } catch (error) {
    console.warn('⚠️  GCS configuration error, using memory storage:', error.message);
    storage = multer.memoryStorage();
  }
} else {
  console.warn('⚠️  GCP configuration is incomplete. Using memory storage.');
  storage = multer.memoryStorage();
}

const upload = multer({ storage });

module.exports = upload;
