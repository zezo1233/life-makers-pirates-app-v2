import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppMessageSearchProps {
  visible: boolean;
  chatRoomId: string;
  onClose: () => void;
  onMessageSelect: (message: ChatMessage) => void;
  onSearchMessages: (query: string, filters: SearchFilters) => Promise<ChatMessage[]>;
}

interface SearchFilters {
  messageType?: 'all' | 'text' | 'image' | 'file' | 'voice';
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'custom';
  sender?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppMessageSearch: React.FC<WhatsAppMessageSearchProps> = ({
  visible,
  chatRoomId,
  onClose,
  onMessageSelect,
  onSearchMessages,
}) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    messageType: 'all',
    dateRange: 'all',
  });
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const results = await onSearchMessages(searchQuery, filters);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatMessageTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
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

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'file':
        return 'document';
      case 'voice':
        return 'mic';
      default:
        return 'chatbubble';
    }
  };

  const highlightSearchTerm = (text: string, query: string): string => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**'); // Simple highlighting marker
  };

  const renderSearchResult = ({ item }: { item: ChatMessage }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onMessageSelect(item)}
    >
      <View style={styles.resultHeader}>
        <View style={styles.messageTypeIcon}>
          <Ionicons 
            name={getMessageTypeIcon(item.message_type)} 
            size={16} 
            color="#25D366" 
          />
        </View>
        
        <Text style={styles.senderName}>
          {item.sender?.full_name || 'Unknown'}
        </Text>
        
        <Text style={styles.messageTime}>
          {formatMessageTime(item.created_at)}
        </Text>
      </View>
      
      <Text 
        style={[
          styles.messageContent,
          { textAlign: getTextAlign(i18n.language) }
        ]}
        numberOfLines={2}
      >
        {item.message_type === 'text' 
          ? item.content 
          : `${getMessageTypeLabel(item.message_type)}: ${item.content || ''}`
        }
      </Text>
    </TouchableOpacity>
  );

  const getMessageTypeLabel = (type: string): string => {
    switch (type) {
      case 'image':
        return t('chat.photo');
      case 'file':
        return t('chat.file');
      case 'voice':
        return t('chat.voiceMessage');
      default:
        return t('chat.message');
    }
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Message Type Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>{t('chat.messageType')}</Text>
        <View style={styles.filterOptions}>
          {['all', 'text', 'image', 'file', 'voice'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterOption,
                filters.messageType === type && styles.filterOptionActive
              ]}
              onPress={() => setFilters({ ...filters, messageType: type as any })}
            >
              <Text style={[
                styles.filterOptionText,
                filters.messageType === type && styles.filterOptionTextActive
              ]}>
                {t(`chat.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Date Range Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>{t('chat.dateRange')}</Text>
        <View style={styles.filterOptions}>
          {['all', 'today', 'week', 'month'].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterOption,
                filters.dateRange === range && styles.filterOptionActive
              ]}
              onPress={() => setFilters({ ...filters, dateRange: range as any })}
            >
              <Text style={[
                styles.filterOptionText,
                filters.dateRange === range && styles.filterOptionTextActive
              ]}>
                {t(`chat.${range}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8696A0" />
            <TextInput
              style={[
                styles.searchInput,
                { textAlign: getTextAlign(i18n.language) }
              ]}
              placeholder={t('chat.searchMessages')}
              placeholderTextColor="#8696A0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="options" 
              size={24} 
              color={showFilters ? "#ffffff" : "#E8F5E8"} 
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && renderFilters()}

        {/* Search Results */}
        <View style={styles.resultsContainer}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#25D366" />
              <Text style={styles.loadingText}>{t('chat.searching')}</Text>
            </View>
          ) : searchQuery.length < 2 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color="#E5E5EA" />
              <Text style={styles.emptyText}>{t('chat.searchHint')}</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text" size={64} color="#E5E5EA" />
              <Text style={styles.emptyText}>{t('chat.noResults')}</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsList}
            />
          )}
        </View>

        {/* Results Count */}
        {searchResults.length > 0 && (
          <View style={styles.resultsCount}>
            <Text style={styles.resultsCountText}>
              {t('chat.resultsCount', { count: searchResults.length })}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterOptionActive: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  filterOptionText: {
    fontSize: 12,
    color: '#8696A0',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8696A0',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8696A0',
    textAlign: 'center',
    marginTop: 16,
  },
  resultsList: {
    paddingVertical: 8,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageTypeIcon: {
    marginRight: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: '#8696A0',
  },
  messageContent: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 18,
  },
  resultsCount: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  resultsCountText: {
    fontSize: 12,
    color: '#8696A0',
    textAlign: 'center',
  },
});

export default WhatsAppMessageSearch;
