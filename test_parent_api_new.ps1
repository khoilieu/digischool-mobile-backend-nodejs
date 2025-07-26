# Test Script cho Module Phụ Huynh - API mới với startOfWeek và endOfWeek
# PowerShell Script

# Cấu hình
$BASE_URL = "http://localhost:3000"
$TOKEN = "YOUR_JWT_TOKEN"  # Thay thế bằng token thực tế
$CHILD_ID = "CHILD_ID"     # Thay thế bằng ID con thực tế
$ACADEMIC_YEAR = "2024-2025"
$START_OF_WEEK = "2024-01-15"
$END_OF_WEEK = "2024-01-21"

Write-Host "🧪 Testing Parent API Module (New Version)..." -ForegroundColor Green

# Headers
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

# Test 1: Health Check
Write-Host "`n📋 Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/health" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Lấy danh sách con (cần token hợp lệ)
Write-Host "`n📋 Test 2: Lấy danh sách con" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/children" -Method GET -Headers $headers
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Xem thời khóa biểu của con (API mới)
Write-Host "`n📅 Test 3: Xem thời khóa biểu của con (với startOfWeek và endOfWeek)" -ForegroundColor Yellow
$scheduleUrl = "$BASE_URL/api/parents/children/$CHILD_ID/schedule?academicYear=$ACADEMIC_YEAR&startOfWeek=$START_OF_WEEK&endOfWeek=$END_OF_WEEK"
try {
    $response = Invoke-RestMethod -Uri $scheduleUrl -Method GET -Headers $headers
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Gửi feedback
Write-Host "`n💬 Test 4: Gửi feedback" -ForegroundColor Yellow
$feedbackBody = @{
    rating = 5
    description = "Hệ thống rất tuyệt vời! Con tôi rất thích sử dụng và tôi cũng thấy rất tiện lợi. Giao diện đẹp, dễ sử dụng và thông tin được cập nhật thường xuyên."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/feedback" -Method POST -Headers $headers -Body $feedbackBody
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Lấy danh sách feedback
Write-Host "`n📝 Test 5: Lấy danh sách feedback" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/feedback?page=1&limit=5" -Method GET -Headers $headers
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Validation Error - Rating không hợp lệ
Write-Host "`n🔍 Test 6: Validation Error - Rating không hợp lệ" -ForegroundColor Yellow
$invalidFeedbackBody = @{
    rating = 6
    description = "Test description with enough characters to pass validation"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/feedback" -Method POST -Headers $headers -Body $invalidFeedbackBody
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Validation Error - Description quá ngắn
Write-Host "`n🔍 Test 7: Validation Error - Description quá ngắn" -ForegroundColor Yellow
$shortFeedbackBody = @{
    rating = 4
    description = "Short"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/feedback" -Method POST -Headers $headers -Body $shortFeedbackBody
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Thiếu tham số bắt buộc
Write-Host "`n🔍 Test 8: Thiếu tham số bắt buộc" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/parents/children/$CHILD_ID/schedule?academicYear=$ACADEMIC_YEAR" -Method GET -Headers $headers
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Expected Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Testing completed!" -ForegroundColor Green
Write-Host "`n📝 Lưu ý:" -ForegroundColor Cyan
Write-Host "- Thay thế YOUR_JWT_TOKEN bằng token thực tế" -ForegroundColor White
Write-Host "- Thay thế CHILD_ID bằng ID con thực tế" -ForegroundColor White
Write-Host "- API mới sử dụng startOfWeek và endOfWeek thay vì weekNumber" -ForegroundColor White 