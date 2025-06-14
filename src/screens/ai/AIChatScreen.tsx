import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { aiChatService } from '../../services/aiChatService';
import { isRTL, getTextAlign } from '../../i18n';
import { UserRole } from '../../types';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'recommendation' | 'feedback_analysis';
  data?: any;
}

const AIChatScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    // Add welcome message
    if (user && hasAIAccess(user.role)) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        text: getWelcomeMessage(user.role),
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  const hasAIAccess = (userRole: UserRole): boolean => {
    return [
      UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
      UserRole.PROGRAM_SUPERVISOR,
      UserRole.TRAINER
    ].includes(userRole);
  };

  const getWelcomeMessage = (userRole: UserRole): string => {
    const roleMessages = {
      [UserRole.TRAINER_PREPARATION_PROJECT_MANAGER]: 
        '🤖 مرحباً بك في مساعد الحقائب التدريبية!\n\nيمكنني مساعدتك في:\n• معلومات الحقائب التدريبية\n• نصائح التدريب الفعال\n• تحليل الفيدباك وتحويله لنجوم\n\nاسأل عن أي شيء تريد معرفته!',
      
      [UserRole.PROGRAM_SUPERVISOR]: 
        '🤖 مرحباً أيها المتابع!\n\nيمكنني مساعدتك في:\n• معلومات الحقائب التدريبية\n• ترشيح أفضل المدربين للطلبات\n• نصائح الإشراف على التدريب\n• تحليل أداء المدربين\n\nكيف يمكنني مساعدتك اليوم؟',
      
      [UserRole.TRAINER]: 
        '🤖 مرحباً أيها المدرب!\n\nيمكنني مساعدتك في:\n• تفاصيل الحقائب التدريبية\n• نصائح التدريب الفعال\n• أساليب التفاعل مع المتدربين\n• تطوير مهاراتك التدريبية\n\nما الذي تود معرفته؟'
    };

    return roleMessages[userRole] || 'مرحباً بك في مساعد الحقائب التدريبية!';
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Check for special commands
      if (inputText.toLowerCase().includes('ترشيح مدرب') && user.role === UserRole.PROGRAM_SUPERVISOR) {
        // This would need a training request ID in practice
        Alert.alert(
          'ترشيح المدربين',
          'يرجى تحديد طلب التدريب من قائمة الطلبات للحصول على ترشيحات المدربين',
          [{ text: 'حسناً' }]
        );
        setIsLoading(false);
        return;
      }

      if (inputText.toLowerCase().includes('تحليل فيدباك') && user.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER) {
        // This would need feedback text in practice
        Alert.alert(
          'تحليل الفيدباك',
          'يرجى إدخال نص الفيدباك المراد تحليله',
          [{ text: 'حسناً' }]
        );
        setIsLoading(false);
        return;
      }

      // Process regular AI query
      const response = await aiChatService.processTrainingQuery(inputText, user.role);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error processing AI query:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'عذراً، حدث خطأ في معالجة استفسارك. يرجى المحاولة مرة أخرى.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage,
      isRtl && styles.messageContainerRtl
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.aiText,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {item.timestamp.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </View>
  );

  const renderQuickActions = () => {
    if (!user) return null;

    const actions = [];

    if (user.role === UserRole.PROGRAM_SUPERVISOR) {
      actions.push(
        { text: 'ترشيح مدربين', query: 'كيف يمكنني اختيار أفضل مدرب؟' },
        { text: 'نصائح الإشراف', query: 'نصائح للإشراف على التدريب' }
      );
    }

    if (user.role === UserRole.TRAINER) {
      actions.push(
        { text: 'نصائح التدريب', query: 'نصائح لتدريب فعال' },
        { text: 'التفاعل مع المتدربين', query: 'كيف أتفاعل مع المتدربين؟' }
      );
    }

    if (user.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER) {
      actions.push(
        { text: 'تحليل الفيدباك', query: 'كيف أحلل فيدباك المدربين؟' },
        { text: 'إدارة المدربين', query: 'نصائح لإدارة فريق المدربين' }
      );
    }

    // Common actions
    actions.push(
      { text: 'الحقائب التدريبية', query: 'أخبرني عن الحقائب التدريبية المتاحة' },
      { text: 'مساعدة', query: 'مساعدة' }
    );

    return (
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.quickActionsTitle, { textAlign: getTextAlign(i18n.language) }]}>
          إجراءات سريعة:
        </Text>
        <View style={styles.quickActionsGrid}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={() => {
                setInputText(action.query);
                sendMessage();
              }}
            >
              <Text style={[styles.quickActionText, { textAlign: getTextAlign(i18n.language) }]}>
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (!user || !hasAIAccess(user.role)) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
        <Text style={[styles.accessDeniedText, { textAlign: getTextAlign(i18n.language) }]}>
          هذه الخدمة متاحة فقط لمسؤول المشروع والمتابعين والمدربين
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isRtl && styles.headerContentRtl]}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#667eea" />
          <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
            مساعد الحقائب التدريبية
          </Text>
        </View>
        <View style={styles.aiIndicator}>
          <View style={styles.aiDot} />
          <Text style={styles.aiText}>AI</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListFooterComponent={messages.length === 1 ? renderQuickActions : null}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.typingIndicator}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
          <Text style={styles.typingText}>الذكاء الاصطناعي يكتب...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            { textAlign: getTextAlign(i18n.language) },
            isRtl && styles.textInputRtl
          ]}
          placeholder="اكتب سؤالك هنا..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons 
            name={isRtl ? "arrow-back-outline" : "arrow-forward-outline"} 
            size={20} 
            color="#ffffff" 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContentRtl: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginRight: 6,
  },
  aiText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageContainerRtl: {
    // RTL specific styles if needed
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  quickActionsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  textInputRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default AIChatScreen;
