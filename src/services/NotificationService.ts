import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { enhancedOneSignalService } from './enhancedOneSignalService';
import { UserRole, TrainingStatus } from '../types';

/**
 * Perfect Notification System
 * Simple, Reliable, Powerful
 * 
 * Features:
 * - OneSignal for push notifications (works outside app)
 * - Supabase for data storage and real-time updates
 * - Clean, maintainable code
 * - Comprehensive error handling
 * - Type-safe interfaces
 */

// Core interfaces
export interface NotificationData {
  title: string;
  body: string;
  type: 'training_request' | 'workflow' | 'chat' | 'system';
  targetUserIds: string[];
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  actionUrl?: string;
}

export interface NotificationRecord {
  id?: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface NotificationResult {
  success: boolean;
  method: 'onesignal' | 'database' | 'both';
  details: string;
  notificationIds?: string[];
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  workflowUpdates: boolean;
  chatMessages: boolean;
  reminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: {
    urgent: boolean;
    normal: boolean;
    info: boolean;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private readonly PREFERENCES_KEY = 'notification_preferences';

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📱 Notification service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Perfect Notification Service...');

      // Initialize OneSignal
      await enhancedOneSignalService.initialize();
      
      this.isInitialized = true;
      
      console.log('✅ Perfect Notification Service initialized successfully');
      this.logSystemStatus();
      
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Send notification using the perfect system
   */
  async sendNotification(notification: NotificationData): Promise<NotificationResult> {
    try {
      console.log(`📤 Sending notification: "${notification.title}" to ${notification.targetUserIds.length} users`);

      const results = await Promise.allSettled([
        this.sendPushNotification(notification),
        this.saveToDatabase(notification)
      ]);

      const pushResult = results[0];
      const dbResult = results[1];

      const pushSuccess = pushResult.status === 'fulfilled' && pushResult.value;
      const dbSuccess = dbResult.status === 'fulfilled' && dbResult.value.length > 0;

      let method: 'onesignal' | 'database' | 'both';
      let details: string;
      let notificationIds: string[] = [];

      if (pushSuccess && dbSuccess) {
        method = 'both';
        details = `Push notification sent + Database saved (${dbResult.status === 'fulfilled' ? dbResult.value.length : 0} records)`;
        if (dbResult.status === 'fulfilled') {
          notificationIds = dbResult.value;
        }
      } else if (pushSuccess) {
        method = 'onesignal';
        details = 'Push notification sent successfully';
      } else if (dbSuccess) {
        method = 'database';
        details = `Database saved (${dbResult.status === 'fulfilled' ? dbResult.value.length : 0} records)`;
        if (dbResult.status === 'fulfilled') {
          notificationIds = dbResult.value;
        }
      } else {
        throw new Error('Both push notification and database save failed');
      }

      console.log(`✅ Notification sent successfully via ${method}`);

      return {
        success: true,
        method,
        details,
        notificationIds
      };

    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return {
        success: false,
        method: 'database',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Send push notification via OneSignal
   */
  private async sendPushNotification(notification: NotificationData): Promise<boolean> {
    try {
      // Skip OneSignal on simulator
      if (!Device.isDevice) {
        console.log('📱 Skipping OneSignal (simulator detected)');
        return false;
      }

      const success = await enhancedOneSignalService.sendNotificationToUsers(
        notification.targetUserIds,
        notification.title,
        notification.body,
        {
          type: notification.type,
          priority: notification.priority || 'normal',
          actionUrl: notification.actionUrl,
          ...notification.data
        }
      );

      if (success) {
        console.log('🔔 OneSignal push notification sent successfully');
      } else {
        console.warn('⚠️ OneSignal push notification failed');
      }

      return success;
    } catch (error) {
      console.error('❌ OneSignal error:', error);
      return false;
    }
  }

  /**
   * Save notification to Supabase database
   */
  private async saveToDatabase(notification: NotificationData): Promise<string[]> {
    try {
      const records: Omit<NotificationRecord, 'id'>[] = notification.targetUserIds.map(userId => ({
        user_id: userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: {
          ...notification.data,
          actionUrl: notification.actionUrl // Store actionUrl in data field instead
        },
        is_read: false,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        priority: notification.priority || 'normal'
      }));

      console.log(`💾 Saving ${records.length} notifications to database...`);

      const { data, error } = await supabase
        .from('notifications')
        .insert(records)
        .select('id');

      if (error) {
        console.error('❌ Database save error:', error);
        throw error;
      }

      const ids = data?.map(record => record.id) || [];
      console.log(`✅ Saved ${ids.length} notifications to database`);

      return ids;
    } catch (error) {
      console.error('❌ Database save failed:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<NotificationRecord[]> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Get notifications error:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Failed to mark notification as read:', error);
        return false;
      }

      console.log('✅ Notification marked as read');
      return true;
    } catch (error) {
      console.error('❌ Mark as read error:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Failed to mark all notifications as read:', error);
        return false;
      }

      console.log('✅ All notifications marked as read');
      return true;
    } catch (error) {
      console.error('❌ Mark all as read error:', error);
      return false;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Delete old notifications (cleanup)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');

      if (error) {
        console.error('❌ Failed to cleanup old notifications:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${deletedCount} old notifications`);

      return deletedCount;
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return 0;
    }
  }

  /**
   * Log system status
   */
  private logSystemStatus(): void {
    const oneSignalStatus = enhancedOneSignalService.getStatus();
    
    console.log('📊 Perfect Notification System Status:');
    console.log(`  🔔 OneSignal: ${oneSignalStatus.isInitialized && Device.isDevice ? '✅ Ready' : '⚠️ Limited (Simulator)'}`);
    console.log(`  💾 Supabase: ✅ Ready`);
    console.log(`  📱 Device: ${Device.isDevice ? 'Physical' : 'Simulator'}`);
    console.log(`  🌐 Platform: ${Platform.OS}`);
  }

  /**
   * Get system status
   */
  getStatus(): {
    isInitialized: boolean;
    oneSignalReady: boolean;
    supabaseReady: boolean;
    deviceType: string;
    platform: string;
  } {
    const oneSignalStatus = enhancedOneSignalService.getStatus();

    return {
      isInitialized: this.isInitialized,
      oneSignalReady: oneSignalStatus.isInitialized && Device.isDevice,
      supabaseReady: true, // Supabase is always ready if configured
      deviceType: Device.isDevice ? 'Physical' : 'Simulator',
      platform: Platform.OS
    };
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      // Return default preferences
      return {
        enabled: true,
        sound: true,
        vibration: true,
        badge: true,
        workflowUpdates: true,
        chatMessages: true,
        reminders: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        categories: {
          urgent: true,
          normal: true,
          info: true,
        },
      };
    } catch (error) {
      console.error('❌ Failed to get notification preferences:', error);
      // Return default preferences on error
      return {
        enabled: true,
        sound: true,
        vibration: true,
        badge: true,
        workflowUpdates: true,
        chatMessages: true,
        reminders: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
        categories: {
          urgent: true,
          normal: true,
          info: true,
        },
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
      console.log('✅ Notification preferences updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
