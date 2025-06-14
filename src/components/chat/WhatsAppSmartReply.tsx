import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface SmartReply {
  id: string;
  text: string;
  type: 'quick' | 'contextual' | 'emoji' | 'action';
  confidence: number;
  category: string;
}

interface WhatsAppSmartReplyProps {
  visible: boolean;
  lastMessage: string;
  messageContext: string[];
  senderName: string;
  isGroup: boolean;
  onReplySelect: (reply: string) => void;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const WhatsAppSmartReply: React.FC<WhatsAppSmartReplyProps> = ({
  visible,
  lastMessage,
  messageContext,
  senderName,
  isGroup,
  onReplySelect,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const slideAnimation = new Animated.Value(visible ? 1 : 0);
  const isRtl = isRTL(i18n.language);

  const replyCategories = [
    { id: 'all', title: t('smartReply.all'), icon: 'apps' },
    { id: 'quick', title: t('smartReply.quick'), icon: 'flash' },
    { id: 'contextual', title: t('smartReply.contextual'), icon: 'bulb' },
    { id: 'emoji', title: t('smartReply.emoji'), icon: 'happy' },
    { id: 'action', title: t('smartReply.action'), icon: 'play' },
  ];

  useEffect(() => {
    if (visible) {
      generateSmartReplies();
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, lastMessage]);

  const generateSmartReplies = async () => {
    setIsLoading(true);
    
    // محاكاة تحليل الرسالة وإنتاج ردود ذكية
    setTimeout(() => {
      const replies = analyzeMessageAndGenerateReplies(lastMessage, messageContext, isGroup);
      setSmartReplies(replies);
      setIsLoading(false);
    }, 800);
  };

  const analyzeMessageAndGenerateReplies = (
    message: string, 
    context: string[], 
    isGroupChat: boolean
  ): SmartReply[] => {
    const lowerMessage = message.toLowerCase();
    const replies: SmartReply[] = [];

    // ردود سريعة عامة
    const quickReplies = [
      { text: t('smartReply.thanks'), confidence: 0.9 },
      { text: t('smartReply.ok'), confidence: 0.8 },
      { text: t('smartReply.yes'), confidence: 0.7 },
      { text: t('smartReply.no'), confidence: 0.6 },
      { text: t('smartReply.maybe'), confidence: 0.5 },
    ];

    quickReplies.forEach((reply, index) => {
      replies.push({
        id: `quick_${index}`,
        text: reply.text,
        type: 'quick',
        confidence: reply.confidence,
        category: 'quick',
      });
    });

    // ردود سياقية بناءً على محتوى الرسالة
    if (lowerMessage.includes('مرحبا') || lowerMessage.includes('السلام') || lowerMessage.includes('hello')) {
      replies.push({
        id: 'contextual_greeting',
        text: t('smartReply.greetingResponse'),
        type: 'contextual',
        confidence: 0.95,
        category: 'contextual',
      });
    }

    if (lowerMessage.includes('كيف حالك') || lowerMessage.includes('how are you')) {
      replies.push({
        id: 'contextual_wellbeing',
        text: t('smartReply.wellbeingResponse'),
        type: 'contextual',
        confidence: 0.9,
        category: 'contextual',
      });
    }

    if (lowerMessage.includes('شكرا') || lowerMessage.includes('thank')) {
      replies.push({
        id: 'contextual_thanks',
        text: t('smartReply.thanksResponse'),
        type: 'contextual',
        confidence: 0.85,
        category: 'contextual',
      });
    }

    if (lowerMessage.includes('متى') || lowerMessage.includes('when')) {
      replies.push({
        id: 'contextual_time',
        text: t('smartReply.timeResponse'),
        type: 'contextual',
        confidence: 0.8,
        category: 'contextual',
      });
    }

    if (lowerMessage.includes('أين') || lowerMessage.includes('where')) {
      replies.push({
        id: 'contextual_location',
        text: t('smartReply.locationResponse'),
        type: 'contextual',
        confidence: 0.8,
        category: 'contextual',
      });
    }

    // ردود بالإيموجي
    const emojiReplies = [
      { text: '👍', confidence: 0.9 },
      { text: '❤️', confidence: 0.8 },
      { text: '😊', confidence: 0.85 },
      { text: '🔥', confidence: 0.7 },
      { text: '💯', confidence: 0.75 },
      { text: '🙏', confidence: 0.8 },
    ];

    emojiReplies.forEach((emoji, index) => {
      replies.push({
        id: `emoji_${index}`,
        text: emoji.text,
        type: 'emoji',
        confidence: emoji.confidence,
        category: 'emoji',
      });
    });

    // ردود الإجراءات
    if (lowerMessage.includes('اجتماع') || lowerMessage.includes('meeting')) {
      replies.push({
        id: 'action_meeting',
        text: t('smartReply.scheduleMeeting'),
        type: 'action',
        confidence: 0.9,
        category: 'action',
      });
    }

    if (lowerMessage.includes('ملف') || lowerMessage.includes('file')) {
      replies.push({
        id: 'action_file',
        text: t('smartReply.sendFile'),
        type: 'action',
        confidence: 0.85,
        category: 'action',
      });
    }

    if (lowerMessage.includes('موقع') || lowerMessage.includes('location')) {
      replies.push({
        id: 'action_location',
        text: t('smartReply.shareLocation'),
        type: 'action',
        confidence: 0.8,
        category: 'action',
      });
    }

    // ردود خاصة بالمجموعات
    if (isGroupChat) {
      replies.push({
        id: 'group_mention',
        text: t('smartReply.mentionAll'),
        type: 'action',
        confidence: 0.7,
        category: 'action',
      });
    }

    // ترتيب الردود حسب الثقة
    return replies.sort((a, b) => b.confidence - a.confidence).slice(0, 12);
  };

  const getFilteredReplies = (): SmartReply[] => {
    if (selectedCategory === 'all') {
      return smartReplies;
    }
    return smartReplies.filter(reply => reply.category === selectedCategory);
  };

  const handleReplyPress = (reply: SmartReply) => {
    onReplySelect(reply.text);
    onClose();
  };

  const renderLoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <View key={item} style={styles.skeletonReply}>
          <Animated.View 
            style={[
              styles.skeletonContent,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.7],
                }),
              },
            ]}
          />
        </View>
      ))}
    </View>
  );

  const renderReplyItem = (reply: SmartReply) => {
    const getReplyIcon = () => {
      switch (reply.type) {
        case 'quick': return 'flash';
        case 'contextual': return 'bulb';
        case 'emoji': return 'happy';
        case 'action': return 'play';
        default: return 'chatbubble';
      }
    };

    const getReplyColor = () => {
      switch (reply.type) {
        case 'quick': return '#4CAF50';
        case 'contextual': return '#2196F3';
        case 'emoji': return '#FF9800';
        case 'action': return '#9C27B0';
        default: return '#8696A0';
      }
    };

    return (
      <TouchableOpacity
        key={reply.id}
        style={styles.replyItem}
        onPress={() => handleReplyPress(reply)}
        activeOpacity={0.7}
      >
        <View style={[styles.replyIcon, { backgroundColor: getReplyColor() }]}>
          <Ionicons name={getReplyIcon() as any} size={12} color="#ffffff" />
        </View>
        
        <Text style={[
          styles.replyText,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {reply.text}
        </Text>
        
        <View style={styles.confidenceIndicator}>
          <View 
            style={[
              styles.confidenceBar,
              { width: `${reply.confidence * 100}%` }
            ]} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [200, 0],
            }),
          }],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={20} color="#8E44AD" />
          <Text style={styles.headerTitle}>{t('smartReply.smartReplies')}</Text>
        </View>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color="#8696A0" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {replyCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategoryButton
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.id ? '#ffffff' : '#8696A0'} 
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.selectedCategoryText
            ]}>
              {category.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Replies */}
      <ScrollView 
        style={styles.repliesContainer}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          renderLoadingSkeleton()
        ) : (
          <View style={styles.repliesGrid}>
            {getFilteredReplies().map(renderReplyItem)}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('smartReply.poweredByAI')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 400,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  selectedCategoryButton: {
    backgroundColor: '#8E44AD',
  },
  categoryText: {
    fontSize: 12,
    color: '#8696A0',
    marginLeft: 4,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#ffffff',
  },
  repliesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  repliesGrid: {
    paddingVertical: 12,
  },
  replyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  replyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  replyText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  confidenceIndicator: {
    width: 30,
    height: 3,
    backgroundColor: '#E5E5EA',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginLeft: 8,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#25D366',
    borderRadius: 1.5,
  },
  loadingContainer: {
    paddingVertical: 12,
  },
  skeletonReply: {
    height: 44,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonContent: {
    flex: 1,
    backgroundColor: '#E5E5EA',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 11,
    color: '#8696A0',
    textAlign: 'center',
  },
});

export default WhatsAppSmartReply;
