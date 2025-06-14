import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ChatMessage } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { isRTL, getTextAlign } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

interface MessageSearchProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  onMessageSelect: (message: ChatMessage) => void;
}

const MessageSearch: React.FC<MessageSearchProps> = ({
  visible,
  onClose,
  roomId,
  onMessageSelect,
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { messages } = useChatStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searching, setSearching] = useState(false);

  const isRtl = isRTL(i18n.language);
  const roomMessages = messages[roomId] || [];

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performSearch = React.useCallback(async () => {
    setSearching(true);

    try {
      // Simulate search delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      const query = searchQuery.toLowerCase().trim();
      const results = roomMessages.filter(message =>
        message.content.toLowerCase().includes(query)
      );

      // Sort by relevance (exact matches first, then by date)
      const sortedResults = results.sort((a, b) => {
        const aExact = a.content.toLowerCase() === query;
        const bExact = b.content.toLowerCase() === query;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Sort by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, roomMessages]);

  const handleMessagePress = (message: ChatMessage) => {
    onMessageSelect(message);
    onClose();
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={index} style={styles.highlightedText}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return date.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInDays === 1) {
      return t('common.yesterday');
    } else if (diffInDays < 7) {
      return date.toLocaleDateString(i18n.language, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(i18n.language, {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderSearchResult = ({ item }: { item: ChatMessage }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        { backgroundColor: theme.colors.surface },
        isRtl && styles.resultItemRtl
      ]}
      onPress={() => handleMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultContent, isRtl && styles.resultContentRtl]}>
        <View style={styles.resultHeader}>
          <Text style={[
            styles.senderName,
            { 
              color: theme.colors.primary,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {item.sender?.full_name || 'Unknown'}
          </Text>
          <Text style={[styles.messageTime, { color: theme.colors.textMuted }]}>
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
        
        <Text style={[
          styles.messageContent,
          { 
            color: theme.colors.text,
            textAlign: getTextAlign(i18n.language),
          }
        ]} numberOfLines={2}>
          {highlightText(item.content, searchQuery)}
        </Text>
        
        {item.message_type !== 'text' && (
          <View style={[styles.fileIndicator, isRtl && styles.fileIndicatorRtl]}>
            <Ionicons
              name={item.message_type === 'image' ? 'image-outline' : 'document-outline'}
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.fileText, { color: theme.colors.textSecondary }]}>
              {item.message_type === 'image' ? t('chat.image') : t('chat.file')}
            </Text>
          </View>
        )}
      </View>
      
      <Ionicons 
        name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"} 
        size={20} 
        color={theme.colors.textMuted} 
      />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.trim().length === 0 ? (
        <>
          <Ionicons name="search-outline" size={60} color={theme.colors.textMuted} />
          <Text style={[
            styles.emptyText,
            { 
              color: theme.colors.textSecondary,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {t('chat.searchMessages')}
          </Text>
          <Text style={[
            styles.emptySubtext,
            { 
              color: theme.colors.textMuted,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {t('chat.searchMessagesDescription')}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="search-outline" size={60} color={theme.colors.textMuted} />
          <Text style={[
            styles.emptyText,
            { 
              color: theme.colors.textSecondary,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {t('chat.noSearchResults')}
          </Text>
          <Text style={[
            styles.emptySubtext,
            { 
              color: theme.colors.textMuted,
              textAlign: getTextAlign(i18n.language),
            }
          ]}>
            {t('chat.tryDifferentKeywords')}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
          {/* Header */}
          <LinearGradient
            colors={theme.mode === 'dark' ? ['#8fa4f3', '#6b82f0'] : ['#667eea', '#764ba2']}
            style={styles.header}
          >
            <View style={[styles.headerContent, isRtl && styles.headerContentRtl]}>
              <View style={styles.headerLeft}>
                <Ionicons name="search-outline" size={24} color="#ffffff" />
                <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('chat.searchInChat')}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Search Input */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[
                  styles.searchInput,
                  { 
                    color: theme.colors.text,
                    textAlign: getTextAlign(i18n.language),
                  }
                ]}
                placeholder={t('chat.searchPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searching && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </View>
          </View>

          {/* Results */}
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={searchResults.length === 0 ? styles.emptyListContainer : styles.resultsContainer}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContentRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  resultsContainer: {
    paddingHorizontal: 16,
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
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultItemRtl: {
    flexDirection: 'row-reverse',
  },
  resultContent: {
    flex: 1,
  },
  resultContentRtl: {
    // RTL specific styles if needed
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  highlightedText: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    fontWeight: 'bold',
  },
  fileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fileIndicatorRtl: {
    flexDirection: 'row-reverse',
  },
  fileText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default MessageSearch;
