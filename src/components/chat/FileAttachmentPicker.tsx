import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { fileUploadService, FileUploadResult } from '../../services/fileUploadService';
import { isRTL, getTextAlign } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';

interface FileAttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: FileUploadResult, messageType: 'image' | 'file') => void;
}

const FileAttachmentPicker: React.FC<FileAttachmentPickerProps> = ({
  visible,
  onClose,
  onFileSelected,
}) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isRtl = isRTL(i18n.language);

  const handleImageFromCamera = async () => {
    try {
      setUploading(true);
      
      const result = await fileUploadService.pickImage('camera');
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const uploadResult = await fileUploadService.uploadImage(
          asset.uri,
          asset.base64,
          (progress) => {
            setUploadProgress(progress.percentage);
          }
        );

        onFileSelected(uploadResult, 'image');
        onClose();
        
        Toast.show({
          type: 'success',
          text1: t('chat.imageUploaded'),
        });
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.uploadFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageFromGallery = async () => {
    try {
      setUploading(true);
      
      const result = await fileUploadService.pickImage('gallery');
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const uploadResult = await fileUploadService.uploadImage(
          asset.uri,
          asset.base64,
          (progress) => {
            setUploadProgress(progress.percentage);
          }
        );

        onFileSelected(uploadResult, 'image');
        onClose();
        
        Toast.show({
          type: 'success',
          text1: t('chat.imageUploaded'),
        });
      }
    } catch (error) {
      console.error('Gallery upload error:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.uploadFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDocumentPick = async () => {
    try {
      setUploading(true);
      
      const result = await fileUploadService.pickDocument();
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate file size (10MB limit)
        if (asset.size && !fileUploadService.validateFileSize(asset.size, 10)) {
          Alert.alert(
            t('errors.fileTooLarge'),
            t('chat.maxFileSize', { size: '10MB' })
          );
          return;
        }

        const uploadResult = await fileUploadService.uploadDocument(
          asset.uri,
          asset.name,
          asset.mimeType || 'application/octet-stream',
          (progress) => {
            setUploadProgress(progress.percentage);
          }
        );

        onFileSelected(uploadResult, 'file');
        onClose();
        
        Toast.show({
          type: 'success',
          text1: t('chat.fileUploaded'),
        });
      }
    } catch (error) {
      console.error('Document upload error:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.uploadFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const renderOption = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    color: string
  ) => (
    <TouchableOpacity
      style={[
        styles.option,
        { backgroundColor: theme.colors.surface },
        isRtl && styles.optionRtl
      ]}
      onPress={onPress}
      disabled={uploading}
      activeOpacity={0.7}
    >
      <View style={[styles.optionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={24} color="#ffffff" />
      </View>
      
      <View style={styles.optionText}>
        <Text style={[
          styles.optionTitle,
          { 
            color: theme.colors.text,
            textAlign: getTextAlign(i18n.language),
          }
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.optionSubtitle,
          { 
            color: theme.colors.textSecondary,
            textAlign: getTextAlign(i18n.language),
          }
        ]}>
          {subtitle}
        </Text>
      </View>
      
      <Ionicons 
        name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"} 
        size={20} 
        color={theme.colors.textMuted} 
      />
    </TouchableOpacity>
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
                <Ionicons name="attach-outline" size={24} color="#ffffff" />
                <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('chat.attachFile')}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Upload Progress */}
          {uploading && (
            <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                {t('chat.uploading')} {uploadProgress.toFixed(0)}%
              </Text>
            </View>
          )}

          {/* Options */}
          <View style={styles.optionsContainer}>
            {renderOption(
              'camera-outline',
              t('chat.takePhoto'),
              t('chat.takePhotoDescription'),
              handleImageFromCamera,
              '#4CAF50'
            )}

            {renderOption(
              'image-outline',
              t('chat.chooseFromGallery'),
              t('chat.chooseFromGalleryDescription'),
              handleImageFromGallery,
              '#2196F3'
            )}

            {renderOption(
              'document-outline',
              t('chat.chooseDocument'),
              t('chat.chooseDocumentDescription'),
              handleDocumentPick,
              '#FF9800'
            )}
          </View>

          {/* Info */}
          <View style={[styles.infoContainer, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[
              styles.infoText,
              { 
                color: theme.colors.textSecondary,
                textAlign: getTextAlign(i18n.language),
              }
            ]}>
              {t('chat.fileUploadInfo')}
            </Text>
          </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  progressText: {
    fontSize: 14,
    marginLeft: 12,
  },
  optionsContainer: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionRtl: {
    flexDirection: 'row-reverse',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default FileAttachmentPicker;
