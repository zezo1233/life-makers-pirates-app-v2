import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure notifications for WhatsApp-style experience
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface WhatsAppNotificationData {
  type: 'message' | 'typing' | 'call' | 'group_update';
  chatRoomId?: string;
  senderId?: string;
  senderName?: string;
  messageContent?: string;
  messageType?: 'text' | 'image' | 'file' | 'voice';
  isGroup?: boolean;
  groupName?: string;
  title: string;
  body: string;
  avatar?: string;
}

class WhatsAppNotificationService {
  private static instance: WhatsAppNotificationService;
  private expoPushToken: string | null = null;
  private notificationSounds = {
    message: 'whatsapp_message.mp3',
    group: 'whatsapp_group.mp3',
    call: 'whatsapp_call.mp3',
  };

  static getInstance(): WhatsAppNotificationService {
    if (!WhatsAppNotificationService.instance) {
      WhatsAppNotificationService.instance = new WhatsAppNotificationService();
    }
    return WhatsAppNotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = token.data;

      // Save token to database
      await this.savePushTokenToDatabase(this.expoPushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('WhatsApp Notification Service initialized successfully');
    } catch (error) {
      console.error('Error initializing WhatsApp notifications:', error);
    }
  }

  private async setupAndroidChannels(): Promise<void> {
    // Chat messages channel
    await Notifications.setNotificationChannelAsync('whatsapp-messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25D366',
      sound: 'default',
      description: 'New chat messages',
    });

    // Group messages channel
    await Notifications.setNotificationChannelAsync('whatsapp-groups', {
      name: 'Group Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25D366',
      sound: 'default',
      description: 'New group messages',
    });

    // Calls channel
    await Notifications.setNotificationChannelAsync('whatsapp-calls', {
      name: 'Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 1000, 500, 1000],
      lightColor: '#25D366',
      sound: 'default',
      description: 'Incoming calls',
    });
  }

  private async savePushTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token to database:', error);
    }
  }

  async sendMessageNotification(
    chatRoomId: string,
    senderId: string,
    senderName: string,
    messageContent: string,
    messageType: 'text' | 'image' | 'file' | 'voice',
    recipientIds: string[],
    isGroup: boolean = false,
    groupName?: string
  ): Promise<void> {
    const data: WhatsAppNotificationData = {
      type: 'message',
      chatRoomId,
      senderId,
      senderName,
      messageContent,
      messageType,
      isGroup,
      groupName,
      title: isGroup ? groupName || 'Group' : senderName,
      body: this.formatMessageBody(messageContent, messageType, senderName, isGroup),
    };

    await this.sendPushNotification(recipientIds, data);
  }

  private formatMessageBody(
    content: string,
    type: 'text' | 'image' | 'file' | 'voice',
    senderName: string,
    isGroup: boolean
  ): string {
    const prefix = isGroup ? `${senderName}: ` : '';
    
    switch (type) {
      case 'image':
        return `${prefix}📷 صورة`;
      case 'file':
        return `${prefix}📎 ملف`;
      case 'voice':
        return `${prefix}🎵 رسالة صوتية`;
      default:
        const truncated = content.length > 50 ? `${content.substring(0, 50)}...` : content;
        return `${prefix}${truncated}`;
    }
  }

  async sendTypingNotification(
    chatRoomId: string,
    senderName: string,
    recipientIds: string[]
  ): Promise<void> {
    // Only send typing notifications for direct chats, not groups
    const data: WhatsAppNotificationData = {
      type: 'typing',
      chatRoomId,
      senderName,
      title: senderName,
      body: 'يكتب...',
    };

    // Don't send push notifications for typing, just local
    await this.scheduleLocalNotification(data);
  }

  async sendCallNotification(
    callerId: string,
    callerName: string,
    recipientIds: string[],
    isVideo: boolean = false
  ): Promise<void> {
    const data: WhatsAppNotificationData = {
      type: 'call',
      senderId: callerId,
      senderName: callerName,
      title: callerName,
      body: isVideo ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة',
    };

    await this.sendPushNotification(recipientIds, data);
  }

  private async sendPushNotification(
    userIds: string[],
    data: WhatsAppNotificationData
  ): Promise<void> {
    try {
      // Get push tokens for users
      const { data: tokens, error } = await supabase
        .from('user_push_tokens')
        .select('push_token, user_id')
        .in('user_id', userIds);

      if (error || !tokens || tokens.length === 0) {
        console.log('No push tokens found for users');
        return;
      }

      // Prepare messages
      const messages = tokens.map(tokenData => ({
        to: tokenData.push_token,
        title: data.title,
        body: data.body,
        data: data,
        sound: 'default',
        channelId: this.getChannelId(data),
        badge: 1,
      }));

      // Send to Expo Push API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('WhatsApp notification sent:', result);
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  }

  private getChannelId(data: WhatsAppNotificationData): string {
    switch (data.type) {
      case 'message':
        return data.isGroup ? 'whatsapp-groups' : 'whatsapp-messages';
      case 'call':
        return 'whatsapp-calls';
      default:
        return 'whatsapp-messages';
    }
  }

  private async scheduleLocalNotification(data: WhatsAppNotificationData): Promise<void> {
    try {
      const notificationContent: Notifications.NotificationContentInput = {
        title: data.title,
        body: data.body,
        data: data,
        sound: 'default',
      };

      if (Platform.OS === 'android') {
        notificationContent.channelId = this.getChannelId(data);
      }

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async clearChatNotifications(chatRoomId: string): Promise<void> {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    
    for (const notification of notifications) {
      const data = notification.request.content.data as WhatsAppNotificationData;
      if (data.chatRoomId === chatRoomId) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  }

  async updateBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  // Notification listeners
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default WhatsAppNotificationService.getInstance();
