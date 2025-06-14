import { create } from 'zustand';
import { notificationService, NotificationRecord } from '../services/NotificationService';
import { handleSupabaseError } from '../config/supabase';

// Use the perfect notification interface
export type Notification = NotificationRecord;

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface NotificationsActions {
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  getUnreadCount: (userId: string) => Promise<void>;
  clearError: () => void;
}

type NotificationsStore = NotificationsState & NotificationsActions;

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Actions
  fetchNotifications: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Use the perfect notification service
      const notifications = await notificationService.getUserNotifications(userId, {
        limit: 50
      });

      const unreadCount = notifications.filter(n => !n.is_read).length;

      set({ 
        notifications, 
        unreadCount,
        isLoading: false 
      });
    } catch (error) {
      set({
        error: handleSupabaseError(error),
        isLoading: false
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      // Use the perfect notification service
      const success = await notificationService.markAsRead(notificationId);

      if (success) {
        set(state => ({
          notifications: state.notifications.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));
      }
    } catch (error) {
      set({ error: handleSupabaseError(error) });
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      // Use the perfect notification service
      const success = await notificationService.markAllAsRead(userId);

      if (success) {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, is_read: true })),
          unreadCount: 0
        }));
      }
    } catch (error) {
      set({ error: handleSupabaseError(error) });
    }
  },

  getUnreadCount: async (userId: string) => {
    try {
      const count = await notificationService.getUnreadCount(userId);
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to get unread count:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
