# Sử dụng image Node.js chính thức
FROM node:18-alpine

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài đặt wget cho health check
RUN apk add --no-cache wget

# Sao chép package.json và cài đặt dependencies
COPY package*.json ./
RUN npm ci --only=production

# Sao chép toàn bộ mã nguồn
COPY . .

# Tạo user không phải root để chạy ứng dụng
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Mở cổng ứng dụng
EXPOSE 8080

# Thiết lập biến môi trường
ENV NODE_ENV=production

# Health check đơn giản hơn
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]