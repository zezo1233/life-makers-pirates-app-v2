import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppMessageBubbleProps {
  message: ChatMessage;
  isMyMessage: boolean;
  showSender?: boolean;
  showTime?: boolean;
  onReply?: (message: ChatMessage) => void;
  onForward?: (message: ChatMessage) => void;
  onDelete?: (message: ChatMessage) => void;
  onCopy?: (text: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const WhatsAppMessageBubble: React.FC<WhatsAppMessageBubbleProps> = ({
  message,
  isMyMessage,
  showSender = false,
  showTime = false,
  onReply,
  onForward,
  onDelete,
  onCopy,
}) => {
  const { t, i18n } = useTranslation();
  const [showOptions, setShowOptions] = useState(false);
  const isRtl = isRTL(i18n.language);

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLongPress = () => {
    const options = [];
    
    if (onReply) {
      options.push({
        text: t('chat.reply'),
        onPress: () => onReply(message),
      });
    }
    
    if (onForward) {
      options.push({
        text: t('chat.forward'),
        onPress: () => onForward(message),
      });
    }
    
    if (message.message_type === 'text' && onCopy) {
      options.push({
        text: t('chat.copy'),
        onPress: () => onCopy(message.content),
      });
    }
    
    if (isMyMessage && onDelete) {
      options.push({
        text: t('chat.delete'),
        onPress: () => onDelete(message),
        style: 'destructive' as const,
      });
    }
    
    options.push({
      text: t('common.cancel'),
      style: 'cancel' as const,
    });

    Alert.alert(t('chat.messageOptions'), '', options);
  };

  const getMessageStatus = () => {
    if (!isMyMessage) return null;
    
    // TODO: إضافة حالة الرسالة الحقيقية من قاعدة البيانات
    return (
      <View style={styles.messageStatus}>
        <Ionicons 
          name="checkmark-done" 
          size={16} 
          color={message.is_read ? "#4FC3F7" : "#B0BEC5"} 
        />
      </View>
    );
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'text':
        return (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {message.content}
          </Text>
        );
      
      case 'image':
        return (
          <View style={styles.mediaContainer}>
            <View style={styles.mediaPlaceholder}>
              <Ionicons name="image" size={40} color="#ffffff" />
              <Text style={styles.mediaText}>{t('chat.photo')}</Text>
            </View>
            {message.content && (
              <Text style={[
                styles.mediaCaption,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
                { textAlign: getTextAlign(i18n.language) }
              ]}>
                {message.content}
              </Text>
            )}
          </View>
        );
      
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <View style={styles.fileIcon}>
              <Ionicons name="document" size={24} color="#25D366" />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[
                styles.fileName,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {message.content || t('chat.file')}
              </Text>
              <Text style={styles.fileSize}>
                {t('chat.tapToDownload')}
              </Text>
            </View>
          </View>
        );
      
      default:
        return (
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
        );
    }
  };

  return (
    <TouchableWithoutFeedback onLongPress={handleLongPress}>
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {/* اسم المرسل للمجموعات */}
        {!isMyMessage && showSender && (
          <Text style={[
            styles.senderName,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {message.sender?.full_name || 'Unknown'}
          </Text>
        )}

        {/* فقاعة الرسالة */}
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {renderMessageContent()}
          
          {/* الوقت وحالة الرسالة */}
          <View style={[
            styles.messageFooter,
            isMyMessage ? styles.myMessageFooter : styles.otherMessageFooter
          ]}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(message.created_at)}
            </Text>
            {getMessageStatus()}
          </View>
        </View>

        {/* مثلث الفقاعة */}
        <View style={[
          styles.bubbleTail,
          isMyMessage ? styles.myBubbleTail : styles.otherBubbleTail
        ]} />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    maxWidth: screenWidth * 0.8,
    position: 'relative',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  senderName: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 60,
  },
  myMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
  },
  myBubbleTail: {
    right: -6,
    borderLeftWidth: 6,
    borderLeftColor: '#DCF8C6',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
  },
  otherBubbleTail: {
    left: -6,
    borderRightWidth: 6,
    borderRightColor: '#ffffff',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#000000',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  myMessageFooter: {
    justifyContent: 'flex-end',
  },
  otherMessageFooter: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    color: '#8696A0',
  },
  myMessageTime: {
    color: '#8696A0',
  },
  otherMessageTime: {
    color: '#8696A0',
  },
  messageStatus: {
    marginLeft: 4,
  },
  // Media styles
  mediaContainer: {
    minWidth: 200,
  },
  mediaPlaceholder: {
    height: 150,
    backgroundColor: '#25D366',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mediaText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
  },
  mediaCaption: {
    fontSize: 14,
    lineHeight: 18,
  },
  // File styles
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#8696A0',
  },
});

export default WhatsAppMessageBubble;
