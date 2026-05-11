# OMEGA Restaurant App

تطبيق إدارة مطعم متكامل (للزبون، السائق، وصاحب المطعم) مبني باستخدام:
- React + Vite
- Tailwind CSS v4
- Firebase (Auth, Firestore, Storage)
- Node.js (Backend للذكاء الاصطناعي OpenRouter)

## التشغيل المحلي (Development)

لتشغيل المشروع على جهازك:

1. تثبيت الحزم:
```bash
npm install
```

2. تشغيل التطبيق (الواجهة الأمامية):
```bash
npm run dev
```

3. تشغيل السيرفر الخلفي (الذكاء الاصطناعي):
```bash
npm run server
```

## بناء المشروع (Production Build)

لإنتاج نسخة جاهزة للرفع:
```bash
npm run build
```

## أوامر النشر (Firebase Deployment)

تأكد من تسجيل الدخول إلى Firebase CLI أولاً:
```bash
firebase login
firebase init
```

### 1. نشر قواعد الأمان فقط (Firestore & Storage Rules):
هذه الخطوة مهمة جداً لحماية البيانات بناءً على الأدوار (Admin, Driver, Customer):
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 2. نشر فهارس البحث (Firestore Indexes):
```bash
firebase deploy --only firestore:indexes
```

### 3. رفع التطبيق للاستضافة (Hosting):
بعد عمل `npm run build`:
```bash
firebase deploy --only hosting
```

---

⚠️ **ملاحظة هامة للمدير (Admin)**:
قبل النشر، تأكد من وجود مستخدم في قاعدة بيانات `Firestore` (مجموعة `users`) يملك الخاصية التالية حتى يتمكن من إدارة التطبيق:
```json
{
  "role": "admin"
}
```
لا تجعل المستخدمين العاديين قادرين على جعل أنفسهم مدراء أبداً!
