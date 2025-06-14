import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheService } from './cacheService';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  details: any;
}

export class OfflineService {
  private static instance: OfflineService;
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    details: null
  };
  private listeners: Array<(state: NetworkState) => void> = [];
  private syncInProgress = false;
  private readonly OFFLINE_QUEUE_KEY = 'offline_actions_queue';
  private readonly MAX_QUEUE_SIZE = 100;

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  // Initialize offline service
  async initialize(): Promise<void> {
    // Listen to network state changes
    NetInfo.addEventListener(state => {
      const newNetworkState: NetworkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
        details: state.details
      };

      const wasOffline = !this.networkState.isConnected;
      const isNowOnline = newNetworkState.isConnected;

      this.networkState = newNetworkState;

      // Notify listeners
      this.listeners.forEach(listener => listener(newNetworkState));

      // Auto-sync when coming back online
      if (wasOffline && isNowOnline) {
        this.syncOfflineActions();
      }
    });

    // Get initial network state
    const initialState = await NetInfo.fetch();
    this.networkState = {
      isConnected: initialState.isConnected ?? false,
      isInternetReachable: initialState.isInternetReachable ?? false,
      type: initialState.type,
      details: initialState.details
    };
  }

  // Get current network state
  getNetworkState(): NetworkState {
    return this.networkState;
  }

  // Check if device is online
  isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  // Add network state listener
  addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Queue action for offline execution
  async queueOfflineAction(
    type: string,
    data: any,
    maxRetries: number = 3
  ): Promise<void> {
    try {
      const action: OfflineAction = {
        id: `${type}_${Date.now()}_${Math.random()}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries
      };

      const queue = await this.getOfflineQueue();
      
      // Limit queue size
      if (queue.length >= this.MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest action
      }
      
      queue.push(action);
      await this.saveOfflineQueue(queue);

      console.log(`Queued offline action: ${type}`);
    } catch (error) {
      console.error('Error queueing offline action:', error);
    }
  }

  // Sync all offline actions
  async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline()) {
      return;
    }

    try {
      this.syncInProgress = true;
      const queue = await this.getOfflineQueue();
      
      if (queue.length === 0) {
        return;
      }

      console.log(`Syncing ${queue.length} offline actions...`);

      const successfulActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await this.executeOfflineAction(action);
          successfulActions.push(action.id);
          console.log(`Successfully synced action: ${action.type}`);
        } catch (error) {
          console.error(`Failed to sync action ${action.type}:`, error);
          
          action.retryCount++;
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          } else {
            console.warn(`Max retries reached for action: ${action.type}`);
          }
        }
      }

      // Update queue with failed actions only
      await this.saveOfflineQueue(failedActions);

      if (successfulActions.length > 0) {
        console.log(`Successfully synced ${successfulActions.length} actions`);
      }

    } catch (error) {
      console.error('Error syncing offline actions:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Execute a specific offline action
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE_TRAINING_REQUEST':
        await this.syncCreateTrainingRequest(action.data);
        break;
      case 'UPDATE_TRAINING_REQUEST':
        await this.syncUpdateTrainingRequest(action.data);
        break;
      case 'APPROVE_TRAINING_REQUEST':
        await this.syncApproveTrainingRequest(action.data);
        break;
      case 'REJECT_TRAINING_REQUEST':
        await this.syncRejectTrainingRequest(action.data);
        break;
      case 'SEND_MESSAGE':
        await this.syncSendMessage(action.data);
        break;
      case 'UPDATE_PROFILE':
        await this.syncUpdateProfile(action.data);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Sync methods for different action types
  private async syncCreateTrainingRequest(data: any): Promise<void> {
    // Import the service dynamically to avoid circular dependencies
    const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
    const store = useTrainingRequestsStore.getState();
    await store.createRequest(data);
  }

  private async syncUpdateTrainingRequest(data: any): Promise<void> {
    const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
    const store = useTrainingRequestsStore.getState();
    await store.updateRequest(data.id, data.updates);
  }

  private async syncApproveTrainingRequest(data: any): Promise<void> {
    const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
    const store = useTrainingRequestsStore.getState();
    await store.approveRequest(data.id, data.comments);
  }

  private async syncRejectTrainingRequest(data: any): Promise<void> {
    const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
    const store = useTrainingRequestsStore.getState();
    await store.rejectRequest(data.id, data.reason);
  }

  private async syncSendMessage(data: any): Promise<void> {
    const { useChatStore } = await import('../store/chatStore');
    const store = useChatStore.getState();
    await store.sendMessage(data.roomId, data.message);
  }

  private async syncUpdateProfile(data: any): Promise<void> {
    const { useAuthStore } = await import('../store/authStore');
    const store = useAuthStore.getState();
    await store.updateProfile(data);
  }

  // Get offline queue from storage
  private async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  // Save offline queue to storage
  private async saveOfflineQueue(queue: OfflineAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  // Clear offline queue
  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  // Get offline queue statistics
  async getOfflineStats(): Promise<{
    queueSize: number;
    oldestAction: number;
    newestAction: number;
    actionTypes: Record<string, number>;
  }> {
    try {
      const queue = await this.getOfflineQueue();
      
      if (queue.length === 0) {
        return {
          queueSize: 0,
          oldestAction: 0,
          newestAction: 0,
          actionTypes: {}
        };
      }

      const actionTypes: Record<string, number> = {};
      let oldestAction = Date.now();
      let newestAction = 0;

      queue.forEach(action => {
        actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
        
        if (action.timestamp < oldestAction) {
          oldestAction = action.timestamp;
        }
        if (action.timestamp > newestAction) {
          newestAction = action.timestamp;
        }
      });

      return {
        queueSize: queue.length,
        oldestAction,
        newestAction,
        actionTypes
      };
    } catch (error) {
      console.error('Error getting offline stats:', error);
      return {
        queueSize: 0,
        oldestAction: 0,
        newestAction: 0,
        actionTypes: {}
      };
    }
  }

  // Cache essential data for offline use
  async cacheEssentialData(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    try {
      // Cache user profile
      const { useAuthStore } = await import('../store/authStore');
      const authStore = useAuthStore.getState();
      if (authStore.user) {
        await cacheService.set('offline_user_profile', authStore.user, {
          ttl: 24 * 60 * 60 * 1000 // 24 hours
        });
      }

      // Cache training requests
      const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
      const requestsStore = useTrainingRequestsStore.getState();
      await cacheService.set('offline_training_requests', requestsStore.requests, {
        ttl: 60 * 60 * 1000 // 1 hour
      });

      // Cache notifications using the perfect notification service
      try {
        const { notificationService } = await import('./NotificationService');
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const notifications = await notificationService.getUserNotifications(user.id, {
            limit: 50
          });

          await cacheService.set('offline_notifications', notifications, {
            ttl: 30 * 60 * 1000 // 30 minutes
          });
        }
      } catch (error) {
        console.warn('Failed to cache notifications:', error);
      }

      console.log('Essential data cached for offline use');
    } catch (error) {
      console.error('Error caching essential data:', error);
    }
  }

  // Load cached data when offline
  async loadCachedData(): Promise<void> {
    try {
      // Load cached user profile
      const cachedUser = await cacheService.get('offline_user_profile');
      if (cachedUser) {
        const { useAuthStore } = await import('../store/authStore');
        const authStore = useAuthStore.getState();
        authStore.setUser(cachedUser);
      }

      // Load cached training requests
      const cachedRequests = await cacheService.get('offline_training_requests');
      if (cachedRequests) {
        const { useTrainingRequestsStore } = await import('../store/trainingRequestsStore');
        const requestsStore = useTrainingRequestsStore.getState();
        requestsStore.setRequests(cachedRequests);
      }

      // Load cached notifications
      const cachedNotifications = await cacheService.get('offline_notifications');
      if (cachedNotifications) {
        try {
          const { useNotificationsStore } = await import('../store/notificationsStore');
          const notificationsStore = useNotificationsStore.getState();

          // Update the store with cached notifications
          notificationsStore.notifications = cachedNotifications;
          notificationsStore.unreadCount = cachedNotifications.filter((n: any) => !n.is_read).length;
        } catch (error) {
          console.warn('Failed to load cached notifications to store:', error);
        }
      }

      console.log('Cached data loaded for offline use');
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();
