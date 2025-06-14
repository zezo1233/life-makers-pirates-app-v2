import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface ChatSearchBarProps {
  onSearch: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  onSearch,
  onFocus,
  onBlur,
  placeholder,
  autoFocus = false,
}) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isRtl = isRTL(i18n.language);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <View style={[
        styles.searchContainer,
        isFocused && styles.searchContainerFocused
      ]}>
        {/* أيقونة البحث */}
        <Ionicons 
          name="search" 
          size={20} 
          color={isFocused ? "#25D366" : "#8696A0"} 
          style={[styles.searchIcon, isRtl && styles.searchIconRtl]} 
        />

        {/* حقل البحث */}
        <TextInput
          style={[
            styles.searchInput,
            { textAlign: getTextAlign(i18n.language) }
          ]}
          placeholder={placeholder || t('chat.searchChats')}
          placeholderTextColor="#8696A0"
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {/* زر المسح */}
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={clearSearch}
            style={[styles.clearButton, isRtl && styles.clearButtonRtl]}
          >
            <Ionicons name="close-circle" size={20} color="#8696A0" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchIconRtl: {
    marginRight: 0,
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearButtonRtl: {
    marginLeft: 0,
    marginRight: 8,
  },
});

export default ChatSearchBar;
