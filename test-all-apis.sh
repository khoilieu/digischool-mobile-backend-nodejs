#!/bin/bash

# EcoSchool Schedule APIs Test Script
# Make executable: chmod +x test-all-apis.sh
# Run: ./test-all-apis.sh

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NGQyOWE0OWEzMGQ4NWQ1OGNmMGNkZiIsImlhdCI6MTc1MDM0MTIzNywiZXhwIjoxNzUwNDI3NjM3fQ.K6BlMUk-zfcxqnZ8hN6aZ8zfg7ZmvfuXuruG6KA-D0o"
BASE_URL="http://localhost:3000/api/schedules"

echo "🚀 EcoSchool Schedule APIs Test"
echo "==============================="

# Test 1: Authentication
echo -e "\n📝 Test 1: Authentication"
curl -s --location "$BASE_URL/test-auth" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 2: Check class exists
echo -e "\n📋 Test 2: Check if class 12A4 exists"
curl -s --location "$BASE_URL/check-class?className=12A4&academicYear=2024-2025" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 3: Get available schedules
echo -e "\n📅 Test 3: Get available schedules"
curl -s --location "$BASE_URL/available?academicYear=2024-2025&className=12A4" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 4: Initialize schedules
echo -e "\n🔨 Test 4: Initialize schedules for grade 12"
curl -s --location "$BASE_URL/initialize" \
--header "Authorization: Bearer $TOKEN" \
--header 'Content-Type: application/json' \
--data '{
  "academicYear": "2024-2025",
  "gradeLevel": 12,
  "semester": 1
}' | jq .

# Test 5: Get class schedule by date range
echo -e "\n🗓️ Test 5: Get class schedule by date range"
curl -s --location "$BASE_URL/class?className=12A4&academicYear=2024-2025&startOfWeek=2024-12-16&endOfWeek=2024-12-22" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 6: Get learning progress
echo -e "\n📊 Test 6: Get learning progress"
curl -s --location "$BASE_URL/progress?className=12A4&academicYear=2024-2025" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 7: Get attendance report
echo -e "\n📋 Test 7: Get attendance report"
curl -s --location "$BASE_URL/attendance-report?className=12A4&academicYear=2024-2025" \
--header "Authorization: Bearer $TOKEN" | jq .

# Test 8: Get helper APIs
echo -e "\n🛠️ Test 8: Get time slots"
curl -s --location "$BASE_URL/helper/time-slots" \
--header "Authorization: Bearer $TOKEN" | jq .

echo -e "\n✅ All tests completed!"
echo -e "\n📖 To mark periods as completed/absent, first get SCHEDULE_ID from Test 3"
echo "Then use these commands:"
echo ""
echo "# Mark period completed:"
echo "curl --location '$BASE_URL/SCHEDULE_ID/mark-completed' \\"
echo "--header 'Authorization: Bearer $TOKEN' \\"
echo "--header 'Content-Type: application/json' \\"
echo "--data '{"
echo "  \"dayOfWeek\": 2,"
echo "  \"periodNumber\": 1,"
echo "  \"attendance\": {"
echo "    \"presentStudents\": 35,"
echo "    \"absentStudents\": 3,"
echo "    \"totalStudents\": 38"
echo "  },"
echo "  \"notes\": \"Completed lesson\""
echo "}'"
echo ""
echo "# Mark period absent:"
echo "curl --location '$BASE_URL/SCHEDULE_ID/mark-absent' \\"
echo "--header 'Authorization: Bearer $TOKEN' \\"
echo "--header 'Content-Type: application/json' \\"
echo "--data '{"
echo "  \"dayOfWeek\": 3,"
echo "  \"periodNumber\": 2,"
echo "  \"notes\": \"Teacher was sick\""
echo "}'" 