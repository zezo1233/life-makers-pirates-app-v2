// قراءة ملف .env
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  console.log('📄 محتوى ملف .env:');
  console.log('='.repeat(50));
  
  envLines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key.trim()] = value.trim();
        
        if (key.includes('PROJECT_ID') || key.includes('ONESIGNAL')) {
          console.log(`${key.trim()}: ${value.trim()}`);
        }
      }
    }
  });
  
  console.log('\n🔍 متغيرات البيئة المحملة:');
  console.log('EXPO_PROJECT_ID:', process.env.EXPO_PROJECT_ID);
  console.log('EXPO_PUBLIC_ONESIGNAL_APP_ID:', process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID);
  
} catch (error) {
  console.error('خطأ في قراءة ملف .env:', error.message);
}
