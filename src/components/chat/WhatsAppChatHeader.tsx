import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppChatHeaderProps {
  title: string;
  subtitle?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  participantCount?: number;
  avatarUrl?: string;
  isGroup?: boolean;
  onBackPress: () => void;
  onAvatarPress?: () => void;
  onCallPress?: () => void;
  onVideoCallPress?: () => void;
  onSearchPress?: () => void;
  onGroupSettingsPress?: () => void;
  onSecurityPress?: () => void;
  onAnalyticsPress?: () => void;
  onMenuPress?: () => void;
}

const WhatsAppChatHeader: React.FC<WhatsAppChatHeaderProps> = ({
  title,
  subtitle,
  isOnline = false,
  isTyping = false,
  participantCount,
  avatarUrl,
  isGroup = false,
  onBackPress,
  onAvatarPress,
  onCallPress,
  onVideoCallPress,
  onSearchPress,
  onGroupSettingsPress,
  onSecurityPress,
  onAnalyticsPress,
  onMenuPress,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);

  const getSubtitleText = (): string => {
    if (isTyping) {
      return t('chat.typing');
    }
    
    if (isGroup && participantCount) {
      return t('chat.participantsCount', { count: participantCount });
    }
    
    if (isOnline && !isGroup) {
      return t('chat.online');
    }
    
    if (subtitle) {
      return subtitle;
    }
    
    return '';
  };

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
        />
      );
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <Ionicons
          name={isGroup ? "people" : "person"}
          size={20}
          color="#25D366"
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* الجانب الأيسر: زر الرجوع والصورة والمعلومات */}
      <View style={styles.leftSection}>
        {/* زر الرجوع */}
        <TouchableOpacity 
          onPress={onBackPress}
          style={styles.backButton}
        >
          <Ionicons 
            name={isRtl ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color="#ffffff" 
          />
        </TouchableOpacity>

        {/* الصورة الشخصية */}
        <TouchableOpacity
          onPress={onAvatarPress}
          style={styles.avatarContainer}
        >
          {renderAvatar()}

          {/* مؤشر الاتصال */}
          {!isGroup && isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </TouchableOpacity>

        {/* معلومات المحادثة */}
        <TouchableOpacity 
          onPress={onAvatarPress}
          style={styles.infoContainer}
        >
          <Text
            style={[
              styles.title,
              { textAlign: getTextAlign(i18n.language) }
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          
          {getSubtitleText() && (
            <Text
              style={[
                styles.subtitle,
                { textAlign: getTextAlign(i18n.language) },
                isTyping && styles.typingText,
                isOnline && !isGroup && styles.onlineText
              ]}
              numberOfLines={1}
            >
              {getSubtitleText()}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* الجانب الأيمن: أزرار الإجراءات */}
      <View style={styles.rightSection}>
        {/* زر البحث */}
        {onSearchPress && (
          <TouchableOpacity
            onPress={onSearchPress}
            style={styles.actionButton}
          >
            <Ionicons name="search" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* زر المكالمة الصوتية */}
        {onCallPress && (
          <TouchableOpacity
            onPress={onCallPress}
            style={styles.actionButton}
          >
            <Ionicons name="call" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* زر مكالمة الفيديو */}
        {onVideoCallPress && (
          <TouchableOpacity
            onPress={onVideoCallPress}
            style={styles.actionButton}
          >
            <Ionicons name="videocam" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}

        {/* زر القائمة */}
        {onMenuPress && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.actionButton}
          >
            <Ionicons name="ellipsis-vertical" size={22} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E8',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#25D366',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#E8F5E8',
    fontWeight: '400',
  },
  typingText: {
    color: '#ffffff',
    fontStyle: 'italic',
  },
  onlineText: {
    color: '#E8F5E8',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default WhatsAppChatHeader;
