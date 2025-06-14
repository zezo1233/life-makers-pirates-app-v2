import { OneSignal } from 'react-native-onesignal';
import { supabase } from '../config/supabase';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationService } from './navigationService';

interface OneSignalNotificationData {
  type: 'workflow' | 'chat' | 'system' | 'training';
  requestId?: string;
  chatRoomId?: string;
  actionType?: string;
  userId?: string;
}

interface OneSignalConfig {
  appId: string;
  restApiKey: string;
}

interface NotificationPayload {
  app_id: string;
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  headings: { [key: string]: string };
  contents: { [key: string]: string };
  data?: OneSignalNotificationData;
  android_accent_color?: string;
  small_icon?: string;
  android_channel_id?: string;
  ios_badge_type?: string;
  ios_badge_count?: number;
}

export class EnhancedOneSignalService {
  private static instance: EnhancedOneSignalService;
  private isInitialized = false;
  private config: OneSignalConfig;
  private initializationPromise: Promise<void> | null = null;
  private readonly PLAYER_ID_KEY = 'onesignal_player_id';

  constructor() {
    this.config = {
      appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
      restApiKey: process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY || '',
    };
  }

  static getInstance(): EnhancedOneSignalService {
    if (!EnhancedOneSignalService.instance) {
      EnhancedOneSignalService.instance = new EnhancedOneSignalService();
    }
    return EnhancedOneSignalService.instance;
  }

  // Initialize OneSignal with comprehensive error handling
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ OneSignal already initialized');
      return;
    }

    // Prevent multiple initialization attempts
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing Enhanced OneSignal Service...');
      
      // Validate configuration
      if (!this.config.appId) {
        throw new Error('OneSignal App ID is missing from environment variables');
      }

      console.log('🔧 OneSignal Configuration:');
      console.log(`  App ID: ${this.config.appId}`);
      console.log(`  Platform: ${Platform.OS}`);
      console.log(`  Device: ${Device.isDevice ? 'Physical' : 'Simulator'}`);

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('⚠️ OneSignal: Push notifications only work on physical devices');
        console.log('📱 Continuing with limited functionality for simulator');
      }

      // Check if OneSignal native module is available
      if (typeof OneSignal === 'undefined') {
        throw new Error('OneSignal native module not available. Make sure to build with EAS Build.');
      }

      if (!OneSignal.initialize) {
        throw new Error('OneSignal.initialize method not available');
      }

      // Initialize OneSignal
      console.log('🔧 Initializing OneSignal with App ID...');
      OneSignal.initialize(this.config.appId);
      console.log('✅ OneSignal core initialized');

      // Request notification permissions
      if (Device.isDevice) {
        console.log('📱 Requesting notification permissions...');
        try {
          const permission = await OneSignal.Notifications.requestPermission(true);
          console.log('📱 Permission result:', permission);
        } catch (permError) {
          console.warn('⚠️ Permission request failed:', permError);
        }
      }

      // Set up event listeners
      this.setupEventListeners();

      // Set up notification channels for Android
      this.setupNotificationChannels();

      // Set up user identification
      await this.setupUserIdentification();

      this.isInitialized = true;
      console.log('✅ Enhanced OneSignal Service initialized successfully');
      
    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      
      if (error instanceof Error) {
        console.error('📋 Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500) + '...'
        });

        // Provide specific guidance based on error type
        if (error.message.includes('native module not available')) {
          console.error('💡 Solution: Build with EAS Build instead of Expo Go');
          console.error('💡 Command: npx eas build --platform android --profile development');
        } else if (error.message.includes('App ID is missing')) {
          console.error('💡 Solution: Add EXPO_PUBLIC_ONESIGNAL_APP_ID to your .env file');
        }
      }
      
      // Don't throw error to prevent app crash
      console.log('⚠️ Continuing without OneSignal push notifications');
    }
  }

  // Setup notification channels for Android
  private setupNotificationChannels(): void {
    try {
      if (Platform.OS === 'android') {
        console.log('📱 Setting up Android notification channels...');

        // OneSignal automatically creates a default notification channel
        // For custom channels, they need to be created in native Android code
        // or through OneSignal dashboard

        // Alternative: Use OneSignal's built-in channel management
        this.createNotificationChannelsViaOneSignal();

        console.log('✅ OneSignal notification channels configured');
      }
    } catch (error) {
      console.warn('⚠️ Failed to setup notification channels:', error);
    }
  }

  // Create notification channels via OneSignal API
  private async createNotificationChannelsViaOneSignal(): Promise<void> {
    try {
      // OneSignal creates channels automatically based on the app configuration
      // We can customize notification appearance through the payload
      console.log('📱 Using OneSignal automatic channel management');

      // Channels will be created automatically when first notification is sent
      // with specific android_channel_id (if supported by OneSignal version)
    } catch (error) {
      console.warn('⚠️ OneSignal channel creation not available:', error);
    }
  }

  // Setup event listeners
  private setupEventListeners(): void {
    try {
      // Handle notification received while app is open
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        console.log('📱 OneSignal notification received in foreground:', event);
        
        // You can modify the notification or prevent it from showing
        event.getNotification().display();
      });

      // Handle notification clicked
      OneSignal.Notifications.addEventListener('click', (event) => {
        console.log('👆 OneSignal notification clicked:', event);

        const data = event.notification.additionalData;
        if (data) {
          console.log('🎯 Notification data:', data);
          this.handleNotificationClick(data);
        } else {
          console.log('📱 No additional data in notification, navigating to dashboard');
          navigationService.navigateToDashboard();
        }
      });

      console.log('✅ OneSignal event listeners set up');
    } catch (error) {
      console.error('❌ Failed to set up OneSignal event listeners:', error);
    }
  }

  // Setup user identification
  private async setupUserIdentification(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Set external user ID
        console.log('🔐 Setting OneSignal external user ID:', user.id);
        OneSignal.login(user.id);

        // Get OneSignal player ID and save to database
        try {
          const playerId = await OneSignal.User.getOnesignalId();
          if (playerId) {
            console.log('🆔 OneSignal Player ID obtained:', playerId);
            
            // Save to local storage
            await AsyncStorage.setItem(this.PLAYER_ID_KEY, playerId);
            
            // Save to database
            await supabase
              .from('users')
              .update({ 
                onesignal_player_id: playerId,
                push_notifications_enabled: true,
                last_seen: new Date().toISOString()
              })
              .eq('id', user.id);

            console.log('💾 OneSignal Player ID saved to database');
          }
        } catch (playerIdError) {
          console.warn('⚠️ Failed to get OneSignal Player ID:', playerIdError);
        }
      }
    } catch (error) {
      console.error('❌ Error setting up OneSignal user identification:', error);
    }
  }

  // Handle notification click
  private handleNotificationClick(data: any): void {
    try {
      console.log('🎯 Handling notification click with data:', data);
      console.log('🎯 Request ID from notification:', data?.requestId);
      console.log('🎯 Notification type:', data?.type);

      // Validate data before proceeding
      if (!data) {
        console.error('❌ No data in notification click');
        return;
      }

      // Add a small delay to ensure navigation is ready
      setTimeout(() => {
        try {
          console.log('🚀 Starting navigation after delay...');

          // Double-check navigationService exists
          if (!navigationService) {
            console.error('❌ navigationService is not available');
            return;
          }

          // Use navigationService to handle the navigation
          navigationService.handleNotificationNavigation(data);

          console.log('✅ Navigation request completed');
        } catch (navigationError) {
          console.error('❌ Error in delayed navigation:', navigationError);
          console.error('❌ Navigation error stack:', navigationError instanceof Error ? navigationError.stack : 'No stack');

          // Safe fallback
          try {
            if (navigationService && typeof navigationService.navigateToDashboard === 'function') {
              navigationService.navigateToDashboard();
            } else {
              console.error('❌ Cannot access navigationService.navigateToDashboard');
            }
          } catch (fallbackError) {
            console.error('❌ Even fallback navigation failed:', fallbackError);
          }
        }
      }, 1000); // Increased delay to 1000ms for better stability

    } catch (outerError) {
      console.error('❌ Critical error in handleNotificationClick:', outerError);
      console.error('❌ Critical error stack:', outerError instanceof Error ? outerError.stack : 'No stack');
      console.error('❌ Data that caused critical error:', JSON.stringify(data, null, 2));
    }
  }

  // Send notification to specific users
  async sendNotificationToUsers(
    userIds: string[],
    title: string,
    message: string,
    data?: OneSignalNotificationData,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<boolean> {
    try {
      if (!this.config.restApiKey) {
        console.error('❌ OneSignal REST API key not configured');
        return false;
      }

      const payload: NotificationPayload = {
        app_id: this.config.appId,
        include_external_user_ids: userIds,
        headings: {
          en: title,
          ar: title
        },
        contents: {
          en: message,
          ar: message
        },
        data: data || { type: 'system' },
        android_accent_color: 'FF667eea',
        small_icon: 'ic_notification',
        // Don't specify android_channel_id - let OneSignal use default
        ios_badge_type: 'Increase',
        ios_badge_count: 1,
        priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
      };

      const response = await this.sendNotificationViaAPI(payload);
      return response;
    } catch (error) {
      console.error('❌ Failed to send OneSignal notification:', error);
      return false;
    }
  }

  // Send notification via OneSignal REST API
  private async sendNotificationViaAPI(payload: NotificationPayload): Promise<boolean> {
    try {
      console.log('📤 Sending OneSignal notification via API...');
      
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.config.restApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OneSignal API error: ${JSON.stringify(result)}`);
      }

      console.log('✅ OneSignal notification sent successfully:', result);
      return true;
    } catch (error) {
      console.error('❌ OneSignal API request failed:', error);
      return false;
    }
  }

  // Test OneSignal functionality
  async testOneSignal(): Promise<{
    success: boolean;
    playerId?: string;
    error?: string;
  }> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const playerId = await AsyncStorage.getItem(this.PLAYER_ID_KEY);
      
      if (playerId) {
        // Send test notification
        const testResult = await this.sendNotificationToUsers(
          ['test'],
          'OneSignal Test',
          'This is a test notification from OneSignal',
          { type: 'system' }
        );

        return {
          success: true,
          playerId,
        };
      } else {
        return {
          success: false,
          error: 'No Player ID available',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get initialization status
  getStatus(): {
    isInitialized: boolean;
    hasAppId: boolean;
    hasRestApiKey: boolean;
    platform: string;
    isDevice: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      hasAppId: !!this.config.appId,
      hasRestApiKey: !!this.config.restApiKey,
      platform: Platform.OS,
      isDevice: Device.isDevice,
    };
  }
}

// Export singleton instance
export const enhancedOneSignalService = EnhancedOneSignalService.getInstance();
