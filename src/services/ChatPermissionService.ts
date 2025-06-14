/**
 * 🧩 خدمة إدارة صلاحيات الدردشة
 * تطبيق قواعد الربط والصلاحيات حسب المواصفات
 */

import { supabase } from '../config/supabase';

export interface ChatPermissionRule {
  sourceRole: string;
  targetRole: string;
  chatType: 'direct' | 'group';
  requiresSameSpecialization?: boolean;
  requiresApproval?: boolean;
  isReadOnly?: boolean;
  description: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group';
  chat_type: string;
  allowed_roles?: string[];
  required_specialization?: string;
  is_read_only: boolean;
  auto_created: boolean;
  archived_at?: string;
}

export interface User {
  id: string;
  full_name: string;
  role: string;
  specialization?: string;
}

export class ChatPermissionService {
  
  /**
   * 🟦 قواعد المحادثات المباشرة (1:1 Direct Chats)
   */
  private static readonly DIRECT_CHAT_RULES: ChatPermissionRule[] = [
    {
      sourceRole: 'DV',
      targetRole: 'CC',
      chatType: 'direct',
      description: 'مسؤول التنمية بالمحافظة ↔ مسؤول إدارة التنمية'
    },
    {
      sourceRole: 'CC',
      targetRole: 'DV',
      chatType: 'direct',
      description: 'مسؤول إدارة التنمية ↔ مسؤول التنمية بالمحافظة'
    },
    {
      sourceRole: 'SV',
      targetRole: 'TR',
      chatType: 'direct',
      requiresSameSpecialization: true,
      description: 'المتابع ↔ المدرب (في نفس التخصص فقط)'
    },
    {
      sourceRole: 'TR',
      targetRole: 'SV',
      chatType: 'direct',
      requiresSameSpecialization: true,
      description: 'المدرب ↔ المتابع (في نفس التخصص فقط)'
    },
    {
      sourceRole: 'PM',
      targetRole: '*',
      chatType: 'direct',
      requiresApproval: true,
      description: 'مسؤول المشروع ↔ أي مستخدم (يتطلب موافقة)'
    }
  ];

  /**
   * 🟩 قواعد المحادثات الجماعية
   */
  private static readonly GROUP_CHAT_RULES = {
    'announcement': {
      name: 'الإعلانات الرسمية',
      allowedRoles: ['CC', 'MB', 'PM'],
      allMembers: true,
      isReadOnly: true,
      description: 'إعلانات رسمية لجميع المستخدمين'
    },
    'coordination': {
      name: 'تنسيق التنمية',
      allowedRoles: ['CC', 'DV', 'MB'],
      description: 'تنسيق إداري بين مسؤولي التنمية'
    },
    'training_team': {
      name: 'فريق التدريب',
      allowedRoles: ['TR', 'SV', 'PM', 'MB'],
      description: 'مجموعة المدربين والمتابعين'
    }
  };

  /**
   * فحص إمكانية إنشاء محادثة مباشرة
   */
  static canCreateDirectChat(
    sourceUser: User, 
    targetUser: User
  ): { allowed: boolean; reason?: string; requiresApproval?: boolean } {
    
    // فحص القواعد المباشرة
    const rule = this.DIRECT_CHAT_RULES.find(r => 
      (r.sourceRole === sourceUser.role && 
       (r.targetRole === targetUser.role || r.targetRole === '*')) ||
      (r.sourceRole === targetUser.role && r.targetRole === sourceUser.role)
    );

    if (!rule) {
      return {
        allowed: false,
        reason: 'غير مسموح بالمحادثة المباشرة بين هذين الدورين'
      };
    }

    // فحص التخصص المشترك إذا كان مطلوباً
    if (rule.requiresSameSpecialization) {
      if (!sourceUser.specialization || !targetUser.specialization) {
        return {
          allowed: false,
          reason: 'التخصص غير محدد لأحد المستخدمين'
        };
      }
      
      if (sourceUser.specialization !== targetUser.specialization) {
        return {
          allowed: false,
          reason: 'المحادثة مسموحة فقط بين نفس التخصص'
        };
      }
    }

    // فحص إذا كانت تتطلب موافقة
    if (rule.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: 'تتطلب موافقة من مسؤول المشروع'
      };
    }

    return { allowed: true };
  }

  /**
   * فحص إمكانية الانضمام لمجموعة
   */
  static canJoinGroup(user: User, groupType: string): boolean {
    const groupRule = this.GROUP_CHAT_RULES[groupType as keyof typeof this.GROUP_CHAT_RULES];
    
    if (!groupRule) return false;
    
    if (groupRule.allMembers) return true;
    
    return groupRule.allowedRoles.includes(user.role);
  }

  /**
   * فحص إمكانية الإرسال في مجموعة
   */
  static canSendInGroup(user: User, groupType: string): boolean {
    const groupRule = this.GROUP_CHAT_RULES[groupType as keyof typeof this.GROUP_CHAT_RULES];
    
    if (!groupRule) return false;
    
    // إذا كانت المجموعة للقراءة فقط، فحص الأدوار المسموحة
    if (groupRule.isReadOnly) {
      return groupRule.allowedRoles.includes(user.role);
    }
    
    // إذا لم تكن للقراءة فقط، يمكن لجميع الأعضاء الإرسال
    return this.canJoinGroup(user, groupType);
  }

  /**
   * إنشاء محادثة مباشرة تلقائية
   */
  static async createAutoDirectChat(user1: User, user2: User): Promise<string | null> {
    try {
      // فحص الصلاحيات
      const permission = this.canCreateDirectChat(user1, user2);
      if (!permission.allowed || permission.requiresApproval) {
        return null;
      }

      // فحص إذا كانت المحادثة موجودة
      const { data: existingChat } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('type', 'direct')
        .eq('chat_type', 'auto_direct')
        .in('id', 
          supabase
            .from('chat_participants')
            .select('chat_room_id')
            .in('user_id', [user1.id, user2.id])
        );

      if (existingChat && existingChat.length > 0) {
        return existingChat[0].id;
      }

      // إنشاء محادثة جديدة
      const { data: newChat, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: `${user1.full_name} ↔ ${user2.full_name}`,
          description: 'محادثة مباشرة تلقائية',
          type: 'direct',
          chat_type: 'auto_direct',
          auto_created: true,
          created_by: user1.id
        })
        .select('id')
        .single();

      if (error || !newChat) {
        console.error('خطأ في إنشاء المحادثة:', error);
        return null;
      }

      // إضافة المشاركين
      await supabase
        .from('chat_participants')
        .insert([
          { chat_room_id: newChat.id, user_id: user1.id },
          { chat_room_id: newChat.id, user_id: user2.id }
        ]);

      return newChat.id;
    } catch (error) {
      console.error('خطأ في إنشاء المحادثة التلقائية:', error);
      return null;
    }
  }

  /**
   * طلب إنشاء محادثة (للحالات التي تتطلب موافقة)
   */
  static async requestChatPermission(
    requester: User,
    target: User,
    reason?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_requests')
        .insert({
          requester_id: requester.id,
          target_user_id: target.id,
          request_type: 'direct_chat',
          reason: reason || 'طلب محادثة مباشرة',
          status: 'pending'
        });

      if (error) {
        console.error('خطأ في إرسال طلب المحادثة:', error);
        return false;
      }

      // إرسال إشعار لمسؤول المشروع
      await this.notifyProjectManager(requester, target, reason);
      
      return true;
    } catch (error) {
      console.error('خطأ في طلب المحادثة:', error);
      return false;
    }
  }

  /**
   * إشعار مسؤول المشروع بطلب محادثة
   */
  private static async notifyProjectManager(
    requester: User,
    target: User,
    reason?: string
  ): Promise<void> {
    try {
      // جلب مسؤولي المشروع
      const { data: projectManagers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'PM');

      if (!projectManagers || projectManagers.length === 0) return;

      // إنشاء إشعارات
      const notifications = projectManagers.map(pm => ({
        user_id: pm.id,
        notification_type: 'chat_request',
        title: 'طلب محادثة جديد',
        content: `${requester.full_name} يطلب محادثة مع ${target.full_name}. السبب: ${reason || 'غير محدد'}`
      }));

      await supabase
        .from('chat_notifications')
        .insert(notifications);
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
    }
  }

  /**
   * جلب المحادثات المتاحة للمستخدم
   */
  static async getAvailableChats(user: User): Promise<ChatRoom[]> {
    try {
      const { data: chats, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id)
        `)
        .eq('chat_participants.user_id', user.id)
        .is('archived_at', null);

      if (error) {
        console.error('خطأ في جلب المحادثات:', error);
        return [];
      }

      return chats || [];
    } catch (error) {
      console.error('خطأ في جلب المحادثات المتاحة:', error);
      return [];
    }
  }

  /**
   * إنشاء المحادثات الأساسية للمستخدم الجديد
   */
  static async setupUserChats(user: User): Promise<void> {
    try {
      // إضافة للمجموعة العامة
      await this.addUserToAnnouncementGroup(user);
      
      // إضافة للمجموعات حسب الدور
      await this.addUserToRoleGroups(user);
      
      // إنشاء المحادثات المباشرة التلقائية
      await this.createAutoDirectChatsForUser(user);
    } catch (error) {
      console.error('خطأ في إعداد محادثات المستخدم:', error);
    }
  }

  private static async addUserToAnnouncementGroup(user: User): Promise<void> {
    const { data: announcementGroup } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('chat_type', 'announcement')
      .single();

    if (announcementGroup) {
      await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: announcementGroup.id,
          user_id: user.id
        });
    }
  }

  private static async addUserToRoleGroups(user: User): Promise<void> {
    const groupMappings = {
      'CC': ['coordination'],
      'DV': ['coordination'],
      'MB': ['coordination', 'training_team'],
      'TR': ['training_team'],
      'SV': ['training_team'],
      'PM': ['training_team']
    };

    const userGroups = groupMappings[user.role as keyof typeof groupMappings] || [];
    
    for (const groupType of userGroups) {
      const { data: group } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('chat_type', groupType)
        .single();

      if (group) {
        await supabase
          .from('chat_participants')
          .insert({
            chat_room_id: group.id,
            user_id: user.id
          });
      }
    }
  }

  private static async createAutoDirectChatsForUser(user: User): Promise<void> {
    // إنشاء محادثات مباشرة حسب الدور
    if (user.role === 'DV') {
      // إنشاء محادثة مع جميع مسؤولي الإدارة
      const { data: ccUsers } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'CC');

      if (ccUsers) {
        for (const ccUser of ccUsers) {
          await this.createAutoDirectChat(user, ccUser);
        }
      }
    }
  }
}

export default ChatPermissionService;
