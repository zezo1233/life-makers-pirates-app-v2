import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatRoom } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppChatItemProps {
  room: ChatRoom;
  unreadCount: number;
  isOnline?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const WhatsAppChatItem: React.FC<WhatsAppChatItemProps> = ({
  room,
  unreadCount,
  isOnline = false,
  isPinned = false,
  isMuted = false,
  onPress,
  onLongPress,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);

  const formatLastMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays === 0) {
      return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays === 1) {
      return t('chat.yesterday');
    } else if (diffInDays < 7) {
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long',
      });
    } else {
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    }
  };

  const getLastMessagePreview = (): string => {
    if (!room.last_message) return t('chat.noMessages');
    
    const message = room.last_message;
    
    switch (message.message_type) {
      case 'image':
        return `📷 ${t('chat.photo')}`;
      case 'file':
        return `📎 ${t('chat.file')}`;
      default:
        return message.content || t('chat.noMessages');
    }
  };

  const renderAvatar = () => {
    // إذا كانت مجموعة، استخدم أيقونة المجموعة
    if (room.type === 'group') {
      return (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="people" size={24} color="#25D366" />
        </View>
      );
    }

    // إذا كانت محادثة مباشرة، استخدم أيقونة المستخدم
    return (
      <View style={styles.avatarPlaceholder}>
        <Ionicons name="person" size={24} color="#25D366" />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPinned && styles.pinnedContainer,
        unreadCount > 0 && styles.unreadContainer
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* صورة المحادثة */}
      <View style={styles.avatarContainer}>
        {renderAvatar()}

        {/* مؤشر الاتصال للمحادثات المباشرة */}
        {room.type === 'direct' && (
          <View style={[
            styles.onlineIndicator,
            { backgroundColor: isOnline ? '#25D366' : 'transparent' }
          ]} />
        )}

        {/* أيقونة المجموعة */}
        {room.type === 'group' && (
          <View style={styles.groupIndicator}>
            <Ionicons name="people" size={12} color="#ffffff" />
          </View>
        )}
      </View>

      {/* محتوى المحادثة */}
      <View style={styles.contentContainer}>
        {/* الصف الأول: اسم المحادثة والوقت */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            {/* أيقونة التثبيت */}
            {isPinned && (
              <Ionicons 
                name="pin" 
                size={14} 
                color="#8696A0" 
                style={[styles.pinIcon, isRtl && styles.pinIconRtl]} 
              />
            )}
            
            <Text
              style={[
                styles.chatName,
                { textAlign: getTextAlign(i18n.language) },
                unreadCount > 0 && styles.unreadChatName
              ]}
              numberOfLines={1}
            >
              {room.name}
            </Text>
          </View>

          <View style={styles.timeContainer}>
            {room.last_message && (
              <Text style={[
                styles.timeText,
                unreadCount > 0 && styles.unreadTimeText
              ]}>
                {formatLastMessageTime(room.last_message.created_at)}
              </Text>
            )}
          </View>
        </View>

        {/* الصف الثاني: آخر رسالة والعدادات */}
        <View style={styles.messageRow}>
          <View style={styles.lastMessageContainer}>
            <Text
              style={[
                styles.lastMessage,
                { textAlign: getTextAlign(i18n.language) },
                unreadCount > 0 && styles.unreadLastMessage
              ]}
              numberOfLines={1}
            >
              {getLastMessagePreview()}
            </Text>
          </View>

          <View style={styles.indicatorsContainer}>
            {/* أيقونة الكتم */}
            {isMuted && (
              <Ionicons 
                name="volume-mute" 
                size={16} 
                color="#8696A0" 
                style={styles.muteIcon} 
              />
            )}
            
            {/* عداد الرسائل غير المقروءة */}
            {unreadCount > 0 && (
              <View style={[
                styles.unreadBadge,
                isMuted && styles.mutedUnreadBadge
              ]}>
                <Text style={styles.unreadText}>
                  {unreadCount > 999 ? '999+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  pinnedContainer: {
    backgroundColor: '#F8F9FA',
  },
  unreadContainer: {
    backgroundColor: '#ffffff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5E5EA',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  groupIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 4,
  },
  pinIconRtl: {
    marginRight: 0,
    marginLeft: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  unreadChatName: {
    fontWeight: '700',
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#8696A0',
    fontWeight: '400',
  },
  unreadTimeText: {
    color: '#25D366',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flex: 1,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#8696A0',
    fontWeight: '400',
  },
  unreadLastMessage: {
    color: '#000000',
    fontWeight: '500',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muteIcon: {
    marginRight: 4,
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  mutedUnreadBadge: {
    backgroundColor: '#8696A0',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default WhatsAppChatItem;
