import { supabase, TABLES } from '../config/supabase';
import { UserRole, User } from '../types';

export interface ChatPermission {
  canChat: boolean;
  reason?: string;
  allowedUsers?: string[];
}

export interface GroupChatInfo {
  id: string;
  name: string;
  description: string;
  allowedRoles: UserRole[];
  isOfficial: boolean;
}

export class RestrictedChatService {
  private static instance: RestrictedChatService;

  // Predefined group chats
  private readonly groupChats: GroupChatInfo[] = [
    {
      id: 'general_announcements',
      name: 'الإعلانات العامة',
      description: 'للإعلانات الرسمية فقط',
      allowedRoles: [
        UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
        UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
        UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
        UserRole.PROGRAM_SUPERVISOR,
        UserRole.TRAINER,
        UserRole.BOARD_MEMBER
      ],
      isOfficial: true
    },
    {
      id: 'coordination_group',
      name: 'مجموعة التنسيق العام',
      description: 'تنسيق الأعمال والنقاشات العامة',
      allowedRoles: [
        UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
        UserRole.BOARD_MEMBER,
        UserRole.PROVINCIAL_DEVELOPMENT_OFFICER
      ],
      isOfficial: false
    },
    {
      id: 'trainers_group',
      name: 'مجموعة المدربين',
      description: 'تنسيق أعمال التدريب والنقاشات المهنية',
      allowedRoles: [
        UserRole.TRAINER,
        UserRole.PROGRAM_SUPERVISOR,
        UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
        UserRole.BOARD_MEMBER
      ],
      isOfficial: false
    }
  ];

  static getInstance(): RestrictedChatService {
    if (!RestrictedChatService.instance) {
      RestrictedChatService.instance = new RestrictedChatService();
    }
    return RestrictedChatService.instance;
  }

  // Check if direct chat is allowed between two users
  async canDirectChat(user1Id: string, user2Id: string): Promise<ChatPermission> {
    try {
      // Get both users' information
      const { data: users, error } = await supabase
        .from(TABLES.USERS)
        .select('id, role, specialization')
        .in('id', [user1Id, user2Id]);

      if (error || !users || users.length !== 2) {
        return { canChat: false, reason: 'خطأ في جلب بيانات المستخدمين' };
      }

      const user1 = users.find(u => u.id === user1Id);
      const user2 = users.find(u => u.id === user2Id);

      if (!user1 || !user2) {
        return { canChat: false, reason: 'مستخدم غير موجود' };
      }

      return this.checkDirectChatRules(user1, user2);
    } catch (error) {
      console.error('Error checking chat permission:', error);
      return { canChat: false, reason: 'خطأ في النظام' };
    }
  }

  // Check group chat permissions
  canJoinGroupChat(userRole: UserRole, groupId: string): ChatPermission {
    const group = this.groupChats.find(g => g.id === groupId);
    
    if (!group) {
      return { canChat: false, reason: 'المجموعة غير موجودة' };
    }

    const canJoin = group.allowedRoles.includes(userRole);
    
    return {
      canChat: canJoin,
      reason: canJoin ? undefined : 'ليس لديك صلاحية للانضمام لهذه المجموعة'
    };
  }

  // Get available group chats for user
  getAvailableGroupChats(userRole: UserRole): GroupChatInfo[] {
    return this.groupChats.filter(group => 
      group.allowedRoles.includes(userRole)
    );
  }

  // Get users that current user can chat with directly
  async getDirectChatableUsers(currentUserId: string): Promise<User[]> {
    try {
      const { data: currentUser } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (!currentUser) return [];

      // Get all users
      const { data: allUsers } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .neq('id', currentUserId);

      if (!allUsers) return [];

      const chatableUsers: User[] = [];

      for (const user of allUsers) {
        const permission = this.checkDirectChatRules(currentUser, user);
        if (permission.canChat) {
          chatableUsers.push(user);
        }
      }

      return chatableUsers;
    } catch (error) {
      console.error('Error getting chatable users:', error);
      return [];
    }
  }

  // Create or get existing chat room
  async getOrCreateChatRoom(user1Id: string, user2Id: string, type: 'direct' | 'group' = 'direct'): Promise<string | null> {
    try {
      if (type === 'direct') {
        // Check permission first
        const permission = await this.canDirectChat(user1Id, user2Id);
        if (!permission.canChat) {
          throw new Error(permission.reason || 'غير مسموح بالمحادثة');
        }
      }

      // Check if chat room already exists
      const { data: existingRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('type', type)
        .contains('participants', [user1Id, user2Id])
        .single();

      if (existingRoom) {
        return existingRoom.id;
      }

      // Create new chat room
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert([{
          name: type === 'direct' ? 'محادثة مباشرة' : 'محادثة جماعية',
          type,
          participants: [user1Id, user2Id],
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return newRoom?.id || null;
    } catch (error) {
      console.error('Error creating chat room:', error);
      return null;
    }
  }

  // Create group chat room
  async createGroupChatRoom(groupId: string, creatorId: string): Promise<string | null> {
    try {
      const group = this.groupChats.find(g => g.id === groupId);
      if (!group) {
        throw new Error('مجموعة غير موجودة');
      }

      // Get all users with allowed roles
      const { data: users } = await supabase
        .from(TABLES.USERS)
        .select('id')
        .in('role', group.allowedRoles);

      if (!users) {
        throw new Error('لا يوجد مستخدمون مؤهلون');
      }

      const participants = users.map(u => u.id);

      // Create group chat room
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert([{
          id: groupId,
          name: group.name,
          type: 'group',
          participants,
          created_by: creatorId,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return newRoom?.id || null;
    } catch (error) {
      console.error('Error creating group chat room:', error);
      return null;
    }
  }

  // Private helper methods
  private checkDirectChatRules(user1: any, user2: any): ChatPermission {
    const role1 = user1.role as UserRole;
    const role2 = user2.role as UserRole;

    // Rule 1: DV ↔ CC only
    if (role1 === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER && role2 === UserRole.DEVELOPMENT_MANAGEMENT_OFFICER) {
      return { canChat: true };
    }
    if (role1 === UserRole.DEVELOPMENT_MANAGEMENT_OFFICER && role2 === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER) {
      return { canChat: true };
    }

    // Rule 2: SV ↔ TR (same specialization only)
    if (role1 === UserRole.PROGRAM_SUPERVISOR && role2 === UserRole.TRAINER) {
      return this.checkSpecializationMatch(user1, user2);
    }
    if (role1 === UserRole.TRAINER && role2 === UserRole.PROGRAM_SUPERVISOR) {
      return this.checkSpecializationMatch(user1, user2);
    }

    // No other direct chats allowed
    return { 
      canChat: false, 
      reason: 'المحادثات المباشرة محدودة حسب الأدوار والتخصصات' 
    };
  }

  private checkSpecializationMatch(supervisor: any, trainer: any): ChatPermission {
    try {
      // Parse supervisor specializations
      const supervisorSpecs = this.parseSpecializations(supervisor.specialization);
      
      // Parse trainer specializations  
      const trainerSpecs = this.parseSpecializations(trainer.specialization);

      // Check if there's any overlap
      const hasCommonSpec = supervisorSpecs.some(spec => 
        trainerSpecs.includes(spec)
      );

      if (hasCommonSpec) {
        return { canChat: true };
      } else {
        return { 
          canChat: false, 
          reason: 'المحادثة مسموحة فقط بين المتابع والمدرب في نفس التخصص' 
        };
      }
    } catch (error) {
      return { 
        canChat: false, 
        reason: 'خطأ في التحقق من التخصصات' 
      };
    }
  }

  private parseSpecializations(specialization: any): string[] {
    if (!specialization) return [];
    
    if (Array.isArray(specialization)) {
      return specialization;
    }
    
    if (typeof specialization === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(specialization.replace(/'/g, '"'));
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not JSON, treat as single specialization
        return [specialization];
      }
    }
    
    return [];
  }

  // Get chat restrictions info for UI
  getChatRestrictionsInfo(userRole: UserRole): {
    directChatRules: string[];
    groupChatRules: string[];
    availableGroups: string[];
  } {
    const directChatRules: string[] = [];
    const groupChatRules: string[] = [];

    // Direct chat rules based on role
    switch (userRole) {
      case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
        directChatRules.push('يمكنك المحادثة المباشرة مع مسؤول إدارة التنمية فقط');
        break;
      case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
        directChatRules.push('يمكنك المحادثة المباشرة مع مسؤولي تنمية المحافظات فقط');
        break;
      case UserRole.PROGRAM_SUPERVISOR:
        directChatRules.push('يمكنك المحادثة المباشرة مع المدربين في نفس تخصصك فقط');
        break;
      case UserRole.TRAINER:
        directChatRules.push('يمكنك المحادثة المباشرة مع المتابعين في نفس تخصصك فقط');
        break;
      default:
        directChatRules.push('المحادثات المباشرة غير متاحة لدورك الحالي');
    }

    // Group chat rules
    const availableGroups = this.getAvailableGroupChats(userRole);
    availableGroups.forEach(group => {
      groupChatRules.push(`${group.name}: ${group.description}`);
    });

    return {
      directChatRules,
      groupChatRules,
      availableGroups: availableGroups.map(g => g.name)
    };
  }
}

export const restrictedChatService = RestrictedChatService.getInstance();
