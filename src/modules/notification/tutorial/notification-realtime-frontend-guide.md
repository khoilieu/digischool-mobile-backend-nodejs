# Notification Realtime - Frontend Integration

## Tổng quan
Backend đã hỗ trợ realtime notification. Khi có notification mới, backend sẽ emit event `new_notification` qua Socket.IO.

## Thay đổi chính cần làm

### 1. Kết nối Socket.IO
```javascript
import { io } from 'socket.io-client';

// Kết nối socket
const socket = io('ws://localhost:8080');

// Join user room khi user đăng nhập
socket.emit('join', userId);
```

### 2. Listen notification mới
```javascript
socket.on('new_notification', (notification) => {
  // Kiểm tra notification có dành cho user hiện tại không
  if (notification.receivers.includes(currentUserId)) {
    // Thêm vào danh sách notification
    addNotificationToList(notification);
    
    // Hiển thị toast
    showNotificationToast(notification);
    
    // Cập nhật badge count
    updateNotificationBadge();
  }
});
```

### 3. Các function cần implement

```javascript
// Thêm notification vào list
function addNotificationToList(notification) {
  setNotifications(prev => [notification, ...prev]);
}

// Hiển thị toast
function showNotificationToast(notification) {
  toast.success(notification.title, {
    description: notification.content
  });
}

// Cập nhật badge
function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.isReadBy?.includes(currentUserId)).length;
  setBadgeCount(unreadCount);
}
```

### 4. React Context (Optional)
```javascript
const NotificationContext = createContext();

export function NotificationProvider({ children, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (userId) {
      const socket = io('ws://localhost:8080');
      socket.emit('join', userId);
      
      socket.on('new_notification', (notification) => {
        if (notification.receivers.includes(userId)) {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          showNotificationToast(notification);
        }
      });
      
      return () => socket.disconnect();
    }
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

## Notification Object Structure
```javascript
{
  _id: "notification_id",
  type: "user|activity|system",
  title: "Tiêu đề",
  content: "Nội dung",
  sender: "sender_id",
  createdAt: "2024-01-01T00:00:00.000Z",
  receivers: ["user_id_1", "user_id_2"],
  relatedObject: {
    id: "related_object_id",
    requestType: "test_info"
  }
}
```

## Error Handling
```javascript
socket.on('connect_error', (error) => {
  console.error('Socket connection failed:', error);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
  setTimeout(() => socket.connect(), 5000);
});
```

## Lưu ý
- Thay đổi socket URL theo environment (dev/prod)
- Đảm bảo user đã đăng nhập trước khi join socket
- Cleanup socket listeners khi component unmount
- API endpoints vẫn hoạt động bình thường

## Test
- ✅ Tạo notification → Frontend nhận được ngay
- ✅ Multiple users → Chỉ user liên quan nhận
- ✅ Socket disconnect → Fallback polling 