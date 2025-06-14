import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { ChatMessage } from '../../types';
import { fileUploadService, getFileIcon, isImageFile } from '../../services/fileUploadService';
import { isRTL, getTextAlign } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

interface MessageBubbleProps {
  message: ChatMessage;
  isMyMessage: boolean;
  showSender: boolean;
  showTime: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const maxImageWidth = screenWidth * 0.6;

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMyMessage,
  showSender,
  showTime,
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isRtl = isRTL(i18n.language);

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleImagePress = () => {
    if (message.message_type === 'image' && message.file_url) {
      setImageModalVisible(true);
    }
  };

  const handleFileDownload = async () => {
    if (!message.file_url) return;

    try {
      setDownloading(true);

      const fileInfo = fileUploadService.getFileInfo(message.file_url);
      const fileUri = FileSystem.documentDirectory + fileInfo.fileName;

      // Download file
      const downloadResult = await FileSystem.downloadAsync(
        message.file_url,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Share file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert(
            t('chat.fileDownloaded'),
            t('chat.fileDownloadedDescription')
          );
        }
      }
    } catch (error) {
      Alert.alert(
        t('errors.downloadFailed'),
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setDownloading(false);
    }
  };

  const renderTextMessage = () => (
    <Text style={[
      styles.messageText,
      isMyMessage ? styles.myMessageText : styles.otherMessageText,
      { 
        textAlign: getTextAlign(i18n.language),
        color: isMyMessage ? '#ffffff' : theme.colors.text,
      }
    ]}>
      {message.content}
    </Text>
  );

  const renderImageMessage = () => {
    if (!message.file_url) return null;

    return (
      <TouchableOpacity onPress={handleImagePress} activeOpacity={0.8}>
        <Image
          source={{ uri: message.file_url }}
          style={styles.messageImage}
          resizeMode="cover"
        />
        {message.content && (
          <Text style={[
            styles.imageCaption,
            { 
              color: isMyMessage ? '#ffffff' : theme.colors.text,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {message.content}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderFileMessage = () => {
    if (!message.file_url) return null;

    const fileInfo = fileUploadService.getFileInfo(message.file_url);
    const iconName = getFileIcon(message.file_url);

    return (
      <TouchableOpacity
        style={[
          styles.fileContainer,
          { backgroundColor: isMyMessage ? 'rgba(255,255,255,0.2)' : theme.colors.surface }
        ]}
        onPress={handleFileDownload}
        disabled={downloading}
        activeOpacity={0.7}
      >
        <View style={[styles.fileContent, isRtl && styles.fileContentRtl]}>
          <View style={[
            styles.fileIcon,
            { backgroundColor: isMyMessage ? 'rgba(255,255,255,0.3)' : theme.colors.primary }
          ]}>
            <Ionicons
              name={iconName as any}
              size={24}
              color={isMyMessage ? '#ffffff' : '#ffffff'}
            />
          </View>
          
          <View style={styles.fileInfo}>
            <Text style={[
              styles.fileName,
              { 
                color: isMyMessage ? '#ffffff' : theme.colors.text,
                textAlign: getTextAlign(i18n.language),
              }
            ]} numberOfLines={1}>
              {fileInfo.fileName}
            </Text>
            <Text style={[
              styles.fileSize,
              { 
                color: isMyMessage ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary,
                textAlign: getTextAlign(i18n.language),
              }
            ]}>
              {fileInfo.fileExtension.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.downloadIcon}>
            {downloading ? (
              <Ionicons
                name="hourglass-outline"
                size={20}
                color={isMyMessage ? '#ffffff' : theme.colors.primary}
              />
            ) : (
              <Ionicons
                name="download-outline"
                size={20}
                color={isMyMessage ? '#ffffff' : theme.colors.primary}
              />
            )}
          </View>
        </View>
        
        {message.content && (
          <Text style={[
            styles.fileCaption,
            { 
              color: isMyMessage ? '#ffffff' : theme.colors.text,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {message.content}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'image':
        return renderImageMessage();
      case 'file':
        return renderFileMessage();
      default:
        return renderTextMessage();
    }
  };

  return (
    <View style={[
      styles.messageContainer,
      isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
    ]}>
      {!isMyMessage && showSender && (
        <Text style={[
          styles.senderName,
          { 
            color: theme.colors.textSecondary,
            textAlign: getTextAlign(i18n.language),
          }
        ]}>
          {message.sender?.full_name || 'Unknown'}
        </Text>
      )}

      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
        { backgroundColor: isMyMessage ? theme.colors.primary : theme.colors.surface }
      ]}>
        {renderMessageContent()}
      </View>

      {showTime && (
        <Text style={[
          styles.messageTime,
          isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          { color: theme.colors.textMuted }
        ]}>
          {formatMessageTime(message.created_at)}
        </Text>
      )}

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#ffffff" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: message.file_url }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          
          <TouchableOpacity
            style={styles.imageModalDownload}
            onPress={handleFileDownload}
          >
            <Ionicons name="download-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    marginBottom: 4,
    marginHorizontal: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#333333',
  },
  messageImage: {
    width: maxImageWidth,
    height: maxImageWidth * 0.75,
    borderRadius: 12,
    marginBottom: 8,
  },
  imageCaption: {
    fontSize: 14,
    lineHeight: 18,
  },
  fileContainer: {
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileContentRtl: {
    flexDirection: 'row-reverse',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },
  downloadIcon: {
    marginLeft: 8,
  },
  fileCaption: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  otherMessageTime: {
    textAlign: 'left',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  imageModalDownload: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 15,
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
  },
});

export default MessageBubble;
