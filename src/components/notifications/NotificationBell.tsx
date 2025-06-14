import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useNotificationsStore, Notification } from '../../store/notificationsStore';
import { useAuthStore } from '../../store/authStore';
import { isRTL, getTextAlign } from '../../i18n';
import InstantNotificationOverlay from './InstantNotificationOverlay';

interface NotificationBellProps {
  size?: number;
  color?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ 
  size = 24, 
  color = '#667eea' 
}) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();

  const [showModal, setShowModal] = useState(false);
  const [instantNotification, setInstantNotification] = useState<Notification | null>(null);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      // Perfect notification system handles real-time updates automatically
    }
  }, [user?.id]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id!);
    }

    // Navigate to related request if available
    if (notification.action_url) {
      setShowModal(false);
      // Parse action URL and navigate accordingly
      if (notification.action_url.includes('/training-requests/')) {
        const requestId = notification.action_url.split('/').pop();
        (navigation as any).navigate('RequestDetails', { requestId });
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id);
      Alert.alert(
        t('notifications.success'),
        t('notifications.allMarkedAsRead')
      );
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification,
        { flexDirection: isRtl ? 'row-reverse' : 'row' }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIcon}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={20}
          color={item.is_read ? '#999' : '#667eea'}
        />
      </View>
      
      <View style={[styles.notificationContent, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
        <Text
          style={[
            styles.notificationTitle,
            !item.is_read && styles.unreadText,
            { textAlign: getTextAlign(i18n.language) }
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        
        <Text
          style={[
            styles.notificationMessage,
            { textAlign: getTextAlign(i18n.language) }
          ]}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        
        <Text style={styles.notificationTime}>
          {formatNotificationTime(item.created_at)}
        </Text>
      </View>
      
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'training_request':
        return 'school-outline';
      case 'workflow':
        return 'checkmark-circle-outline';
      case 'chat':
        return 'chatbubble-outline';
      case 'system':
        return 'information-circle-outline';
      default:
        return 'notifications-outline';
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return t('notifications.justNow');
    } else if (diffInHours < 24) {
      return t('notifications.hoursAgo', { count: diffInHours });
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return t('notifications.daysAgo', { count: diffInDays });
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellContainer}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount.toString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('notifications.title')}
            </Text>
            
            <View style={[styles.headerActions, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={handleMarkAllAsRead}
                >
                  <Text style={styles.markAllText}>
                    {t('notifications.markAllAsRead')}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id!}
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                <Text style={[styles.emptyText, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('notifications.empty')}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {instantNotification && (
        <InstantNotificationOverlay
          notification={instantNotification}
          onDismiss={() => setInstantNotification(null)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerActions: {
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#667eea',
    borderRadius: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  notificationIcon: {
    marginRight: 12,
    marginLeft: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default NotificationBell;