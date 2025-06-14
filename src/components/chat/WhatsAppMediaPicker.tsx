import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppMediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onGalleryPress: () => void;
  onDocumentPress: () => void;
  onLocationPress: () => void;
  onContactPress: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppMediaPicker: React.FC<WhatsAppMediaPickerProps> = ({
  visible,
  onClose,
  onCameraPress,
  onGalleryPress,
  onDocumentPress,
  onLocationPress,
  onContactPress,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);

  const mediaOptions = [
    {
      id: 'camera',
      title: t('chat.camera'),
      subtitle: t('chat.takePhoto'),
      icon: 'camera',
      color: '#FF5722',
      onPress: onCameraPress,
    },
    {
      id: 'gallery',
      title: t('chat.gallery'),
      subtitle: t('chat.selectPhoto'),
      icon: 'images',
      color: '#9C27B0',
      onPress: onGalleryPress,
    },
    {
      id: 'document',
      title: t('chat.document'),
      subtitle: t('chat.selectDocument'),
      icon: 'document-text',
      color: '#2196F3',
      onPress: onDocumentPress,
    },
    {
      id: 'location',
      title: t('chat.location'),
      subtitle: t('chat.shareLocation'),
      icon: 'location',
      color: '#4CAF50',
      onPress: onLocationPress,
    },
    {
      id: 'contact',
      title: t('chat.contact'),
      subtitle: t('chat.shareContact'),
      icon: 'person',
      color: '#FF9800',
      onPress: onContactPress,
    },
  ];

  const handleOptionPress = (option: typeof mediaOptions[0]) => {
    onClose();
    setTimeout(() => {
      option.onPress();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[
              styles.title,
              { textAlign: getTextAlign(i18n.language) }
            ]}>
              {t('chat.selectAttachment')}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#8696A0" />
            </TouchableOpacity>
          </View>

          {/* Media Options */}
          <ScrollView 
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {mediaOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  index === mediaOptions.length - 1 && styles.lastOptionItem
                ]}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon as any} size={24} color="#ffffff" />
                </View>
                
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    { textAlign: getTextAlign(i18n.language) }
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={[
                    styles.optionSubtitle,
                    { textAlign: getTextAlign(i18n.language) }
                  ]}>
                    {option.subtitle}
                  </Text>
                </View>

                <Ionicons 
                  name={isRtl ? "chevron-back" : "chevron-forward"} 
                  size={20} 
                  color="#8696A0" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#FF5722' }]}
              onPress={() => handleOptionPress(mediaOptions[0])}
            >
              <Ionicons name="camera" size={28} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#9C27B0' }]}
              onPress={() => handleOptionPress(mediaOptions[1])}
            >
              <Ionicons name="images" size={28} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}
              onPress={() => handleOptionPress(mediaOptions[2])}
            >
              <Ionicons name="document-text" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.7,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  lastOptionItem: {
    borderBottomWidth: 0,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#8696A0',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingTop: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  quickActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default WhatsAppMediaPicker;
