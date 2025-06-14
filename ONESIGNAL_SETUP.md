# إعداد OneSignal للنظام المختلط

## 🚀 خطوات الإعداد

### 1. إنشاء حساب OneSignal

1. اذهب إلى [OneSignal.com](https://onesignal.com)
2. أنشئ حساب جديد أو سجل دخول
3. اضغط على "New App/Website"
4. اختر "Mobile App"
5. أدخل اسم التطبيق: "Life Makers Pirates Training"

### 2. إعداد Android

1. في لوحة تحكم OneSignal، اختر "Android"
2. أدخل **Package Name**: `com.lifemakerspirates.trainersapp`
3. اختر "Google Android (FCM)"
4. ستحتاج إلى **Firebase Server Key**:

#### الحصول على Firebase Server Key:
1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. أنشئ مشروع جديد أو استخدم موجود
3. اذهب إلى Project Settings > Cloud Messaging
4. انسخ **Server Key**
5. ضعه في OneSignal

### 3. إعداد iOS

1. في OneSignal، اختر "iOS"
2. أدخل **Bundle ID**: `com.lifemakerspirates.trainersapp`
3. ارفع **APNs Certificate** أو **APNs Key**

#### للحصول على APNs:
1. اذهب إلى [Apple Developer](https://developer.apple.com)
2. Certificates, Identifiers & Profiles
3. أنشئ Push Notification Certificate
4. حمل وارفع في OneSignal

### 4. الحصول على المفاتيح

بعد إعداد المنصات، ستحصل على:

1. **App ID**: `16c7d907-6165-438c-971b-d679dda2c977` (موجود)
2. **REST API Key**: من Settings > Keys & IDs

### 5. تحديث ملف .env

```env
# OneSignal Configuration
EXPO_PUBLIC_ONESIGNAL_APP_ID=16c7d907-6165-438c-971b-d679dda2c977
EXPO_PUBLIC_ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

## 🔧 إعداد التطبيق

### 1. تحديث app.json

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-onesignal",
        {
          "mode": "development"
        }
      ]
    ]
  }
}
```

### 2. إضافة الصلاحيات

في `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "NOTIFICATIONS",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "WAKE_LOCK",
        "RECEIVE_BOOT_COMPLETED"
      ]
    }
  }
}
```

## 🧪 اختبار OneSignal

### 1. اختبار من لوحة التحكم

1. اذهب إلى OneSignal Dashboard
2. اختر "Messages" > "New Push"
3. اكتب رسالة تجريبية
4. اختر "Send to Test Device"
5. أدخل Player ID للاختبار

### 2. اختبار من التطبيق

```typescript
import { oneSignalService } from './src/services/oneSignalService';

// إرسال إشعار تجريبي
await oneSignalService.sendSystemNotification(
  ['user-id-here'],
  'اختبار OneSignal',
  'هذا إشعار تجريبي من OneSignal'
);
```

## 📊 مراقبة الإشعارات

### 1. لوحة التحكم

- **Delivery Reports**: معدل التسليم
- **Click Reports**: معدل النقر
- **Device Analytics**: إحصائيات الأجهزة

### 2. في التطبيق

```typescript
// مراقبة حالة OneSignal
console.log('OneSignal Ready:', oneSignalService.isReady());

// مراقبة الإشعارات المستلمة
OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
  console.log('Notification received:', event);
});
```

## 🔒 الأمان

### 1. حماية REST API Key

- لا تضع REST API Key في الكود
- استخدم متغيرات البيئة فقط
- لا ترفع .env إلى Git

### 2. تصفية المستخدمين

```typescript
// تأكد من إرسال الإشعارات للمستخدمين المناسبين فقط
const authorizedUsers = await getAuthorizedUsers(requestId);
await oneSignalService.sendWorkflowNotification(
  authorizedUsers.map(u => u.id),
  title,
  message,
  requestId,
  status,
  role
);
```

## 🚨 استكشاف الأخطاء

### 1. الإشعارات لا تصل

- تأكد من صحة App ID و REST API Key
- تحقق من صلاحيات الإشعارات على الجهاز
- تأكد من تسجيل الجهاز بنجاح

### 2. خطأ في التهيئة

```typescript
// تحقق من حالة OneSignal
if (!oneSignalService.isReady()) {
  console.log('OneSignal not initialized');
  await oneSignalService.initialize();
}
```

### 3. مشاكل Android

- تأكد من صحة Package Name
- تحقق من Firebase Configuration
- تأكد من تفعيل FCM

### 4. مشاكل iOS

- تأكد من صحة Bundle ID
- تحقق من APNs Certificate
- تأكد من Apple Developer Account

## 📱 اختبار على الأجهزة

### Android
```bash
# تشغيل على Android
npx expo run:android

# أو
npx expo start --android
```

### iOS
```bash
# تشغيل على iOS
npx expo run:ios

# أو
npx expo start --ios
```

## 🎯 أفضل الممارسات

### 1. تخصيص الإشعارات

```typescript
// استخدم أيقونات مختلفة حسب النوع
const notificationConfig = {
  workflow: {
    icon: 'ic_workflow',
    color: '#667eea'
  },
  chat: {
    icon: 'ic_chat',
    color: '#28a745'
  }
};
```

### 2. توقيت الإشعارات

```typescript
// تجنب إرسال الإشعارات في ساعات متأخرة
const isQuietHours = (hour: number) => hour >= 22 || hour <= 7;

if (!isQuietHours(new Date().getHours())) {
  await sendNotification();
}
```

### 3. تجميع الإشعارات

```typescript
// جمع الإشعارات المتشابهة
const groupedNotifications = groupNotificationsByType(notifications);
```

---

## 📞 الدعم

للمساعدة في إعداد OneSignal:
- [OneSignal Documentation](https://documentation.onesignal.com)
- [OneSignal React Native Guide](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [Firebase Setup Guide](https://firebase.google.com/docs/android/setup)

**النظام المختلط جاهز للعمل مع OneSignal! 🎉**
