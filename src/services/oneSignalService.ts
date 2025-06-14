import { OneSignal } from 'react-native-onesignal';
import { supabase, TABLES } from '../config/supabase';
import { TrainingStatus, UserRole } from '../types';

interface OneSignalNotificationData {
  type: 'workflow' | 'chat' | 'system';
  requestId?: string;
  chatRoomId?: string;
  actionType?: string;
  targetRole?: UserRole;
}

class OneSignalNotificationService {
  private isInitialized = false;
  private appId: string;

  constructor() {
    this.appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '';
  }

  // Initialize OneSignal
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.appId) {
      console.log('OneSignal already initialized or no app ID provided');
      return;
    }

    try {
      // Check if OneSignal native module is available
      if (typeof OneSignal === 'undefined' || !OneSignal.initialize) {
        throw new Error('OneSignal native module not loaded');
      }

      // Initialize OneSignal
      OneSignal.initialize(this.appId);

      // Request notification permission
      const permission = await OneSignal.Notifications.requestPermission(true);
      console.log('OneSignal permission:', permission);

      // Set up event listeners
      this.setupEventListeners();

      // Get and save user ID
      await this.setupUserIdentification();

      this.isInitialized = true;
      console.log('OneSignal initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Handle notification received while app is open
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('OneSignal notification received in foreground:', event);
      
      // Let the notification display
      event.getNotification().display();
    });

    // Handle notification clicked
    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('OneSignal notification clicked:', event);
      this.handleNotificationClick(event);
    });

    // Handle permission changes
    OneSignal.Notifications.addEventListener('permissionChange', (granted) => {
      console.log('OneSignal permission changed:', granted);
    });
  }

  // Setup user identification
  private async setupUserIdentification(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Set external user ID
        OneSignal.login(user.id);

        // Get OneSignal player ID and save to database
        const deviceState = await OneSignal.User.getOnesignalId();
        if (deviceState) {
          await supabase
            .from(TABLES.USERS)
            .update({ 
              onesignal_player_id: deviceState,
              push_notifications_enabled: true 
            })
            .eq('id', user.id);

          console.log('OneSignal player ID saved:', deviceState);
        }
      }
    } catch (error) {
      console.error('Error setting up OneSignal user identification:', error);
    }
  }

  // Handle notification click
  private handleNotificationClick(event: any): void {
    const notification = event.getNotification();
    const data = notification.additionalData as OneSignalNotificationData;

    if (!data) return;

    // Navigate based on notification type
    switch (data.type) {
      case 'workflow':
        if (data.requestId) {
          // Navigate to training request details
          // This should be handled by navigation service
          console.log('Navigate to request:', data.requestId);
        }
        break;
      
      case 'chat':
        if (data.chatRoomId) {
          // Navigate to chat room
          console.log('Navigate to chat:', data.chatRoomId);
        }
        break;
      
      case 'system':
        // Handle system notifications
        console.log('System notification clicked');
        break;
    }
  }

  // Send workflow notification
  async sendWorkflowNotification(
    targetUserIds: string[],
    title: string,
    message: string,
    requestId: string,
    status: TrainingStatus,
    targetRole: UserRole
  ): Promise<void> {
    if (!this.isInitialized) {
      console.log('OneSignal not initialized, skipping notification');
      return;
    }

    try {
      // Get OneSignal player IDs for target users
      const { data: users } = await supabase
        .from(TABLES.USERS)
        .select('onesignal_player_id')
        .in('id', targetUserIds)
        .not('onesignal_player_id', 'is', null);

      if (!users || users.length === 0) {
        console.log('No OneSignal player IDs found for target users');
        return;
      }

      const playerIds = users
        .map(user => user.onesignal_player_id)
        .filter(Boolean);

      if (playerIds.length === 0) return;

      // Create notification data
      const notificationData: OneSignalNotificationData = {
        type: 'workflow',
        requestId,
        actionType: this.getActionType(status),
        targetRole,
      };

      // Send notification via OneSignal REST API
      await this.sendNotificationViaAPI({
        app_id: this.appId,
        include_player_ids: playerIds,
        headings: { en: title, ar: title },
        contents: { en: message, ar: message },
        data: notificationData,
        android_accent_color: 'FF667EEA',
        small_icon: 'ic_notification',
        large_icon: 'ic_launcher',
        priority: this.getPriority(status),
        android_channel_id: 'workflow_notifications',
      });

      console.log('OneSignal workflow notification sent to', playerIds.length, 'users');
    } catch (error) {
      console.error('Error sending OneSignal workflow notification:', error);
    }
  }

  // Send chat notification
  async sendChatNotification(
    targetUserIds: string[],
    senderName: string,
    message: string,
    chatRoomId: string
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const { data: users } = await supabase
        .from(TABLES.USERS)
        .select('onesignal_player_id')
        .in('id', targetUserIds)
        .not('onesignal_player_id', 'is', null);

      if (!users || users.length === 0) return;

      const playerIds = users
        .map(user => user.onesignal_player_id)
        .filter(Boolean);

      if (playerIds.length === 0) return;

      const notificationData: OneSignalNotificationData = {
        type: 'chat',
        chatRoomId,
      };

      const title = `💬 رسالة جديدة من ${senderName}`;
      const content = message.length > 100 ? `${message.substring(0, 100)}...` : message;

      await this.sendNotificationViaAPI({
        app_id: this.appId,
        include_player_ids: playerIds,
        headings: { en: title, ar: title },
        contents: { en: content, ar: content },
        data: notificationData,
        android_accent_color: 'FF28A745',
        small_icon: 'ic_notification',
        android_channel_id: 'chat_notifications',
      });

      console.log('OneSignal chat notification sent');
    } catch (error) {
      console.error('Error sending OneSignal chat notification:', error);
    }
  }

  // Send system notification
  async sendSystemNotification(
    targetUserIds: string[],
    title: string,
    message: string
  ): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const { data: users } = await supabase
        .from(TABLES.USERS)
        .select('onesignal_player_id')
        .in('id', targetUserIds)
        .not('onesignal_player_id', 'is', null);

      if (!users || users.length === 0) return;

      const playerIds = users
        .map(user => user.onesignal_player_id)
        .filter(Boolean);

      if (playerIds.length === 0) return;

      const notificationData: OneSignalNotificationData = {
        type: 'system',
      };

      await this.sendNotificationViaAPI({
        app_id: this.appId,
        include_player_ids: playerIds,
        headings: { en: title, ar: title },
        contents: { en: message, ar: message },
        data: notificationData,
        android_accent_color: 'FF6C757D',
        small_icon: 'ic_notification',
        android_channel_id: 'system_notifications',
      });

      console.log('OneSignal system notification sent');
    } catch (error) {
      console.error('Error sending OneSignal system notification:', error);
    }
  }

  // Send notification via OneSignal REST API
  private async sendNotificationViaAPI(payload: any): Promise<void> {
    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OneSignal API error: ${JSON.stringify(result)}`);
      }

      console.log('OneSignal notification sent successfully:', result);
    } catch (error) {
      console.error('OneSignal API request failed:', error);
    }
  }

  // Get action type for workflow status
  private getActionType(status: TrainingStatus): string {
    switch (status) {
      case TrainingStatus.UNDER_REVIEW:
        return 'review';
      case TrainingStatus.PENDING_SUPERVISOR_APPROVAL:
      case TrainingStatus.PENDING_FINAL_APPROVAL:
        return 'approve';
      case TrainingStatus.PENDING_TRAINER_SELECTION:
        return 'apply';
      case TrainingStatus.FINAL_APPROVED:
        return 'receive';
      default:
        return 'view';
    }
  }

  // Get notification priority
  private getPriority(status: TrainingStatus): number {
    const urgentStatuses = [
      TrainingStatus.UNDER_REVIEW,
      TrainingStatus.PENDING_SUPERVISOR_APPROVAL,
      TrainingStatus.PENDING_FINAL_APPROVAL,
    ];

    return urgentStatuses.includes(status) ? 10 : 5;
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      OneSignal.logout();
      console.log('OneSignal user logged out');
    } catch (error) {
      console.error('Error logging out OneSignal user:', error);
    }
  }

  // Check if initialized
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalNotificationService();
