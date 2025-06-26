# Sử dụng image Node.js chính thức
FROM node:18

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Sao chép toàn bộ mã nguồn
COPY . .

# Mở cổng ứng dụng
EXPOSE 3000

# Lệnh khởi chạy ứng dụng
CMD ["npm", "start"]