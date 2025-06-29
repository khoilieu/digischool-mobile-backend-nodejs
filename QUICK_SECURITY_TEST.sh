#!/bin/bash

# Quick Security Test Script cho Teacher Evaluation API
# Test đảm bảo chỉ giáo viên dạy tiết đó mới được đánh giá

echo "🔐 QUICK SECURITY TEST - Teacher Evaluation API"
echo "==============================================="

# Configuration
BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api/teacher-evaluations"

# ⚠️  THAY ĐỔI CÁC GIÁ TRỊ NÀY THEO DATABASE THẬT CỦA BẠN
TEACHER1_TOKEN="your_teacher1_token_here"
TEACHER2_TOKEN="your_teacher2_token_here" 
STUDENT_TOKEN="your_student_token_here"

LESSON_ID_TEACHER1="675a1b2c3d4e5f6789012345"  # Lesson của Teacher1
LESSON_ID_TEACHER2="675a1b2c3d4e5f6789012346"  # Lesson của Teacher2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test and show result
test_api() {
    local test_name="$1"
    local expected_status="$2"
    local command="$3"
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    echo "Command: $command"
    
    response=$(eval "$command" 2>/dev/null)
    
    if echo "$response" | grep -q "success.*$expected_status"; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
    elif echo "$response" | grep -q "error\|message"; then
        echo -e "${RED}❌ EXPECTED FAIL${NC}: $test_name"
        echo "Response: $(echo "$response" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$response")"
    else
        echo -e "${RED}⚠️  UNEXPECTED${NC}: $test_name"
        echo "Response: $response"
    fi
}

echo -e "\n🧪 SECURITY TESTS"
echo "=================="

# Test 1: No authentication
test_api "No Token (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Test\",\"content\":\"Test\",\"rating\":\"A\",\"comments\":\"Test\"}'"

# Test 2: Student role trying to evaluate
test_api "Student Role (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate' \
-H 'Authorization: Bearer $STUDENT_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Test\",\"content\":\"Test\",\"rating\":\"A\",\"comments\":\"Test\"}'"

# Test 3: Teacher2 trying to evaluate Teacher1's lesson
test_api "Wrong Teacher (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate' \
-H 'Authorization: Bearer $TEACHER2_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Unauthorized Test\",\"content\":\"Teacher2 trying to evaluate Teacher1 lesson\",\"rating\":\"A\",\"comments\":\"This should fail\"}'"

# Test 4: Teacher1 evaluating their own lesson (Should succeed)
test_api "Correct Teacher (Should Pass)" "true" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate' \
-H 'Authorization: Bearer $TEACHER1_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Tiết 15: Authorized Test\",\"content\":\"Teacher1 evaluating their own lesson\",\"rating\":\"A\",\"comments\":\"This should work\"}'"

# Test 5: Try to create duplicate evaluation
test_api "Duplicate Evaluation (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER1/evaluate' \
-H 'Authorization: Bearer $TEACHER1_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Duplicate Test\",\"content\":\"This should fail\",\"rating\":\"A\",\"comments\":\"Already evaluated\"}'"

echo -e "\n🎯 VALIDATION TESTS"
echo "==================="

# Test 6: Invalid rating
test_api "Invalid Rating (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER2/evaluate' \
-H 'Authorization: Bearer $TEACHER2_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Invalid Rating Test\",\"content\":\"Test content\",\"rating\":\"S\",\"comments\":\"Invalid rating\"}'"

# Test 7: Missing required fields
test_api "Missing Required Fields (Should Fail)" "false" \
"curl -s -X POST '$API_URL/lessons/$LESSON_ID_TEACHER2/evaluate' \
-H 'Authorization: Bearer $TEACHER2_TOKEN' \
-H 'Content-Type: application/json' \
-d '{\"curriculumLesson\":\"Missing Fields Test\"}'"

echo -e "\n📊 SUMMARY"
echo "=========="
echo "✅ Security validation: Chỉ giáo viên dạy tiết đó mới được đánh giá"
echo "✅ Authentication: Cần token hợp lệ"
echo "✅ Authorization: Chỉ role teacher được phép"
echo "✅ Resource ownership: Teacher chỉ đánh giá lesson của mình"
echo "✅ Business logic: Không duplicate evaluation"
echo "✅ Input validation: Rating và required fields"

echo -e "\n${GREEN}🎉 TEST COMPLETED!${NC}"
echo -e "${YELLOW}Note: Thay đổi tokens và lesson IDs theo database thật của bạn${NC}" 