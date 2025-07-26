# CURL Examples for Parents Import API

## 1. Import Parents từ File Excel

### Upload file Excel
```bash
curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@parents_import_template_v2.xlsx"
```

### Response thành công
```json
{
  "success": true,
  "message": "Parent import completed",
  "data": {
    "success": [
      {
        "row": 2,
        "email": "nguyenvanphuc.parents@yopmail.com",
        "name": "Nguyễn Văn Phúc",
        "childrenCount": 1,
        "childrenNames": ["Nguyễn Văn Phúc"],
        "status": "awaiting_first_login",
        "tempPassword": "Kj9#mN2$pL5"
      },
      {
        "row": 14,
        "email": "lieuvankhoi.parents@yopmail.com",
        "name": "Liêu Văn Khôi",
        "childrenCount": 2,
        "childrenNames": ["Liêu Vinh Khôi", "Khôi Liêu"],
        "status": "awaiting_first_login",
        "tempPassword": "Xy7@kP9#mN2$"
      }
    ],
    "failed": [],
    "total": 14
  }
}
```

## 2. Import Parents từ Base64

### Convert file Excel to base64
```bash
# Trên Linux/Mac
base64 -i parents_import_template_v2.xlsx

# Trên Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("parents_import_template_v2.xlsx"))
```

### Gọi API với base64
```bash
curl -X POST \
  http://localhost:3000/api/users/import-parents-base64 \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "base64Data": "UEsDBBQAAAAIAA..."
  }'
```

## 3. Test với dữ liệu nhỏ (1 phụ huynh)

### Tạo file test nhỏ
```bash
# Tạo file test với 1 phụ huynh có 2 con
echo 'name,dateOfBirth,gender,childId,phone,email,address
Liêu Văn Khôi,1975-12-03,male,685c1c4888697d34ad3439da,0901234579,lieuvankhoi.parents@yopmail.com,159 Đường HIJ Quận Bình Thạnh TP.HCM
Liêu Văn Khôi,1975-12-03,male,6860c3ebc2402acd3a9752e9,0901234579,lieuvankhoi.parents@yopmail.com,159 Đường HIJ Quận Bình Thạnh TP.HCM' > test_parent.csv
```

### Convert CSV to Excel (nếu cần)
```bash
# Sử dụng Python để convert CSV to Excel
python3 -c "
import pandas as pd
df = pd.read_csv('test_parent.csv')
df.to_excel('test_parent.xlsx', index=False)
"
```

### Test với file nhỏ
```bash
curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@test_parent.xlsx"
```

## 4. Test Error Cases

### Test với childId không tồn tại
```bash
# Tạo file với childId sai
echo 'name,dateOfBirth,gender,childId,phone,email,address
Test Parent,1980-01-01,male,INVALID_ID,0901234567,test@yopmail.com,Test Address' > error_test.csv

# Convert to Excel và test
python3 -c "import pandas as pd; df = pd.read_csv('error_test.csv'); df.to_excel('error_test.xlsx', index=False)"

curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@error_test.xlsx"
```

### Response lỗi
```json
{
  "success": true,
  "message": "Parent import completed",
  "data": {
    "success": [],
    "failed": [
      {
        "row": 2,
        "data": {
          "name": "Test Parent",
          "dateOfBirth": "1980-01-01",
          "gender": "male",
          "childId": "INVALID_ID",
          "phone": "0901234567",
          "email": "test@yopmail.com",
          "address": "Test Address"
        },
        "error": "Child with ID 'INVALID_ID' not found or is not a student"
      }
    ],
    "total": 1
  }
}
```

### Test với thiếu trường bắt buộc
```bash
# Tạo file thiếu phone
echo 'name,dateOfBirth,gender,childId,email,address
Test Parent,1980-01-01,male,685584df62669cca8757dfea,test@yopmail.com,Test Address' > missing_field_test.csv

python3 -c "import pandas as pd; df = pd.read_csv('missing_field_test.csv'); df.to_excel('missing_field_test.xlsx', index=False)"

curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@missing_field_test.xlsx"
```

## 5. Test Authentication

### Test không có token
```bash
curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -F "file=@parents_import_template_v2.xlsx"
```

### Test với token không phải manager
```bash
curl -X POST \
  http://localhost:3000/api/users/import-parents \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -F "file=@parents_import_template_v2.xlsx"
```

## 6. Test với dữ liệu thực tế

### Lấy danh sách học sinh để lấy _id
```bash
curl -X GET \
  http://localhost:3000/api/users?role=student \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```

### Tạo file với _id thực tế
```bash
# Sử dụng _id từ response trên để tạo file Excel
# Ví dụ với 3 phụ huynh có con thực tế
```

## 7. Cleanup sau khi test

### Xóa file test
```bash
rm test_parent.csv test_parent.xlsx error_test.csv error_test.xlsx missing_field_test.csv missing_field_test.xlsx
```

## 8. Create Parent API (Tạo phụ huynh mới)

### Tạo phụ huynh với đầy đủ thông tin
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nguyễn Văn A",
    "email": "parent@example.com",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1", "64f1a2b3c4d5e6f7g8h9i0j2"],
    "dateOfBirth": "1980-01-01",
    "gender": "male",
    "address": "123 Đường ABC, Quận XYZ, TP.HCM"
  }'
```

### Response thành công
```json
{
  "success": true,
  "message": "Parent created successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "name": "Nguyễn Văn A",
    "email": "parent@example.com",
    "phone": "0123456789",
    "address": "123 Đường ABC, Quận XYZ, TP.HCM",
    "children": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Nguyễn Văn B",
        "studentId": "STU001",
        "class_id": "64f1a2b3c4d5e6f7g8h9i0j4"
      },
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "name": "Nguyễn Văn C",
        "studentId": "STU002",
        "class_id": "64f1a2b3c4d5e6f7g8h9i0j5"
      }
    ],
    "dateOfBirth": "1980-01-01T00:00:00.000Z",
    "gender": "male",
    "role": ["parents"],
    "isNewUser": true,
    "active": true,
    "tempPassword": "Kj9#mN2$pL5",
    "status": "awaiting_first_login",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Tạo phụ huynh không có email (tự động tạo)
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trần Thị B",
    "phone": "0987654321",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"],
    "gender": "female",
    "address": "456 Đường DEF, Quận GHI, TP.HCM"
  }'
```

### Response với email tự động tạo
```json
{
  "success": true,
  "message": "Parent created successfully",
  "data": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j6",
    "name": "Trần Thị B",
    "email": "tranthib.parents@yopmail.com",
    "phone": "0987654321",
    "address": "456 Đường DEF, Quận GHI, TP.HCM",
    "children": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "name": "Nguyễn Văn B",
        "studentId": "STU001",
        "class_id": "64f1a2b3c4d5e6f7g8h9i0j4"
      }
    ],
    "dateOfBirth": null,
    "gender": "female",
    "role": ["parents"],
    "isNewUser": true,
    "active": true,
    "tempPassword": "Xy7@kP9#mN2$",
    "status": "awaiting_first_login",
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### Test validation errors

#### Thiếu trường bắt buộc
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789"
  }'
```

#### Response lỗi validation
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": [],
      "msg": "Children IDs must be a non-empty array",
      "path": "childrenIds",
      "location": "body"
    }
  ]
}
```

#### Email không hợp lệ
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "email": "invalid-email",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

#### Phone không hợp lệ
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "123",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

#### ChildrenIds không hợp lệ
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789",
    "childrenIds": ["invalid-id"]
  }'
```

### Test business logic errors

#### Email đã tồn tại
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "email": "existing@example.com",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

#### Phone đã tồn tại
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

#### Children không tồn tại
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j9"]
  }'
```

### Test authentication

#### Không có token
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

#### Token không phải manager
```bash
curl -X POST \
  http://localhost:3000/api/users/create-parent \
  -H "Authorization: Bearer STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent",
    "phone": "0123456789",
    "childrenIds": ["64f1a2b3c4d5e6f7g8h9i0j1"]
  }'
```

## Lưu ý quan trọng

1. **Thay thế `YOUR_MANAGER_TOKEN`** bằng token thực tế của manager
2. **Đảm bảo server đang chạy** trên localhost:3000
3. **File Excel phải có định dạng đúng** với các cột: name, dateOfBirth, gender, childId, phone, email, address
4. **childId phải là _id thực tại** của học sinh trong database
5. **Test với dữ liệu nhỏ trước** khi import file lớn
6. **Kiểm tra response** để xem kết quả thành công/thất bại
7. **childrenIds phải là array** chứa các MongoDB ObjectId hợp lệ
8. **Phone number phải unique** trong hệ thống
9. **Email sẽ được tự động tạo** nếu không được cung cấp
10. **Temporary password sẽ được gửi qua email** cho phụ huynh

## Troubleshooting

### Lỗi "No file uploaded"
- Đảm bảo file tồn tại và đường dẫn đúng
- Kiểm tra quyền đọc file

### Lỗi "Invalid file format"
- Đảm bảo file là Excel (.xlsx)
- Kiểm tra file không bị corrupt

### Lỗi "Only managers can import parents"
- Đảm bảo token là của user có role manager
- Kiểm tra token còn hạn không

### Lỗi "Child with ID not found"
- Kiểm tra _id học sinh có tồn tại trong database
- Đảm bảo học sinh có role 'student'

### Lỗi "Phone number already exists"
- Kiểm tra số điện thoại đã được sử dụng bởi phụ huynh khác
- Sử dụng số điện thoại khác

### Lỗi "Email already exists"
- Kiểm tra email đã được sử dụng bởi user khác
- Sử dụng email khác hoặc để trống để tự động tạo

### Lỗi "Some children not found or are not students"
- Kiểm tra tất cả childrenIds có tồn tại trong database
- Đảm bảo tất cả children có role 'student' 