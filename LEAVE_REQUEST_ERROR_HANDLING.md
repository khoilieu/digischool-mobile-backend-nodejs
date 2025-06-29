# Leave Request API - Error Handling Guide

## 🚨 Improved Error Handling

### 1. **403 Forbidden - Unauthorized Teacher**
**Scenario:** Teacher tries to approve/reject request for lesson they don't teach

**Request:**
```bash
curl -X POST "http://localhost:3000/api/leave-requests/675a1b2c3d4e5f6789012345/approve" \
  -H "Authorization: Bearer <wrong_teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved"}'
```

**Response:**
```json
{
  "success": false,
  "message": "You are not authorized to approve this request. Only the lesson teacher can approve."
}
```

### 2. **400 Bad Request - Already Processed**
**Scenario:** Teacher tries to approve/reject already processed request

**Request:**
```bash
curl -X POST "http://localhost:3000/api/leave-requests/675a1b2c3d4e5f6789012345/approve" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved again"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Request has already been approved"
}
```

### 3. **404 Not Found - Request Doesn't Exist**
**Scenario:** Teacher tries to process non-existent request

**Request:**
```bash
curl -X POST "http://localhost:3000/api/leave-requests/675a1b2c3d4e5f6789012999/approve" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approved"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Leave request not found"
}
```

### 4. **400 Bad Request - Missing Comment for Rejection**
**Scenario:** Teacher tries to reject without providing comment

**Request:**
```bash
curl -X POST "http://localhost:3000/api/leave-requests/675a1b2c3d4e5f6789012345/reject" \
  -H "Authorization: Bearer <teacher_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "success": false,
  "message": "Comment is required when rejecting a leave request"
}
```

## 📧 Email Notifications

### Success Response with Email Notification

**Approve Success:**
```json
{
  "success": true,
  "message": "Leave request approved successfully and notification sent to student",
  "data": {
    "_id": "675a1b2c3d4e5f6789012345",
    "studentId": {
      "_id": "675a1b2c3d4e5f6789012346",
      "name": "Nguyễn Văn A",
      "email": "student@example.com"
    },
    "status": "approved",
    "teacherComment": "Approved for family emergency",
    "approvedAt": "2024-01-15T10:30:00.000Z",
    "approvedBy": "675a1b2c3d4e5f6789012347"
  }
}
```

**Reject Success:**
```json
{
  "success": true,
  "message": "Leave request rejected successfully and notification sent to student",
  "data": {
    "_id": "675a1b2c3d4e5f6789012345",
    "studentId": {
      "_id": "675a1b2c3d4e5f6789012346",
      "name": "Nguyễn Văn A",
      "email": "student@example.com"
    },
    "status": "rejected",
    "teacherComment": "Cannot approve due to important exam",
    "approvedAt": "2024-01-15T10:30:00.000Z",
    "approvedBy": "675a1b2c3d4e5f6789012347"
  }
}
```

## 📨 Email Template Features

### Approval Email
- ✅ Green color scheme
- 📋 Complete request details
- 💬 Teacher's comment (if provided)
- 📝 Instructions for student (contact teacher for makeup lessons)
- 🕒 Timestamp

### Rejection Email
- ❌ Red color scheme
- 📋 Complete request details
- 💬 Teacher's comment (required)
- 📝 Instructions for student (must attend class)
- 🕒 Timestamp

## 🧪 Test Scenarios

### Test 1: Unauthorized Teacher
```bash
# Get a pending request ID first
REQUEST_ID=$(curl -s -X GET "http://localhost:3000/api/leave-requests/pending" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" | jq -r '.data[0]._id')

# Try to approve with different teacher token
curl -X POST "http://localhost:3000/api/leave-requests/${REQUEST_ID}/approve" \
  -H "Authorization: Bearer ${OTHER_TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Trying to approve"}' | jq
```

### Test 2: Double Processing
```bash
# Approve first
curl -X POST "http://localhost:3000/api/leave-requests/${REQUEST_ID}/approve" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "First approval"}' | jq

# Try to approve again
curl -X POST "http://localhost:3000/api/leave-requests/${REQUEST_ID}/approve" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Second approval"}' | jq
```

### Test 3: Invalid Request ID
```bash
curl -X POST "http://localhost:3000/api/leave-requests/000000000000000000000000/approve" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Approving non-existent"}' | jq
```

### Test 4: Reject Without Comment
```bash
curl -X POST "http://localhost:3000/api/leave-requests/${REQUEST_ID}/reject" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

## 🔍 Error Code Summary

| Status Code | Scenario | Message |
|-------------|----------|---------|
| `400` | Already processed | "Request has already been [approved/rejected]" |
| `400` | Missing comment for rejection | "Comment is required when rejecting a leave request" |
| `403` | Wrong teacher | "You are not authorized to [approve/reject] this request. Only the lesson teacher can [approve/reject]." |
| `404` | Request not found | "Leave request not found" |
| `500` | Server error | "Internal server error" |

## 📧 Email Notification Log

When processing requests, check server logs for email notifications:

```
✅ Leave request approved by teacher 675a1b2c3d4e5f6789012347 for student Nguyễn Văn A
📧 Email notification sent to student@example.com for approved leave request
```

```
❌ Leave request rejected by teacher 675a1b2c3d4e5f6789012347 for student Nguyễn Văn A
📧 Email notification sent to student@example.com for rejected leave request
```

If email fails (but processing succeeds):
```
✅ Leave request approved by teacher 675a1b2c3d4e5f6789012347 for student Nguyễn Văn A
❌ Failed to send email notification: Email service not configured
``` 