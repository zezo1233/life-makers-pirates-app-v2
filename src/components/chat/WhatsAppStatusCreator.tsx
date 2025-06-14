import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppStatusCreatorProps {
  visible: boolean;
  onClose: () => void;
  onCreateStatus: (statusData: StatusCreationData) => void;
}

interface StatusCreationData {
  contentType: 'text' | 'image' | 'video';
  textContent?: string;
  contentUrl?: string;
  backgroundColor?: string;
  backgroundGradient?: string[];
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  musicUrl?: string;
  musicTitle?: string;
  privacySetting: 'public' | 'contacts' | 'close_friends' | 'custom';
  duration?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppStatusCreator: React.FC<WhatsAppStatusCreatorProps> = ({
  visible,
  onClose,
  onCreateStatus,
}) => {
  const { t, i18n } = useTranslation();
  const [statusType, setStatusType] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState('#25D366');
  const [selectedFont, setSelectedFont] = useState('System');
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#ffffff');
  const [privacySetting, setPrivacySetting] = useState<'public' | 'contacts' | 'close_friends'>('contacts');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const isRtl = isRTL(i18n.language);

  const backgroundColors = [
    '#25D366', '#128C7E', '#34B7F1', '#9C27B0',
    '#E91E63', '#FF5722', '#FF9800', '#4CAF50',
    '#2196F3', '#673AB7', '#795548', '#607D8B',
  ];

  const gradientBackgrounds = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'],
    ['#ffecd2', '#fcb69f'],
  ];

  const fontFamilies = [
    { name: 'System', label: t('status.systemFont') },
    { name: 'Arial', label: 'Arial' },
    { name: 'Helvetica', label: 'Helvetica' },
    { name: 'Times', label: 'Times New Roman' },
    { name: 'Courier', label: 'Courier New' },
  ];

  const fontSizes = [16, 20, 24, 28, 32, 36, 40];

  const textColors = [
    '#ffffff', '#000000', '#25D366', '#128C7E',
    '#34B7F1', '#9C27B0', '#E91E63', '#FF5722',
  ];

  const handleCreateStatus = () => {
    if (statusType === 'text' && !textContent.trim()) {
      Alert.alert(t('status.error'), t('status.pleaseEnterText'));
      return;
    }

    const statusData: StatusCreationData = {
      contentType: statusType === 'text' ? 'text' : 'image',
      textContent: statusType === 'text' ? textContent.trim() : undefined,
      backgroundColor: selectedBackground,
      fontFamily: selectedFont,
      fontSize,
      textColor,
      privacySetting,
      duration: 86400, // 24 hours
    };

    onCreateStatus(statusData);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTextContent('');
    setSelectedBackground('#25D366');
    setSelectedFont('System');
    setFontSize(24);
    setTextColor('#ffffff');
    setPrivacySetting('contacts');
    setStatusType('text');
  };

  const handleMediaPicker = () => {
    Alert.alert(
      t('status.selectMedia'),
      t('status.chooseMediaType'),
      [
        {
          text: t('status.camera'),
          onPress: () => {
            // TODO: Open camera
            Alert.alert(t('status.camera'), t('status.cameraFeatureComingSoon'));
          },
        },
        {
          text: t('status.gallery'),
          onPress: () => {
            // TODO: Open gallery
            Alert.alert(t('status.gallery'), t('status.galleryFeatureComingSoon'));
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const renderTextStatusPreview = () => (
    <View style={[
      styles.previewContainer,
      { backgroundColor: selectedBackground }
    ]}>
      <Text style={[
        styles.previewText,
        {
          fontFamily: selectedFont,
          fontSize: fontSize,
          color: textColor,
          textAlign: getTextAlign(i18n.language),
        }
      ]}>
        {textContent || t('status.enterTextHere')}
      </Text>
    </View>
  );

  const renderColorPicker = () => (
    <Modal
      visible={showColorPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowColorPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.colorPickerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('status.selectBackground')}</Text>
            <TouchableOpacity onPress={() => setShowColorPicker(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('status.solidColors')}</Text>
          <View style={styles.colorGrid}>
            {backgroundColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorOption, { backgroundColor: color }]}
                onPress={() => {
                  setSelectedBackground(color);
                  setShowColorPicker(false);
                }}
              >
                {selectedBackground === color && (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('status.gradients')}</Text>
          <View style={styles.colorGrid}>
            {gradientBackgrounds.map((gradient, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorOption,
                  { backgroundColor: gradient[0] } // Simplified for now
                ]}
                onPress={() => {
                  setSelectedBackground(gradient[0]);
                  setShowColorPicker(false);
                }}
              >
                {selectedBackground === gradient[0] && (
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderFontPicker = () => (
    <Modal
      visible={showFontPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFontPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fontPickerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('status.textSettings')}</Text>
            <TouchableOpacity onPress={() => setShowFontPicker(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('status.fontFamily')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.fontFamilyContainer}>
              {fontFamilies.map((font) => (
                <TouchableOpacity
                  key={font.name}
                  style={[
                    styles.fontOption,
                    selectedFont === font.name && styles.selectedFontOption
                  ]}
                  onPress={() => setSelectedFont(font.name)}
                >
                  <Text style={[styles.fontOptionText, { fontFamily: font.name }]}>
                    {font.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>{t('status.fontSize')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.fontSizeContainer}>
              {fontSizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.fontSizeOption,
                    fontSize === size && styles.selectedFontSizeOption
                  ]}
                  onPress={() => setFontSize(size)}
                >
                  <Text style={styles.fontSizeText}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.sectionTitle}>{t('status.textColor')}</Text>
          <View style={styles.colorGrid}>
            {textColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.textColorOption, { backgroundColor: color }]}
                onPress={() => setTextColor(color)}
              >
                {textColor === color && (
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={color === '#ffffff' ? '#000000' : '#ffffff'} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPrivacySettings = () => (
    <Modal
      visible={showPrivacySettings}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPrivacySettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.privacyContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('status.privacySettings')}</Text>
            <TouchableOpacity onPress={() => setShowPrivacySettings(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          {[
            { key: 'public', icon: 'globe', title: t('status.public'), desc: t('status.publicDesc') },
            { key: 'contacts', icon: 'people', title: t('status.contacts'), desc: t('status.contactsDesc') },
            { key: 'close_friends', icon: 'heart', title: t('status.closeFriends'), desc: t('status.closeFriendsDesc') },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.privacyOption,
                privacySetting === option.key && styles.selectedPrivacyOption
              ]}
              onPress={() => {
                setPrivacySetting(option.key as any);
                setShowPrivacySettings(false);
              }}
            >
              <Ionicons name={option.icon as any} size={24} color="#25D366" />
              <View style={styles.privacyOptionContent}>
                <Text style={styles.privacyOptionTitle}>{option.title}</Text>
                <Text style={styles.privacyOptionDesc}>{option.desc}</Text>
              </View>
              {privacySetting === option.key && (
                <Ionicons name="checkmark-circle" size={24} color="#25D366" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="#25D366" barStyle="light-content" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{t('status.createStatus')}</Text>
          
          <TouchableOpacity style={styles.headerButton} onPress={handleCreateStatus}>
            <Ionicons name="checkmark" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, statusType === 'text' && styles.activeTypeButton]}
            onPress={() => setStatusType('text')}
          >
            <Ionicons name="text" size={20} color={statusType === 'text' ? '#ffffff' : '#25D366'} />
            <Text style={[
              styles.typeButtonText,
              statusType === 'text' && styles.activeTypeButtonText
            ]}>
              {t('status.text')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.typeButton, statusType === 'media' && styles.activeTypeButton]}
            onPress={() => setStatusType('media')}
          >
            <Ionicons name="camera" size={20} color={statusType === 'media' ? '#ffffff' : '#25D366'} />
            <Text style={[
              styles.typeButtonText,
              statusType === 'media' && styles.activeTypeButtonText
            ]}>
              {t('status.media')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {statusType === 'text' ? (
            <>
              {/* Text Status Preview */}
              {renderTextStatusPreview()}
              
              {/* Text Input */}
              <TextInput
                style={[
                  styles.textInput,
                  { textAlign: getTextAlign(i18n.language) }
                ]}
                placeholder={t('status.enterYourStatus')}
                placeholderTextColor="#8696A0"
                value={textContent}
                onChangeText={setTextContent}
                multiline
                maxLength={300}
              />
              
              {/* Text Tools */}
              <View style={styles.textTools}>
                <TouchableOpacity style={styles.toolButton} onPress={() => setShowColorPicker(true)}>
                  <Ionicons name="color-palette" size={20} color="#25D366" />
                  <Text style={styles.toolButtonText}>{t('status.background')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolButton} onPress={() => setShowFontPicker(true)}>
                  <Ionicons name="text" size={20} color="#25D366" />
                  <Text style={styles.toolButtonText}>{t('status.font')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.toolButton}>
                  <Ionicons name="musical-notes" size={20} color="#25D366" />
                  <Text style={styles.toolButtonText}>{t('status.music')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Media Status */
            <View style={styles.mediaContainer}>
              <TouchableOpacity style={styles.mediaButton} onPress={handleMediaPicker}>
                <Ionicons name="camera" size={48} color="#25D366" />
                <Text style={styles.mediaButtonText}>{t('status.addPhoto')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.privacyButton} onPress={() => setShowPrivacySettings(true)}>
            <Ionicons name="eye" size={20} color="#25D366" />
            <Text style={styles.privacyButtonText}>
              {t(`status.${privacySetting}`)}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#8696A0" />
          </TouchableOpacity>
        </View>

        {/* Modals */}
        {renderColorPicker()}
        {renderFontPicker()}
        {renderPrivacySettings()}
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
    justifyContent: 'space-between',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  activeTypeButton: {
    backgroundColor: '#25D366',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#25D366',
    marginLeft: 8,
  },
  activeTypeButtonText: {
    color: '#ffffff',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewContainer: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  previewText: {
    fontWeight: '600',
    lineHeight: 32,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    minHeight: 100,
    marginBottom: 16,
  },
  textTools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  toolButton: {
    alignItems: 'center',
    padding: 12,
  },
  toolButtonText: {
    fontSize: 12,
    color: '#25D366',
    marginTop: 4,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaButton: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: '#25D366',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  mediaButtonText: {
    fontSize: 16,
    color: '#25D366',
    marginTop: 12,
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  privacyButtonText: {
    fontSize: 14,
    color: '#25D366',
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  colorPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: screenHeight * 0.7,
  },
  fontPickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: screenHeight * 0.8,
  },
  privacyContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25D366',
    marginTop: 20,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontFamilyContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  fontOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    marginRight: 8,
  },
  selectedFontOption: {
    backgroundColor: '#25D366',
  },
  fontOptionText: {
    fontSize: 14,
    color: '#000000',
  },
  fontSizeContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  fontSizeOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedFontSizeOption: {
    backgroundColor: '#25D366',
  },
  fontSizeText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  textColorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedPrivacyOption: {
    backgroundColor: '#F0F8FF',
  },
  privacyOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  privacyOptionDesc: {
    fontSize: 12,
    color: '#8696A0',
  },
});

export default WhatsAppStatusCreator;
