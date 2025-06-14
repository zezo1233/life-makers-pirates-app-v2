-- تحديث نظام الدردشة حسب المواصفات الجديدة
-- 🧩 مواصفات نظام الدردشة الداخلي

-- 1. تحديث جدول chat_rooms لدعم القواعد الجديدة
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS chat_type VARCHAR(20) DEFAULT 'group';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS allowed_roles TEXT[];
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS required_specialization VARCHAR(50);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN DEFAULT false;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS auto_created BOOLEAN DEFAULT false;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- 2. إنشاء جدول لطلبات التواصل
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    request_type VARCHAR(20) NOT NULL, -- 'direct_chat', 'group_join'
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP
);

-- 3. إنشاء جدول لتتبع المحادثات المؤرشفة
CREATE TABLE IF NOT EXISTS chat_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    archived_by UUID REFERENCES users(id) ON DELETE SET NULL,
    archive_reason VARCHAR(100),
    archived_at TIMESTAMP DEFAULT NOW(),
    can_restore BOOLEAN DEFAULT true
);

-- 4. إنشاء جدول للإشعارات الذكية
CREATE TABLE IF NOT EXISTS chat_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL, -- 'new_message', 'daily_update', 'admin_announcement'
    title VARCHAR(200),
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- 5. إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(chat_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_specialization ON chat_rooms(required_specialization);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests(status);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user ON chat_notifications(user_id, is_read);

-- 6. إنشاء المحادثات الأساسية المطلوبة
-- 🔊 المجموعة العامة للإعلانات
INSERT INTO chat_rooms (
    id, name, description, type, chat_type, 
    allowed_roles, is_read_only, auto_created, created_by
) VALUES (
    gen_random_uuid(),
    'الإعلانات الرسمية',
    'إعلانات رسمية لجميع المستخدمين - قراءة فقط',
    'group',
    'announcement',
    ARRAY['CC', 'MB', 'PM'],
    true,
    true,
    (SELECT id FROM users WHERE role = 'MB' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- 🛠 مجموعة التنسيق الإداري
INSERT INTO chat_rooms (
    id, name, description, type, chat_type,
    allowed_roles, auto_created, created_by
) VALUES (
    gen_random_uuid(),
    'تنسيق التنمية',
    'تنسيق إداري بين مسؤولي التنمية والإدارة المركزية',
    'group',
    'coordination',
    ARRAY['CC', 'DV', 'MB'],
    false,
    true,
    (SELECT id FROM users WHERE role = 'CC' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- 🧑‍🏫 مجموعة فريق التدريب
INSERT INTO chat_rooms (
    id, name, description, type, chat_type,
    allowed_roles, auto_created, created_by
) VALUES (
    gen_random_uuid(),
    'فريق التدريب',
    'مجموعة المدربين والمتابعين لتنسيق التدريب',
    'group',
    'training_team',
    ARRAY['TR', 'SV', 'PM', 'MB'],
    false,
    true,
    (SELECT id FROM users WHERE role = 'PM' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- 7. إضافة جميع المستخدمين للمجموعة العامة
INSERT INTO chat_participants (chat_room_id, user_id, joined_at)
SELECT 
    (SELECT id FROM chat_rooms WHERE name = 'الإعلانات الرسمية' LIMIT 1),
    u.id,
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_room_id = (SELECT id FROM chat_rooms WHERE name = 'الإعلانات الرسمية' LIMIT 1)
    AND cp.user_id = u.id
);

-- 8. إضافة المستخدمين المناسبين لمجموعة التنسيق
INSERT INTO chat_participants (chat_room_id, user_id, joined_at)
SELECT 
    (SELECT id FROM chat_rooms WHERE name = 'تنسيق التنمية' LIMIT 1),
    u.id,
    NOW()
FROM users u
WHERE u.role IN ('CC', 'DV', 'MB')
AND NOT EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_room_id = (SELECT id FROM chat_rooms WHERE name = 'تنسيق التنمية' LIMIT 1)
    AND cp.user_id = u.id
);

-- 9. إضافة المستخدمين المناسبين لمجموعة التدريب
INSERT INTO chat_participants (chat_room_id, user_id, joined_at)
SELECT 
    (SELECT id FROM chat_rooms WHERE name = 'فريق التدريب' LIMIT 1),
    u.id,
    NOW()
FROM users u
WHERE u.role IN ('TR', 'SV', 'PM', 'MB')
AND NOT EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_room_id = (SELECT id FROM chat_rooms WHERE name = 'فريق التدريب' LIMIT 1)
    AND cp.user_id = u.id
);

-- 10. إنشاء دالة لإنشاء المحادثات المباشرة التلقائية
CREATE OR REPLACE FUNCTION create_auto_direct_chats()
RETURNS void AS $$
DECLARE
    dv_user RECORD;
    cc_user RECORD;
    chat_room_id UUID;
BEGIN
    -- إنشاء محادثات مباشرة بين كل DV و CC
    FOR dv_user IN SELECT id, full_name FROM users WHERE role = 'DV' LOOP
        FOR cc_user IN SELECT id, full_name FROM users WHERE role = 'CC' LOOP
            -- فحص إذا كانت المحادثة موجودة
            SELECT id INTO chat_room_id
            FROM chat_rooms cr
            WHERE cr.type = 'direct'
            AND cr.chat_type = 'dv_cc_direct'
            AND EXISTS (
                SELECT 1 FROM chat_participants cp1 
                WHERE cp1.chat_room_id = cr.id AND cp1.user_id = dv_user.id
            )
            AND EXISTS (
                SELECT 1 FROM chat_participants cp2 
                WHERE cp2.chat_room_id = cr.id AND cp2.user_id = cc_user.id
            );
            
            -- إنشاء المحادثة إذا لم تكن موجودة
            IF chat_room_id IS NULL THEN
                INSERT INTO chat_rooms (
                    id, name, description, type, chat_type,
                    auto_created, created_by
                ) VALUES (
                    gen_random_uuid(),
                    dv_user.full_name || ' ↔ ' || cc_user.full_name,
                    'محادثة مباشرة بين مسؤول التنمية ومسؤول الإدارة',
                    'direct',
                    'dv_cc_direct',
                    true,
                    cc_user.id
                ) RETURNING id INTO chat_room_id;
                
                -- إضافة المشاركين
                INSERT INTO chat_participants (chat_room_id, user_id, joined_at)
                VALUES 
                    (chat_room_id, dv_user.id, NOW()),
                    (chat_room_id, cc_user.id, NOW());
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الدالة لإنشاء المحادثات التلقائية
SELECT create_auto_direct_chats();

-- 11. إنشاء دالة للأرشفة التلقائية
CREATE OR REPLACE FUNCTION auto_archive_inactive_chats()
RETURNS void AS $$
BEGIN
    -- أرشفة المحادثات غير النشطة لأكثر من 30 يوم
    UPDATE chat_rooms 
    SET archived_at = NOW()
    WHERE archived_at IS NULL
    AND auto_created = false
    AND updated_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM chat_messages cm 
        WHERE cm.chat_room_id = chat_rooms.id 
        AND cm.created_at > NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql;

-- 12. إنشاء مشغل للتحديث التلقائي
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_rooms 
    SET updated_at = NOW() 
    WHERE id = NEW.chat_room_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل
DROP TRIGGER IF EXISTS trigger_update_chat_timestamp ON chat_messages;
CREATE TRIGGER trigger_update_chat_timestamp
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_room_timestamp();

COMMIT;
