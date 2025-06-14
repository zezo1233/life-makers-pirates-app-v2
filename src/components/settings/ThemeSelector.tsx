import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { isRTL, getTextAlign } from '../../i18n';

interface ThemeSelectorProps {
  visible: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ visible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { theme, themeMode, setThemeMode } = useTheme();
  const isRtl = isRTL(i18n.language);

  const themeOptions: { mode: ThemeMode; icon: string; title: string; description: string }[] = [
    {
      mode: 'light',
      icon: 'sunny-outline',
      title: t('settings.theme.light'),
      description: t('settings.theme.lightDescription'),
    },
    {
      mode: 'dark',
      icon: 'moon-outline',
      title: t('settings.theme.dark'),
      description: t('settings.theme.darkDescription'),
    },
    {
      mode: 'system',
      icon: 'phone-portrait-outline',
      title: t('settings.theme.system'),
      description: t('settings.theme.systemDescription'),
    },
  ];

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    onClose();
  };

  const renderThemeOption = (option: typeof themeOptions[0]) => {
    const isSelected = themeMode === option.mode;

    return (
      <TouchableOpacity
        key={option.mode}
        style={[
          styles.themeOption,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
          isSelected && styles.selectedOption,
          isRtl && styles.themeOptionRtl,
        ]}
        onPress={() => handleThemeSelect(option.mode)}
        activeOpacity={0.7}
      >
        <View style={[styles.themeOptionContent, isRtl && styles.themeOptionContentRtl]}>
          <View style={[
            styles.themeIconContainer,
            { backgroundColor: isSelected ? theme.colors.primary : theme.colors.border }
          ]}>
            <Ionicons 
              name={option.icon as any} 
              size={24} 
              color={isSelected ? '#ffffff' : theme.colors.textSecondary} 
            />
          </View>
          
          <View style={styles.themeTextContainer}>
            <Text style={[
              styles.themeTitle,
              { 
                color: theme.colors.text,
                textAlign: getTextAlign(i18n.language),
              }
            ]}>
              {option.title}
            </Text>
            <Text style={[
              styles.themeDescription,
              { 
                color: theme.colors.textSecondary,
                textAlign: getTextAlign(i18n.language),
              }
            ]}>
              {option.description}
            </Text>
          </View>
          
          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
                <Ionicons name="color-palette-outline" size={24} color="#ffffff" />
                <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('settings.theme.title')}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[
              styles.subtitle,
              { 
                color: theme.colors.textSecondary,
                textAlign: getTextAlign(i18n.language),
              }
            ]}>
              {t('settings.theme.subtitle')}
            </Text>

            {/* Theme Options */}
            <View style={styles.optionsContainer}>
              {themeOptions.map(renderThemeOption)}
            </View>

            {/* Preview */}
            <View style={[styles.previewContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[
                styles.previewTitle,
                { 
                  color: theme.colors.text,
                  textAlign: getTextAlign(i18n.language),
                }
              ]}>
                {t('settings.theme.preview')}
              </Text>
              
              <View style={styles.previewContent}>
                <View style={[styles.previewCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.previewHeader, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.previewHeaderText}>
                      {t('settings.theme.sampleCard')}
                    </Text>
                  </View>
                  <View style={styles.previewBody}>
                    <Text style={[styles.previewText, { color: theme.colors.text }]}>
                      {t('settings.theme.sampleText')}
                    </Text>
                    <Text style={[styles.previewSubtext, { color: theme.colors.textSecondary }]}>
                      {t('settings.theme.sampleSubtext')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  themeOption: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  themeOptionRtl: {
    // RTL specific styles if needed
  },
  selectedOption: {
    // Additional styles for selected option
  },
  themeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  themeOptionContentRtl: {
    flexDirection: 'row-reverse',
  },
  themeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  themeTextContainer: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  previewContainer: {
    borderRadius: 12,
    padding: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewCard: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    padding: 16,
    alignItems: 'center',
  },
  previewHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  previewBody: {
    padding: 16,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  previewSubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ThemeSelector;
