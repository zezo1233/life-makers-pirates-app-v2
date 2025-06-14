import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';

// Create navigation reference
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

class NavigationService {
  private static instance: NavigationService;

  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }

  /**
   * Navigate to a specific screen
   */
  navigate(name: string, params?: any): void {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name as never, params as never);
    } else {
      console.warn('Navigation not ready yet');
    }
  }

  /**
   * Navigate to training request details
   */
  navigateToTrainingRequest(requestId: string): void {
    if (navigationRef.isReady()) {
      console.log('🎯 Navigating to training request:', requestId);

      try {
        // Navigate to Main tab first, then to Requests, then to RequestDetails
        navigationRef.navigate('Main', {
          screen: 'Requests',
          params: {
            screen: 'RequestDetails',
            params: { requestId }
          }
        });

        console.log('✅ Navigation to training request successful');
      } catch (error) {
        console.error('❌ Error navigating to training request:', error);
        // Fallback: navigate to requests list
        try {
          navigationRef.navigate('Main', { screen: 'Requests' });
          console.log('✅ Fallback navigation to requests list successful');
        } catch (fallbackError) {
          console.error('❌ Even fallback navigation failed:', fallbackError);
          this.navigateToDashboard();
        }
      }
    } else {
      console.warn('Navigation not ready for training request navigation');
    }
  }

  /**
   * Navigate to chat room
   */
  navigateToChat(roomId: string, roomName: string): void {
    if (navigationRef.isReady()) {
      console.log('💬 Navigating to chat room:', roomId);
      navigationRef.navigate('Main', {
        screen: 'Chat',
        params: {
          screen: 'ChatRoom',
          params: { roomId, roomName }
        }
      });
    } else {
      console.warn('Navigation not ready for chat navigation');
    }
  }

  /**
   * Navigate to dashboard
   */
  navigateToDashboard(): void {
    if (navigationRef.isReady()) {
      console.log('🏠 Navigating to dashboard');
      navigationRef.navigate('Main', {
        screen: 'Dashboard'
      });
    } else {
      console.warn('Navigation not ready for dashboard navigation');
    }
  }

  /**
   * Navigate to calendar
   */
  navigateToCalendar(): void {
    if (navigationRef.isReady()) {
      console.log('📅 Navigating to calendar');
      navigationRef.navigate('Main', {
        screen: 'Calendar'
      });
    } else {
      console.warn('Navigation not ready for calendar navigation');
    }
  }

  /**
   * Navigate to profile
   */
  navigateToProfile(): void {
    if (navigationRef.isReady()) {
      console.log('👤 Navigating to profile');
      navigationRef.navigate('Main', {
        screen: 'Profile'
      });
    } else {
      console.warn('Navigation not ready for profile navigation');
    }
  }

  /**
   * Navigate based on notification data
   */
  handleNotificationNavigation(data: any): void {
    console.log('🎯 Handling notification navigation with data:', data);

    // Add multiple safety checks
    if (!navigationRef) {
      console.error('❌ navigationRef is null');
      return;
    }

    if (!navigationRef.isReady()) {
      console.warn('⚠️ Navigation not ready, retrying in 1 second...');
      setTimeout(() => {
        try {
          this.handleNotificationNavigation(data);
        } catch (retryError) {
          console.error('❌ Retry navigation failed:', retryError);
        }
      }, 1000);
      return;
    }

    // Validate data
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid notification data:', data);
      this.safeNavigateToDashboard();
      return;
    }

    try {
      switch (data.type) {
        case 'workflow':
        case 'training_request':
          if (data.requestId && typeof data.requestId === 'string') {
            console.log('📋 Navigating to training request:', data.requestId);
            this.safeNavigateToTrainingRequest(data.requestId);
          } else {
            console.log('📋 No valid requestId found, navigating to requests list');
            this.safeNavigateToRequests();
          }
          break;

        case 'chat':
          if (data.roomId && data.roomName) {
            console.log('💬 Navigating to chat room:', data.roomId);
            this.safeNavigateToChat(data.roomId, data.roomName);
          } else {
            console.log('💬 No chat room data, navigating to chat list');
            this.safeNavigateToChat();
          }
          break;

        case 'calendar':
        case 'schedule':
          console.log('📅 Navigating to calendar');
          this.safeNavigateToCalendar();
          break;

        case 'system':
        case 'general':
        default:
          console.log('📱 Navigating to dashboard for general notification');
          this.safeNavigateToDashboard();
          break;
      }
    } catch (error) {
      console.error('❌ Error handling notification navigation:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Data that caused error:', JSON.stringify(data, null, 2));

      // Safe fallback
      this.safeNavigateToDashboard();
    }
  }

  /**
   * Safe navigation methods with error handling
   */
  private safeNavigateToTrainingRequest(requestId: string): void {
    try {
      if (!navigationRef.isReady()) {
        throw new Error('Navigation not ready');
      }

      navigationRef.navigate('Main', {
        screen: 'Requests',
        params: {
          screen: 'RequestDetails',
          params: { requestId }
        }
      });

      console.log('✅ Safe navigation to training request successful');
    } catch (error) {
      console.error('❌ Safe navigation to training request failed:', error);
      this.safeNavigateToRequests();
    }
  }

  private safeNavigateToRequests(): void {
    try {
      if (!navigationRef.isReady()) {
        throw new Error('Navigation not ready');
      }

      navigationRef.navigate('Main', { screen: 'Requests' });
      console.log('✅ Safe navigation to requests successful');
    } catch (error) {
      console.error('❌ Safe navigation to requests failed:', error);
      this.safeNavigateToDashboard();
    }
  }

  private safeNavigateToChat(roomId?: string, roomName?: string): void {
    try {
      if (!navigationRef.isReady()) {
        throw new Error('Navigation not ready');
      }

      if (roomId && roomName) {
        navigationRef.navigate('Main', {
          screen: 'Chat',
          params: {
            screen: 'ChatRoom',
            params: { roomId, roomName }
          }
        });
      } else {
        navigationRef.navigate('Main', { screen: 'Chat' });
      }

      console.log('✅ Safe navigation to chat successful');
    } catch (error) {
      console.error('❌ Safe navigation to chat failed:', error);
      this.safeNavigateToDashboard();
    }
  }

  private safeNavigateToCalendar(): void {
    try {
      if (!navigationRef.isReady()) {
        throw new Error('Navigation not ready');
      }

      navigationRef.navigate('Main', { screen: 'Calendar' });
      console.log('✅ Safe navigation to calendar successful');
    } catch (error) {
      console.error('❌ Safe navigation to calendar failed:', error);
      this.safeNavigateToDashboard();
    }
  }

  private safeNavigateToDashboard(): void {
    try {
      if (!navigationRef.isReady()) {
        console.error('❌ Navigation not ready for dashboard fallback');
        return;
      }

      navigationRef.navigate('Main', { screen: 'Dashboard' });
      console.log('✅ Safe navigation to dashboard successful');
    } catch (error) {
      console.error('❌ Even safe navigation to dashboard failed:', error);
      console.error('❌ This is a critical navigation error');
    }
  }

  /**
   * Check if navigation is ready
   */
  isReady(): boolean {
    return navigationRef.isReady();
  }

  /**
   * Get current route name
   */
  getCurrentRouteName(): string | undefined {
    if (navigationRef.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return undefined;
  }

  /**
   * Go back
   */
  goBack(): void {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  }

  /**
   * Reset navigation stack
   */
  reset(routeName: string, params?: any): void {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      });
    }
  }
}

// Export singleton instance
export const navigationService = NavigationService.getInstance();
