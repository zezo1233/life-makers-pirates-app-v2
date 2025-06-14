import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppImagePreviewProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSend: (caption?: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppImagePreview: React.FC<WhatsAppImagePreviewProps> = ({
  visible,
  imageUri,
  onClose,
  onSend,
}) => {
  const { t, i18n } = useTranslation();
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const isRtl = isRTL(i18n.language);

  const handleSend = () => {
    onSend(caption.trim() || undefined);
    setCaption('');
    setShowCaptionInput(false);
  };

  const handleClose = () => {
    setCaption('');
    setShowCaptionInput(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {t('chat.imagePreview')}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCaptionInput(!showCaptionInput)}
          >
            <Ionicons name="text" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Caption Input */}
        {showCaptionInput && (
          <View style={styles.captionContainer}>
            <TextInput
              style={[
                styles.captionInput,
                { textAlign: getTextAlign(i18n.language) }
              ]}
              placeholder={t('chat.addCaption')}
              placeholderTextColor="#8696A0"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={200}
            />
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <View style={styles.controlsLeft}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                // TODO: إضافة ميزة التعديل
                alert(t('chat.editFeatureComingSoon'));
              }}
            >
              <Ionicons name="brush" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                // TODO: إضافة ميزة النص
                alert(t('chat.textFeatureComingSoon'));
              }}
            >
              <Ionicons name="text" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => {
                // TODO: إضافة ميزة الرسم
                alert(t('chat.drawFeatureComingSoon'));
              }}
            >
              <Ionicons name="pencil" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Ionicons name="send" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Image Info */}
        <View style={styles.imageInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="image" size={16} color="#8696A0" />
            <Text style={styles.infoText}>
              {t('chat.image')}
            </Text>
          </View>
          
          {caption.length > 0 && (
            <View style={styles.infoItem}>
              <Ionicons name="text" size={16} color="#8696A0" />
              <Text style={styles.infoText}>
                {caption.length}/200
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  image: {
    width: screenWidth - 32,
    height: screenHeight * 0.6,
    borderRadius: 12,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  captionInput: {
    fontSize: 16,
    color: '#ffffff',
    minHeight: 40,
    maxHeight: 100,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#8696A0',
    marginLeft: 4,
  },
});

export default WhatsAppImagePreview;
