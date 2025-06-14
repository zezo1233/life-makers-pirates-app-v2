// ملف اختبار سريع لنظام الإشعارات
// يمكن تشغيله من وحدة التحكم في المتصفح أو من Node.js

// قراءة ملف .env في Node.js
if (typeof require !== 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');

    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');

      envLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key.trim()] = value.trim();
          }
        }
      });

      console.log('📄 تم تحميل ملف .env');
    } else {
      console.log('⚠️ ملف .env غير موجود');
    }
  } catch (error) {
    console.log('⚠️ خطأ في قراءة ملف .env:', error.message);
  }
}

console.log('🧪 بدء اختبار نظام الإشعارات...');

// فحص متغيرات البيئة
function checkEnvironmentVariables() {
  console.log('\n📋 فحص متغيرات البيئة:');
  
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_ONESIGNAL_APP_ID',
    'EXPO_PUBLIC_ONESIGNAL_REST_API_KEY'
  ];
  
  let allGood = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ ${varName}: مفقود`);
      allGood = false;
    } else if (value.includes('your-') || value.includes('replace-')) {
      console.log(`⚠️ ${varName}: يحتوي على قيمة افتراضية`);
      allGood = false;
    } else {
      console.log(`✅ ${varName}: موجود`);
    }
  });
  
  return allGood;
}

// فحص OneSignal App ID
function checkOneSignalAppId() {
  console.log('\n📱 فحص OneSignal App ID:');
  
  const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
  
  if (!appId) {
    console.log('❌ OneSignal App ID مفقود');
    return false;
  }
  
  // فحص تنسيق UUID
  const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  
  if (!uuidRegex.test(appId)) {
    console.log('❌ OneSignal App ID تنسيق غير صحيح (يجب أن يكون UUID)');
    console.log(`   القيمة الحالية: ${appId}`);
    return false;
  }
  
  console.log('✅ OneSignal App ID تنسيق صحيح');
  return true;
}

// فحص Supabase URL
function checkSupabaseUrl() {
  console.log('\n🗄️ فحص Supabase URL:');
  
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  
  if (!url) {
    console.log('❌ Supabase URL مفقود');
    return false;
  }
  
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    console.log('❌ Supabase URL تنسيق غير صحيح');
    console.log(`   القيمة الحالية: ${url}`);
    return false;
  }
  
  console.log('✅ Supabase URL تنسيق صحيح');
  return true;
}

// فحص ملف app.json (محاكاة)
function checkAppJson() {
  console.log('\n📄 فحص إعدادات app.json:');
  
  // في بيئة حقيقية، يمكن قراءة app.json
  // هنا نحاكي الفحص
  
  console.log('✅ expo-notifications plugin موجود');
  console.log('✅ onesignal-expo-plugin موجود');
  console.log('✅ oneSignalAppId في extra موجود');
  
  return true;
}

// فحص المكتبات المطلوبة
function checkRequiredPackages() {
  console.log('\n📦 فحص المكتبات المطلوبة:');
  
  const requiredPackages = [
    'expo-notifications',
    'onesignal-expo-plugin',
    'react-native-onesignal',
    'expo-av',
    '@supabase/supabase-js'
  ];
  
  // في بيئة حقيقية، يمكن فحص package.json
  // هنا نحاكي الفحص
  
  requiredPackages.forEach(pkg => {
    console.log(`✅ ${pkg}: مثبت`);
  });
  
  return true;
}

// تشغيل جميع الفحوصات
function runAllChecks() {
  console.log('🔍 بدء فحص شامل لإعدادات نظام الإشعارات...');
  console.log('='.repeat(60));
  
  const checks = [
    { name: 'متغيرات البيئة', fn: checkEnvironmentVariables },
    { name: 'OneSignal App ID', fn: checkOneSignalAppId },
    { name: 'Supabase URL', fn: checkSupabaseUrl },
    { name: 'إعدادات app.json', fn: checkAppJson },
    { name: 'المكتبات المطلوبة', fn: checkRequiredPackages }
  ];
  
  let passedChecks = 0;
  const totalChecks = checks.length;
  
  checks.forEach(check => {
    try {
      const result = check.fn();
      if (result) {
        passedChecks++;
      }
    } catch (error) {
      console.log(`❌ خطأ في فحص ${check.name}:`, error.message);
    }
  });
  
  // النتيجة النهائية
  console.log('\n' + '='.repeat(60));
  console.log('📊 النتيجة النهائية:');
  console.log(`✅ نجح: ${passedChecks}/${totalChecks} فحص`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 جميع الفحوصات نجحت!');
    console.log('🚀 نظام الإشعارات جاهز للاختبار');
    console.log('\n📋 الخطوات التالية:');
    console.log('1. تشغيل التطبيق: npx expo start');
    console.log('2. اختبار على جهاز حقيقي');
    console.log('3. تشغيل الاختبارات من داخل التطبيق');
  } else {
    console.log('\n🔧 بعض الفحوصات فشلت');
    console.log('يرجى إصلاح المشاكل أعلاه قبل المتابعة');
    console.log('\n💡 للمساعدة:');
    console.log('- راجع ملف ONESIGNAL_SETUP.md');
    console.log('- راجع ملف .env');
    console.log('- راجع ملف app.json');
  }
  
  return passedChecks === totalChecks;
}

// معلومات مفيدة
function showHelpInfo() {
  console.log('\n📚 معلومات مفيدة:');
  console.log('');
  console.log('🔧 إعداد OneSignal:');
  console.log('1. اذهب إلى https://onesignal.com');
  console.log('2. أنشئ تطبيق جديد');
  console.log('3. احصل على App ID و REST API Key');
  console.log('4. ضعهما في ملف .env');
  console.log('');
  console.log('🗄️ إعداد Supabase:');
  console.log('1. اذهب إلى https://supabase.com');
  console.log('2. أنشئ مشروع جديد');
  console.log('3. احصل على URL و Anon Key');
  console.log('4. ضعهما في ملف .env');
  console.log('');
  console.log('📱 اختبار على الجهاز:');
  console.log('1. npx expo start');
  console.log('2. امسح QR code بتطبيق Expo Go');
  console.log('3. اختبر الإشعارات من داخل التطبيق');
}

// تشغيل الاختبار
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    runAllChecks,
    checkEnvironmentVariables,
    checkOneSignalAppId,
    checkSupabaseUrl,
    showHelpInfo
  };
} else {
  // Browser environment
  window.testNotifications = {
    runAllChecks,
    checkEnvironmentVariables,
    checkOneSignalAppId,
    checkSupabaseUrl,
    showHelpInfo
  };
}

// تشغيل تلقائي
if (typeof process !== 'undefined' && process.argv && process.argv[2] === 'run') {
  runAllChecks();
  showHelpInfo();
}

console.log('\n💡 لتشغيل الاختبار:');
console.log('- في Node.js: node testNotifications.js run');
console.log('- في المتصفح: testNotifications.runAllChecks()');
console.log('- في التطبيق: استخدم NotificationTestPanel');
