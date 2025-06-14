import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface AIMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  isTyping?: boolean;
}

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

interface WhatsAppAIAssistantProps {
  visible: boolean;
  onClose: () => void;
  onTranslateMessage?: (text: string, targetLang: string) => void;
  onSummarizeChat?: () => void;
  onGenerateReply?: (context: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppAIAssistant: React.FC<WhatsAppAIAssistantProps> = ({
  visible,
  onClose,
  onTranslateMessage,
  onSummarizeChat,
  onGenerateReply,
}) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;
  const isRtl = isRTL(i18n.language);

  const aiFeatures: AIFeature[] = [
    {
      id: 'translate',
      title: t('ai.translate'),
      description: t('ai.translateDesc'),
      icon: 'language',
      color: '#2196F3',
      action: () => handleFeatureSelect('translate'),
    },
    {
      id: 'summarize',
      title: t('ai.summarize'),
      description: t('ai.summarizeDesc'),
      icon: 'document-text',
      color: '#FF9800',
      action: () => handleFeatureSelect('summarize'),
    },
    {
      id: 'reply',
      title: t('ai.smartReply'),
      description: t('ai.smartReplyDesc'),
      icon: 'chatbubble-ellipses',
      color: '#4CAF50',
      action: () => handleFeatureSelect('reply'),
    },
    {
      id: 'write',
      title: t('ai.creativeWrite'),
      description: t('ai.creativeWriteDesc'),
      icon: 'create',
      color: '#9C27B0',
      action: () => handleFeatureSelect('write'),
    },
    {
      id: 'analyze',
      title: t('ai.sentimentAnalysis'),
      description: t('ai.sentimentAnalysisDesc'),
      icon: 'heart',
      color: '#E91E63',
      action: () => handleFeatureSelect('analyze'),
    },
    {
      id: 'search',
      title: t('ai.smartSearch'),
      description: t('ai.smartSearchDesc'),
      icon: 'search',
      color: '#607D8B',
      action: () => handleFeatureSelect('search'),
    },
  ];

  useEffect(() => {
    if (visible && messages.length === 0) {
      // رسالة ترحيب من الذكاء الاصطناعي
      const welcomeMessage: AIMessage = {
        id: '1',
        type: 'ai',
        content: t('ai.welcomeMessage'),
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  }, [visible]);

  useEffect(() => {
    if (isTyping) {
      startTypingAnimation();
    } else {
      stopTypingAnimation();
    }
  }, [isTyping]);

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnimation, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopTypingAnimation = () => {
    typingAnimation.stopAnimation();
    typingAnimation.setValue(0);
  };

  const handleFeatureSelect = (featureId: string) => {
    setSelectedFeature(featureId);
    
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: t(`ai.${featureId}Request`),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    simulateAIResponse(featureId);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    simulateAIResponse('general', inputText.trim());
  };

  const simulateAIResponse = (type: string, userInput?: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      
      let aiResponse = '';
      
      switch (type) {
        case 'translate':
          aiResponse = t('ai.translateResponse');
          break;
        case 'summarize':
          aiResponse = t('ai.summarizeResponse');
          break;
        case 'reply':
          aiResponse = t('ai.replyResponse');
          break;
        case 'write':
          aiResponse = t('ai.writeResponse');
          break;
        case 'analyze':
          aiResponse = t('ai.analyzeResponse');
          break;
        case 'search':
          aiResponse = t('ai.searchResponse');
          break;
        default:
          aiResponse = generateContextualResponse(userInput || '');
      }

      const aiMessage: AIMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // التمرير للأسفل
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const generateContextualResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('ترجم') || lowerInput.includes('translate')) {
      return t('ai.translateSuggestion');
    } else if (lowerInput.includes('لخص') || lowerInput.includes('summarize')) {
      return t('ai.summarizeSuggestion');
    } else if (lowerInput.includes('اكتب') || lowerInput.includes('write')) {
      return t('ai.writeSuggestion');
    } else if (lowerInput.includes('ابحث') || lowerInput.includes('search')) {
      return t('ai.searchSuggestion');
    } else {
      return t('ai.generalResponse');
    }
  };

  const renderMessage = (message: AIMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.type === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
      ]}
    >
      {message.type === 'ai' && (
        <View style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={16} color="#8E44AD" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        message.type === 'user' ? styles.userMessageBubble : styles.aiMessageBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.type === 'user' ? styles.userMessageText : styles.aiMessageText,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {message.content}
        </Text>
        
        <Text style={[
          styles.messageTime,
          message.type === 'user' ? styles.userMessageTime : styles.aiMessageTime
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.aiMessageContainer]}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={16} color="#8E44AD" />
      </View>
      
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.typingDot,
                {
                  opacity: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [{
                    scale: typingAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.typingText}>{t('ai.thinking')}</Text>
      </View>
    </View>
  );

  const renderFeatureGrid = () => (
    <View style={styles.featuresContainer}>
      <Text style={[styles.featuresTitle, { textAlign: getTextAlign(i18n.language) }]}>
        {t('ai.whatCanIHelp')}
      </Text>
      
      <View style={styles.featuresGrid}>
        {aiFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={styles.featureCard}
            onPress={feature.action}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
              <Ionicons name={feature.icon as any} size={24} color="#ffffff" />
            </View>
            
            <Text style={[styles.featureTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {feature.title}
            </Text>
            
            <Text style={[styles.featureDescription, { textAlign: getTextAlign(i18n.language) }]}>
              {feature.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="#8E44AD" barStyle="light-content" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.aiHeaderIcon}>
              <Ionicons name="sparkles" size={20} color="#ffffff" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{t('ai.assistant')}</Text>
              <Text style={styles.headerSubtitle}>{t('ai.poweredByAI')}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.length === 1 && renderFeatureGrid()}
          
          {messages.map(renderMessage)}
          
          {isTyping && renderTypingIndicator()}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.textInput,
                { textAlign: getTextAlign(i18n.language) }
              ]}
              placeholder={t('ai.askAnything')}
              placeholderTextColor="#8696A0"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={inputText.trim() ? "#ffffff" : "#8696A0"} 
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputHint}>
            {t('ai.poweredByAdvancedAI')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E44AD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  aiHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#8696A0',
    lineHeight: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: '#8E44AD',
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiMessageTime: {
    color: '#8696A0',
  },
  typingBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E44AD',
    marginRight: 4,
  },
  typingText: {
    fontSize: 11,
    color: '#8696A0',
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8E44AD',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  inputHint: {
    fontSize: 11,
    color: '#8696A0',
    textAlign: 'center',
  },
});

export default WhatsAppAIAssistant;
