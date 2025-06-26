# Cloud Run Setup Guide

## Vấn đề đã được sửa

Lỗi "container failed to start and listen on port 8080" đã được khắc phục bằng cách:

1. **Cập nhật Dockerfile** với Alpine Linux và health check
2. **Cải thiện server.js** để xử lý graceful shutdown và không bắt buộc kết nối database
3. **Cập nhật CI/CD workflow** với cấu hình Cloud Run tối ưu
4. **Thêm biến môi trường** cần thiết
5. **Enable các API cần thiết** trong Google Cloud

## Biến môi trường cần thiết

Để ứng dụng hoạt động đầy đủ, bạn cần thiết lập các biến môi trường sau trong Cloud Run:

### Bắt buộc:

- `NODE_ENV=production`
- `PORT` (tự động được Cloud Run set, không cần thiết lập thủ công)

### Tùy chọn (nếu có database):

- `MONGODB_URI=mongodb://your-mongodb-connection-string`
- `DB_NAME=your-database-name`

### Tùy chọn (nếu có email service):

- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_USER=your-email@gmail.com`
- `EMAIL_PASS=your-app-password`

## Cách thiết lập biến môi trường trong Cloud Run

### Qua Google Cloud Console:

1. Vào Cloud Run service
2. Chọn "EDIT & DEPLOY NEW REVISION"
3. Trong tab "Variables & Secrets", thêm các biến môi trường
4. Deploy lại

### Qua gcloud CLI:

```bash
gcloud run services update digischool-app \
  --region=us-central1 \
  --set-env-vars NODE_ENV=production,MONGODB_URI=your-mongodb-uri
```

### Qua GitHub Actions (đã cập nhật):

Workflow đã được cập nhật để tự động thiết lập các biến môi trường cơ bản.

## API cần thiết

Các API sau sẽ được tự động enable trong CI/CD pipeline:

- `cloudresourcemanager.googleapis.com`
- `run.googleapis.com`
- `containerregistry.googleapis.com`

## Health Check

Ứng dụng có endpoint health check tại: `/api/health`

## Troubleshooting

### Nếu vẫn gặp lỗi:

1. Kiểm tra logs trong Cloud Run console
2. Đảm bảo port 8080 được expose đúng cách
3. Kiểm tra biến môi trường MONGODB_URI nếu cần database
4. Đảm bảo timeout đủ dài (đã set 300s)
5. Kiểm tra xem các API đã được enable chưa

### Logs quan trọng:

- `✅ MongoDB Connected Successfully` - Database kết nối thành công
- `⚠️ MONGODB_URI not set - running without database connection` - Chạy không có database
- `🚀 Server is running on port 8080` - Server khởi động thành công

### Lỗi thường gặp:

- **"PORT is reserved"**: Không set PORT trong biến môi trường, Cloud Run tự động set
- **"API not enabled"**: Các API sẽ được tự động enable trong workflow
