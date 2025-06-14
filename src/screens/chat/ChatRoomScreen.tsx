import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage } from '../../types';
import { ChatStackParamList } from '../../navigation/ChatNavigator';
import { isRTL, getTextAlign } from '../../i18n';

// Import new WhatsApp-style components
import WhatsAppChatHeader from '../../components/chat/WhatsAppChatHeader';
import WhatsAppMessageBubble from '../../components/chat/WhatsAppMessageBubble';
import WhatsAppMessageInput from '../../components/chat/WhatsAppMessageInput';
import WhatsAppMediaPicker from '../../components/chat/WhatsAppMediaPicker';
import WhatsAppImagePreview from '../../components/chat/WhatsAppImagePreview';
import WhatsAppVoiceRecorder from '../../components/chat/WhatsAppVoiceRecorder';
import WhatsAppGroupSettings from '../../components/chat/WhatsAppGroupSettings';
import WhatsAppMessageSearch from '../../components/chat/WhatsAppMessageSearch';
import WhatsAppSecuritySettings from '../../components/chat/WhatsAppSecuritySettings';
import WhatsAppChatAnalytics from '../../components/chat/WhatsAppChatAnalytics';
import WhatsAppAIAssistant from '../../components/chat/WhatsAppAIAssistant';
import WhatsAppSmartReply from '../../components/chat/WhatsAppSmartReply';
import TypingIndicator from '../../components/chat/TypingIndicator';
import { FileUploadResult } from '../../services/fileUploadService';
import whatsappNotificationService from '../../services/whatsappNotificationService';

type ChatRoomRouteProp = RouteProp<ChatStackParamList, 'ChatRoom'>;
type ChatRoomNavigationProp = StackNavigationProp<ChatStackParamList, 'ChatRoom'>;

const ChatRoomScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const route = useRoute<ChatRoomRouteProp>();
  const navigation = useNavigation<ChatRoomNavigationProp>();
  const { roomId, roomName } = route.params;

  const {
    messages,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    subscribeToMessages,
    isLoading
  } = useChatStore();

  const { user } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showChatAnalytics, setShowChatAnalytics] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showSmartReply, setShowSmartReply] = useState(false);
  const [lastReceivedMessage, setLastReceivedMessage] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const isRtl = isRTL(i18n.language);

  const roomMessages = messages[roomId] || [];

  useEffect(() => {
    loadMessages();
    markMessagesAsRead(roomId);
  }, [roomId]);

  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = subscribeToMessages(roomId);
      return unsubscribe;
    }, [roomId])
  );

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (roomMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [roomMessages.length]);

  const loadMessages = async () => {
    try {
      await fetchMessages(roomId);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
      });
    }
  };

  const handleSendMessage = async (content: string, type: 'text' | 'image' | 'file' = 'text') => {
    if (!content.trim() || sending) return;

    setSending(true);
    setIsTyping(false);

    try {
      await sendMessage(roomId, content.trim(), type);
      setReplyToMessage(null); // Clear reply after sending
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.sendMessageFailed'),
      });
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (typing: boolean) => {
    setIsTyping(typing);
    // TODO: إرسال إشارة الكتابة للمستخدمين الآخرين
  };

  const handleReply = (message: ChatMessage) => {
    setReplyToMessage(message);
  };

  const handleForward = (message: ChatMessage) => {
    // TODO: إضافة وظيفة إعادة التوجيه
    Alert.alert(t('chat.forward'), t('chat.forwardFeatureComingSoon'));
  };

  const handleDelete = (message: ChatMessage) => {
    Alert.alert(
      t('chat.deleteMessage'),
      t('chat.deleteMessageConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.delete'),
          style: 'destructive',
          onPress: () => {
            // TODO: إضافة وظيفة حذف الرسالة
            Toast.show({
              type: 'info',
              text1: t('chat.deleteFeatureComingSoon'),
            });
          }
        }
      ]
    );
  };

  const handleCopy = (text: string) => {
    // TODO: إضافة وظيفة النسخ
    Toast.show({
      type: 'success',
      text1: t('chat.textCopied'),
    });
  };

  // Media handling functions
  const handleShowMediaPicker = () => {
    setShowMediaPicker(true);
  };

  const handleCameraPress = () => {
    setShowMediaPicker(false);
    // TODO: إضافة وظيفة الكاميرا
    Alert.alert(t('chat.camera'), t('chat.cameraFeatureComingSoon'));
  };

  const handleGalleryPress = () => {
    setShowMediaPicker(false);
    // Simulate selecting an image
    setSelectedImageUri('https://via.placeholder.com/300x200');
    setShowImagePreview(true);
  };

  const handleDocumentPress = () => {
    setShowMediaPicker(false);
    // TODO: إضافة وظيفة المستندات
    Alert.alert(t('chat.document'), t('chat.documentFeatureComingSoon'));
  };

  const handleLocationPress = () => {
    setShowMediaPicker(false);
    // TODO: إضافة وظيفة الموقع
    Alert.alert(t('chat.location'), t('chat.locationFeatureComingSoon'));
  };

  const handleContactPress = () => {
    setShowMediaPicker(false);
    // TODO: إضافة وظيفة جهة الاتصال
    Alert.alert(t('chat.contact'), t('chat.contactFeatureComingSoon'));
  };

  const handleImageSend = (caption?: string) => {
    setShowImagePreview(false);
    handleSendMessage(caption || 'صورة', 'image');
    setSelectedImageUri('');
  };

  // Voice recording functions
  const handleStartVoiceRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);

    // Start timer
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    // TODO: بدء التسجيل الصوتي الحقيقي
    Toast.show({
      type: 'info',
      text1: t('chat.voiceRecordingStarted'),
    });
  };

  const handleStopVoiceRecording = () => {
    setIsRecording(false);

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    // TODO: إيقاف التسجيل وإرسال الملف الصوتي
    handleSendMessage(`رسالة صوتية (${recordingDuration}s)`, 'file');
    setRecordingDuration(0);
  };

  const handleCancelVoiceRecording = () => {
    setIsRecording(false);

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    setRecordingDuration(0);
    Toast.show({
      type: 'info',
      text1: t('chat.voiceRecordingCancelled'),
    });
  };

  const handleSendVoiceRecording = () => {
    handleStopVoiceRecording();
  };

  // New features handlers
  const handleShowMessageSearch = () => {
    setShowMessageSearch(true);
  };

  const handleSearchMessages = async (query: string, filters: any): Promise<ChatMessage[]> => {
    // TODO: تطبيق البحث الحقيقي في الرسائل
    const filteredMessages = roomMessages.filter(message => {
      const matchesQuery = message.content.toLowerCase().includes(query.toLowerCase());
      const matchesType = filters.messageType === 'all' || message.message_type === filters.messageType;
      return matchesQuery && matchesType;
    });

    return filteredMessages;
  };

  const handleShowGroupSettings = () => {
    setShowGroupSettings(true);
  };

  const handleUpdateGroup = (updates: any) => {
    // TODO: تحديث معلومات المجموعة
    Toast.show({
      type: 'success',
      text1: t('chat.groupUpdated'),
    });
  };

  const handleAddMembers = () => {
    // TODO: إضافة أعضاء جدد
    Alert.alert(t('chat.addMembers'), t('chat.addMembersFeatureComingSoon'));
  };

  const handleRemoveMember = (userId: string) => {
    // TODO: إزالة عضو
    Toast.show({
      type: 'success',
      text1: t('chat.memberRemoved'),
    });
  };

  const handleLeaveGroup = () => {
    // TODO: مغادرة المجموعة
    Alert.alert(t('chat.leaveGroup'), t('chat.leftGroup'));
    navigation.goBack();
  };

  const handleMakeAdmin = (userId: string) => {
    // TODO: جعل المستخدم مشرف
    Toast.show({
      type: 'success',
      text1: t('chat.adminAdded'),
    });
  };

  const handleRemoveAdmin = (userId: string) => {
    // TODO: إزالة صلاحيات المشرف
    Toast.show({
      type: 'success',
      text1: t('chat.adminRemoved'),
    });
  };

  const handleShowSecuritySettings = () => {
    setShowSecuritySettings(true);
  };

  const handleUpdateSecuritySettings = (settings: any) => {
    // TODO: تحديث إعدادات الأمان
    Toast.show({
      type: 'success',
      text1: t('security.settingsUpdated'),
    });
  };

  const handleShowChatAnalytics = () => {
    setShowChatAnalytics(true);
  };

  const handleShowAIAssistant = () => {
    setShowAIAssistant(true);
  };

  const handleShowSmartReply = () => {
    if (roomMessages.length > 0) {
      const lastMessage = roomMessages[0];
      setLastReceivedMessage(lastMessage.content);
      setShowSmartReply(true);
    }
  };

  const handleSmartReplySelect = (reply: string) => {
    handleSendMessage(reply, 'text');
  };

  const handleTranslateMessage = (text: string, targetLang: string) => {
    // TODO: تطبيق الترجمة الحقيقية
    Toast.show({
      type: 'info',
      text1: t('ai.translateResponse'),
    });
  };

  const handleSummarizeChat = () => {
    // TODO: تطبيق تلخيص المحادثة
    Toast.show({
      type: 'info',
      text1: t('ai.summarizeResponse'),
    });
  };

  const handleGenerateReply = (context: string) => {
    // TODO: توليد رد ذكي
    Toast.show({
      type: 'info',
      text1: t('ai.replyResponse'),
    });
  };

  const handleShowMenu = () => {
    Alert.alert(
      t('chat.options'),
      t('chat.selectOption'),
      [
        {
          text: t('chat.search'),
          onPress: handleShowMessageSearch,
        },
        {
          text: t('ai.assistant'),
          onPress: handleShowAIAssistant,
        },
        {
          text: t('smartReply.smartReplies'),
          onPress: handleShowSmartReply,
        },
        {
          text: t('chat.groupSettings'),
          onPress: handleShowGroupSettings,
        },
        {
          text: t('security.securitySettings'),
          onPress: handleShowSecuritySettings,
        },
        {
          text: t('analytics.chatAnalytics'),
          onPress: handleShowChatAnalytics,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const handleFileSelected = async (file: FileUploadResult, messageType: 'image' | 'file') => {
    try {
      setSending(true);
      await sendMessage(roomId, messageText.trim() || file.fileName, messageType, file.url);
      setMessageText('');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.sendMessageFailed'),
      });
    } finally {
      setSending(false);
    }
  };

  const handleMessageSelect = (message: ChatMessage) => {
    // Find the index of the selected message
    const messageIndex = roomMessages.findIndex(m => m.id === message.id);
    if (messageIndex !== -1) {
      // Scroll to the selected message
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 100);
    }
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMyMessage = item.sender_id === user?.id;
    const showSender = index === 0 || roomMessages[index - 1]?.sender_id !== item.sender_id;
    const showTime = index === roomMessages.length - 1 ||
                    roomMessages[index + 1]?.sender_id !== item.sender_id ||
                    (new Date(roomMessages[index + 1]?.created_at).getTime() - new Date(item.created_at).getTime()) > 300000; // 5 minutes

    return (
      <WhatsAppMessageBubble
        message={item}
        isMyMessage={isMyMessage}
        showSender={showSender}
        showTime={showTime}
        onReply={handleReply}
        onForward={handleForward}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
      <Text style={[styles.emptyText, { textAlign: getTextAlign(i18n.language) }]}>
        {t('chat.startConversation')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#25D366" barStyle="light-content" />
      {/* WhatsApp-style Header */}
      <WhatsAppChatHeader
        title={roomName}
        subtitle={otherUserTyping ? t('chat.typing') : undefined}
        isOnline={false} // TODO: إضافة حالة الاتصال الحقيقية
        isTyping={otherUserTyping}
        isGroup={false} // TODO: تحديد نوع المحادثة
        participantCount={5} // TODO: عدد الأعضاء الحقيقي
        onBackPress={() => navigation.goBack()}
        onAvatarPress={() => {
          // TODO: إضافة صفحة معلومات المحادثة
          Alert.alert(t('chat.chatInfo'), t('chat.chatInfoFeatureComingSoon'));
        }}
        onCallPress={() => {
          // TODO: إضافة وظيفة المكالمة
          Alert.alert(t('chat.call'), t('chat.callFeatureComingSoon'));
        }}
        onVideoCallPress={() => {
          // TODO: إضافة وظيفة مكالمة الفيديو
          Alert.alert(t('chat.videoCall'), t('chat.videoCallFeatureComingSoon'));
        }}
        onSearchPress={handleShowMessageSearch}
        onGroupSettingsPress={handleShowGroupSettings}
        onSecurityPress={handleShowSecuritySettings}
        onAnalyticsPress={handleShowChatAnalytics}
        onMenuPress={handleShowMenu}
      />

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        {/* Messages List */}
        <View style={styles.messagesWrapper}>
          <FlatList
            ref={flatListRef}
            data={roomMessages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.id}-${index}-${item.created_at}`}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={roomMessages.length === 0 ? styles.emptyListContainer : styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            style={styles.messagesList}
          />

          {/* Typing Indicator */}
          <TypingIndicator
            isVisible={otherUserTyping}
            userName="المستخدم" // TODO: إضافة اسم المستخدم الحقيقي
            isGroup={false} // TODO: تحديد نوع المحادثة
          />
        </View>

        {/* Reply Preview */}
        {replyToMessage && (
          <View style={styles.replyPreview}>
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>{t('chat.replyingTo')}</Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {replyToMessage.content}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.replyCloseButton}
              onPress={() => setReplyToMessage(null)}
            >
              <Ionicons name="close" size={20} color="#8696A0" />
            </TouchableOpacity>
          </View>
        )}

        {/* WhatsApp-style Message Input */}
        <WhatsAppMessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onShowMediaPicker={handleShowMediaPicker}
          onStartVoiceRecording={handleStartVoiceRecording}
          onStopVoiceRecording={handleStopVoiceRecording}
          placeholder={t('chat.typeMessage')}
          disabled={sending}
          isRecording={isRecording}
        />
      </KeyboardAvoidingView>

      {/* WhatsApp Media Picker */}
      <WhatsAppMediaPicker
        visible={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onCameraPress={handleCameraPress}
        onGalleryPress={handleGalleryPress}
        onDocumentPress={handleDocumentPress}
        onLocationPress={handleLocationPress}
        onContactPress={handleContactPress}
      />

      {/* Image Preview */}
      <WhatsAppImagePreview
        visible={showImagePreview}
        imageUri={selectedImageUri}
        onClose={() => setShowImagePreview(false)}
        onSend={handleImageSend}
      />

      {/* Voice Recorder Overlay */}
      {isRecording && (
        <WhatsAppVoiceRecorder
          isRecording={isRecording}
          onStartRecording={handleStartVoiceRecording}
          onStopRecording={handleStopVoiceRecording}
          onCancelRecording={handleCancelVoiceRecording}
          onSendRecording={handleSendVoiceRecording}
          recordingDuration={recordingDuration}
        />
      )}

      {/* Group Settings */}
      <WhatsAppGroupSettings
        visible={showGroupSettings}
        group={{
          id: roomId,
          name: roomName,
          description: 'مجموعة تدريب إدارة التطوير',
          created_by: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        members={[
          { id: '1', full_name: 'أحمد محمد', email: 'ahmed@example.com', role: 'DV' },
          { id: '2', full_name: 'فاطمة علي', email: 'fatima@example.com', role: 'CC' },
          { id: '3', full_name: 'محمد حسن', email: 'mohamed@example.com', role: 'TR' },
          { id: '4', full_name: 'سارة أحمد', email: 'sara@example.com', role: 'SV' },
          { id: '5', full_name: 'عمر خالد', email: 'omar@example.com', role: 'PM' },
        ]}
        currentUser={user || { id: '1', full_name: 'المستخدم الحالي', email: 'current@example.com', role: 'DV' }}
        onClose={() => setShowGroupSettings(false)}
        onUpdateGroup={handleUpdateGroup}
        onAddMembers={handleAddMembers}
        onRemoveMember={handleRemoveMember}
        onLeaveGroup={handleLeaveGroup}
        onMakeAdmin={handleMakeAdmin}
        onRemoveAdmin={handleRemoveAdmin}
      />

      {/* Message Search */}
      <WhatsAppMessageSearch
        visible={showMessageSearch}
        chatRoomId={roomId}
        onClose={() => setShowMessageSearch(false)}
        onMessageSelect={handleMessageSelect}
        onSearchMessages={handleSearchMessages}
      />

      {/* Security Settings */}
      <WhatsAppSecuritySettings
        visible={showSecuritySettings}
        onClose={() => setShowSecuritySettings(false)}
        onUpdateSettings={handleUpdateSecuritySettings}
      />

      {/* Chat Analytics */}
      <WhatsAppChatAnalytics
        visible={showChatAnalytics}
        chatRoomId={roomId}
        messages={roomMessages}
        members={[
          { id: '1', full_name: 'أحمد محمد', email: 'ahmed@example.com', role: 'DV' },
          { id: '2', full_name: 'فاطمة علي', email: 'fatima@example.com', role: 'CC' },
          { id: '3', full_name: 'محمد حسن', email: 'mohamed@example.com', role: 'TR' },
          { id: '4', full_name: 'سارة أحمد', email: 'sara@example.com', role: 'SV' },
          { id: '5', full_name: 'عمر خالد', email: 'omar@example.com', role: 'PM' },
        ]}
        onClose={() => setShowChatAnalytics(false)}
      />

      {/* AI Assistant */}
      <WhatsAppAIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onTranslateMessage={handleTranslateMessage}
        onSummarizeChat={handleSummarizeChat}
        onGenerateReply={handleGenerateReply}
      />

      {/* Smart Reply */}
      <WhatsAppSmartReply
        visible={showSmartReply}
        lastMessage={lastReceivedMessage}
        messageContext={roomMessages.slice(0, 5).map(msg => msg.content)}
        senderName="المرسل"
        isGroup={false}
        onReplySelect={handleSmartReplySelect}
        onClose={() => setShowSmartReply(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD', // خلفية شبه الواتساب
  },
  chatContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesWrapper: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#8696A0',
    marginTop: 16,
  },
  // Reply Preview Styles
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: '#25D366',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: '#000000',
  },
  replyCloseButton: {
    padding: 4,
  },
});

export default ChatRoomScreen;
