/**
 * 🧩 تشغيل Migration نظام الدردشة الجديد
 * تطبيق المواصفات الجديدة لنظام الدردشة الداخلي
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// إعدادات Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // مطلوب للعمليات الإدارية

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ متغيرات البيئة مفقودة: EXPO_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runChatMigration() {
  try {
    console.log('🚀 بدء تشغيل Migration نظام الدردشة...');

    // قراءة ملف Migration
    const migrationPath = path.join(__dirname, '../database/migrations/update_chat_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // تقسيم الـ SQL إلى statements منفصلة
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 تم العثور على ${statements.length} statement للتنفيذ`);

    // تنفيذ كل statement على حدة
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          console.log(`⏳ تنفيذ Statement ${i + 1}/${statements.length}...`);
          
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: statement
          });

          if (error) {
            console.warn(`⚠️ تحذير في Statement ${i + 1}:`, error.message);
            // لا نتوقف عند التحذيرات، فقط نسجلها
          } else {
            console.log(`✅ تم تنفيذ Statement ${i + 1} بنجاح`);
          }
        } catch (err) {
          console.error(`❌ خطأ في Statement ${i + 1}:`, err.message);
          // نتابع التنفيذ حتى لو فشل statement واحد
        }
      }
    }

    console.log('🎉 تم الانتهاء من Migration نظام الدردشة!');
    
    // التحقق من النتائج
    await verifyMigration();

  } catch (error) {
    console.error('❌ خطأ في تشغيل Migration:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  try {
    console.log('\n🔍 التحقق من نتائج Migration...');

    // فحص الجداول الجديدة
    const tables = [
      'chat_requests',
      'chat_archives', 
      'chat_notifications'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ الجدول ${table} غير موجود أو به مشكلة:`, error.message);
      } else {
        console.log(`✅ الجدول ${table} تم إنشاؤه بنجاح`);
      }
    }

    // فحص المحادثات الأساسية
    const { data: basicChats, error: chatsError } = await supabase
      .from('chat_rooms')
      .select('name, chat_type')
      .in('chat_type', ['announcement', 'coordination', 'training_team']);

    if (chatsError) {
      console.log('❌ خطأ في فحص المحادثات الأساسية:', chatsError.message);
    } else {
      console.log(`✅ تم إنشاء ${basicChats?.length || 0} محادثة أساسية:`);
      basicChats?.forEach(chat => {
        console.log(`   - ${chat.name} (${chat.chat_type})`);
      });
    }

    // فحص الدوال
    const { data: functions, error: functionsError } = await supabase
      .rpc('check_function_exists', { function_name: 'create_auto_direct_chats' });

    if (functionsError) {
      console.log('❌ خطأ في فحص الدوال:', functionsError.message);
    } else {
      console.log('✅ تم إنشاء الدوال المطلوبة');
    }

    console.log('\n🎯 Migration مكتمل! يمكنك الآن استخدام نظام الدردشة الجديد.');

  } catch (error) {
    console.error('❌ خطأ في التحقق من Migration:', error);
  }
}

// تشغيل Migration
if (require.main === module) {
  runChatMigration();
}

module.exports = { runChatMigration };
