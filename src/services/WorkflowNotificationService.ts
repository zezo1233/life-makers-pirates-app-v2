import { supabase, TABLES } from '../config/supabase';
import { notificationService, NotificationData } from './NotificationService';
import { UserRole, TrainingStatus } from '../types';

/**
 * Workflow Notification Service
 * Handles all training workflow notifications
 * 
 * Features:
 * - Training request notifications
 * - Status change notifications
 * - Role-based targeting
 * - Smart message generation
 * - Automatic user discovery
 */

interface WorkflowNotificationData {
  requestId: string;
  requestTitle: string;
  newStatus: TrainingStatus;
  oldStatus?: TrainingStatus;
  specialization?: string;
  requesterName?: string;
  trainerName?: string;
}

class WorkflowNotificationService {
  private static instance: WorkflowNotificationService;

  static getInstance(): WorkflowNotificationService {
    if (!WorkflowNotificationService.instance) {
      WorkflowNotificationService.instance = new WorkflowNotificationService();
    }
    return WorkflowNotificationService.instance;
  }

  /**
   * Send notification for new training request
   */
  async sendNewTrainingRequestNotification(
    requestId: string,
    requestTitle: string,
    specialization: string,
    requesterName: string
  ): Promise<void> {
    try {
      console.log(`📝 Sending new training request notification for: ${requestTitle}`);

      // Get CC users (Development Management Officers) for first approval
      const { data: ccUsers, error } = await supabase
        .from(TABLES.USERS)
        .select('id')
        .eq('role', UserRole.DEVELOPMENT_MANAGEMENT_OFFICER);

      if (error) {
        console.error('❌ Failed to get CC users:', error);
        return;
      }

      if (!ccUsers || ccUsers.length === 0) {
        console.warn('⚠️ No CC users found for notification');
        return;
      }

      const targetUserIds = ccUsers.map(user => user.id);

      const notification: NotificationData = {
        title: '📝 طلب تدريب جديد يحتاج مراجعة',
        body: `طلب تدريب "${requestTitle}" في تخصص ${this.getSpecializationName(specialization)} من ${requesterName}`,
        type: 'training_request',
        targetUserIds,
        priority: 'high',
        actionUrl: `/training-requests/${requestId}`,
        data: {
          requestId,
          requestTitle,
          specialization,
          requesterName,
          action: 'review',
          status: 'under_review',
          // Add navigation data for OneSignal
          type: 'training_request',
          targetScreen: 'RequestDetails'
        }
      };

      await notificationService.sendNotification(notification);
      console.log(`✅ New training request notification sent to ${targetUserIds.length} CC users`);

    } catch (error) {
      console.error('❌ Failed to send new training request notification:', error);
    }
  }

  /**
   * Send notification for status change
   */
  async sendStatusChangeNotification(data: WorkflowNotificationData): Promise<void> {
    try {
      console.log(`🔄 Sending status change notification: ${data.oldStatus} → ${data.newStatus}`);

      const targetUsers = await this.getTargetUsersForStatus(data.newStatus, data);
      
      if (targetUsers.length === 0) {
        console.warn('⚠️ No target users found for status change notification');
        return;
      }

      const notification = this.createStatusChangeNotification(data, targetUsers);
      
      if (notification) {
        await notificationService.sendNotification(notification);
        console.log(`✅ Status change notification sent to ${targetUsers.length} users`);
      }

    } catch (error) {
      console.error('❌ Failed to send status change notification:', error);
    }
  }

  /**
   * Send trainer application notification
   */
  async sendTrainerApplicationNotification(
    requestId: string,
    requestTitle: string,
    trainerName: string,
    specialization: string
  ): Promise<void> {
    try {
      console.log(`👨‍🏫 Sending trainer application notification for: ${requestTitle}`);

      // Get supervisors for this specialization
      const { data: supervisors, error } = await supabase
        .from(TABLES.USERS)
        .select('id')
        .eq('role', UserRole.PROGRAM_SUPERVISOR)
        .contains('specialization', [specialization]);

      if (error) {
        console.error('❌ Failed to get supervisors:', error);
        return;
      }

      if (!supervisors || supervisors.length === 0) {
        console.warn('⚠️ No supervisors found for trainer application notification');
        return;
      }

      const targetUserIds = supervisors.map(user => user.id);

      const notification: NotificationData = {
        title: '👨‍🏫 مدرب جديد تقدم للتدريب',
        body: `${trainerName} تقدم لتدريب "${requestTitle}" في تخصص ${this.getSpecializationName(specialization)}`,
        type: 'training_request',
        targetUserIds,
        priority: 'normal',
        actionUrl: `/training-requests/${requestId}`,
        data: {
          requestId,
          requestTitle,
          trainerName,
          specialization,
          action: 'review_application',
          status: 'pending_trainer_selection',
          // Add navigation data for OneSignal
          type: 'training_request',
          targetScreen: 'RequestDetails'
        }
      };

      await notificationService.sendNotification(notification);
      console.log(`✅ Trainer application notification sent to ${targetUserIds.length} supervisors`);

    } catch (error) {
      console.error('❌ Failed to send trainer application notification:', error);
    }
  }

  /**
   * Get target users for specific status
   */
  private async getTargetUsersForStatus(
    status: TrainingStatus,
    data: WorkflowNotificationData
  ): Promise<Array<{ id: string; role: UserRole }>> {
    const targets: Array<{ id: string; role: UserRole }> = [];

    try {
      switch (status) {
        case TrainingStatus.UNDER_REVIEW:
          // Notify CC (Development Management Officers)
          const { data: ccUsers } = await supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('role', UserRole.DEVELOPMENT_MANAGEMENT_OFFICER);
          
          if (ccUsers) {
            targets.push(...ccUsers.map(user => ({ 
              id: user.id, 
              role: UserRole.DEVELOPMENT_MANAGEMENT_OFFICER 
            })));
          }
          break;

        case TrainingStatus.PENDING_SUPERVISOR_APPROVAL:
          // Notify supervisors for this specialization
          if (data.specialization) {
            const { data: supervisors } = await supabase
              .from(TABLES.USERS)
              .select('id')
              .eq('role', UserRole.PROGRAM_SUPERVISOR)
              .contains('specialization', [data.specialization]);
            
            if (supervisors) {
              targets.push(...supervisors.map(user => ({ 
                id: user.id, 
                role: UserRole.PROGRAM_SUPERVISOR 
              })));
            }
          }
          break;

        case TrainingStatus.PENDING_TRAINER_SELECTION:
          // Notify trainers for this specialization
          if (data.specialization) {
            const { data: trainers } = await supabase
              .from(TABLES.USERS)
              .select('id')
              .eq('role', UserRole.TRAINER)
              .contains('specialization', [data.specialization]);
            
            if (trainers) {
              targets.push(...trainers.map(user => ({ 
                id: user.id, 
                role: UserRole.TRAINER 
              })));
            }
          }
          break;

        case TrainingStatus.PENDING_FINAL_APPROVAL:
          // Notify Project Managers
          const { data: pms } = await supabase
            .from(TABLES.USERS)
            .select('id')
            .eq('role', UserRole.TRAINER_PREPARATION_PROJECT_MANAGER);
          
          if (pms) {
            targets.push(...pms.map(user => ({ 
              id: user.id, 
              role: UserRole.TRAINER_PREPARATION_PROJECT_MANAGER 
            })));
          }
          break;

        case TrainingStatus.FINAL_APPROVED:
          // Notify the original requester
          const { data: request } = await supabase
            .from(TABLES.TRAINING_REQUESTS)
            .select('requester_id')
            .eq('id', data.requestId)
            .single();
          
          if (request) {
            targets.push({ 
              id: request.requester_id, 
              role: UserRole.PROVINCIAL_DEVELOPMENT_OFFICER 
            });
          }
          break;

        case TrainingStatus.RECEIVED:
        case TrainingStatus.SCHEDULED:
        case TrainingStatus.COMPLETED:
        case TrainingStatus.CANCELLED:
          // Notify all involved parties
          const { data: request2 } = await supabase
            .from(TABLES.TRAINING_REQUESTS)
            .select('requester_id, assigned_trainer_id')
            .eq('id', data.requestId)
            .single();
          
          if (request2) {
            // Add requester
            targets.push({ 
              id: request2.requester_id, 
              role: UserRole.PROVINCIAL_DEVELOPMENT_OFFICER 
            });
            
            // Add trainer if assigned
            if (request2.assigned_trainer_id) {
              targets.push({ 
                id: request2.assigned_trainer_id, 
                role: UserRole.TRAINER 
              });
            }
          }
          break;
      }
    } catch (error) {
      console.error('❌ Failed to get target users:', error);
    }

    return targets;
  }

  /**
   * Create status change notification
   */
  private createStatusChangeNotification(
    data: WorkflowNotificationData,
    targetUsers: Array<{ id: string; role: UserRole }>
  ): NotificationData | null {
    const targetUserIds = targetUsers.map(user => user.id);
    const primaryRole = targetUsers[0]?.role;

    if (!primaryRole) return null;

    const statusMessages = this.getStatusMessages(data, primaryRole);
    
    if (!statusMessages) return null;

    return {
      title: statusMessages.title,
      body: statusMessages.body,
      type: 'workflow',
      targetUserIds,
      priority: statusMessages.priority || 'normal',
      actionUrl: `/training-requests/${data.requestId}`,
      data: {
        requestId: data.requestId,
        requestTitle: data.requestTitle,
        newStatus: data.newStatus,
        oldStatus: data.oldStatus,
        action: statusMessages.action,
        // Add navigation data for OneSignal
        type: 'training_request',
        targetScreen: 'RequestDetails'
      }
    };
  }

  /**
   * Get status-specific messages
   */
  private getStatusMessages(data: WorkflowNotificationData, role: UserRole): {
    title: string;
    body: string;
    priority?: 'low' | 'normal' | 'high';
    action?: string;
  } | null {
    const messages = {
      [TrainingStatus.UNDER_REVIEW]: {
        [UserRole.DEVELOPMENT_MANAGEMENT_OFFICER]: {
          title: '🔍 طلب تدريب يحتاج مراجعة',
          body: `طلب "${data.requestTitle}" في انتظار مراجعتك`,
          priority: 'high' as const,
          action: 'review'
        }
      },
      [TrainingStatus.PENDING_SUPERVISOR_APPROVAL]: {
        [UserRole.PROGRAM_SUPERVISOR]: {
          title: '✅ طلب تدريب يحتاج موافقة',
          body: `طلب "${data.requestTitle}" في انتظار موافقتك`,
          priority: 'high' as const,
          action: 'approve'
        }
      },
      [TrainingStatus.PENDING_TRAINER_SELECTION]: {
        [UserRole.TRAINER]: {
          title: '🎯 فرصة تدريب جديدة',
          body: `طلب تدريب "${data.requestTitle}" متاح للتقديم`,
          priority: 'normal' as const,
          action: 'apply'
        }
      },
      [TrainingStatus.PENDING_FINAL_APPROVAL]: {
        [UserRole.TRAINER_PREPARATION_PROJECT_MANAGER]: {
          title: '📋 طلب تدريب يحتاج موافقة نهائية',
          body: `طلب "${data.requestTitle}" في انتظار الموافقة النهائية`,
          priority: 'high' as const,
          action: 'final_approve'
        }
      },
      [TrainingStatus.FINAL_APPROVED]: {
        [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: {
          title: '🎉 تم اعتماد طلب التدريب',
          body: `طلب "${data.requestTitle}" تم اعتماده نهائياً وجاهز للاستلام`,
          priority: 'normal' as const,
          action: 'receive'
        }
      },
      [TrainingStatus.RECEIVED]: {
        [UserRole.TRAINER]: {
          title: '📅 تدريب جاهز للجدولة',
          body: `تدريب "${data.requestTitle}" تم استلامه وجاهز للجدولة`,
          priority: 'normal' as const,
          action: 'schedule'
        }
      },
      [TrainingStatus.SCHEDULED]: {
        [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: {
          title: '⏰ تدريب مجدول',
          body: `تدريب "${data.requestTitle}" تم جدولته وجاهز للتنفيذ`,
          priority: 'normal' as const,
          action: 'execute'
        },
        [UserRole.TRAINER]: {
          title: '⏰ تدريب مجدول',
          body: `تدريب "${data.requestTitle}" تم جدولته`,
          priority: 'normal' as const
        }
      },
      [TrainingStatus.COMPLETED]: {
        [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: {
          title: '✅ تم إكمال التدريب',
          body: `تدريب "${data.requestTitle}" تم إكماله بنجاح`,
          priority: 'low' as const
        },
        [UserRole.TRAINER]: {
          title: '✅ تم إكمال التدريب',
          body: `تدريب "${data.requestTitle}" تم إكماله بنجاح`,
          priority: 'low' as const
        }
      }
    };

    return messages[data.newStatus]?.[role] || null;
  }

  /**
   * Get specialization display name
   */
  private getSpecializationName(specialization: string): string {
    const names = {
      'communication': 'التواصل',
      'presentation': 'العرض والتقديم',
      'mindset': 'العقلية والتفكير',
      'teamwork': 'العمل الجماعي'
    };
    return names[specialization as keyof typeof names] || specialization;
  }
}

// Export singleton instance
export const workflowNotificationService = WorkflowNotificationService.getInstance();
