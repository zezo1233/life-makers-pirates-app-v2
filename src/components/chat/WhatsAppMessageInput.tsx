import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppMessageInputProps {
  onSendMessage: (content: string, type: 'text' | 'image' | 'file') => void;
  onTyping?: (isTyping: boolean) => void;
  onShowMediaPicker?: () => void;
  onStartVoiceRecording?: () => void;
  onStopVoiceRecording?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isRecording?: boolean;
}

const WhatsAppMessageInput: React.FC<WhatsAppMessageInputProps> = ({
  onSendMessage,
  onTyping,
  onShowMediaPicker,
  onStartVoiceRecording,
  onStopVoiceRecording,
  placeholder,
  disabled = false,
  isRecording = false,
}) => {
  const { t, i18n } = useTranslation();
  const [message, setMessage] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const recordingAnimation = useRef(new Animated.Value(1)).current;
  const isRtl = isRTL(i18n.language);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      onTyping?.(false);
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    onTyping?.(text.length > 0);
  };

  const handleAttachmentPress = () => {
    onShowMediaPicker?.();
  };

  const handleVoicePress = () => {
    if (isRecording) {
      onStopVoiceRecording?.();
    } else {
      onStartVoiceRecording?.();
    }
  };

  const handleEmojiPress = () => {
    // TODO: إضافة لوحة الإيموجي
    Alert.alert(t('chat.emoji'), t('chat.emojiFeatureComingSoon'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {/* زر الإيموجي */}
        <TouchableOpacity 
          style={styles.emojiButton}
          onPress={handleEmojiPress}
          disabled={disabled}
        >
          <Ionicons name="happy-outline" size={24} color="#8696A0" />
        </TouchableOpacity>

        {/* حقل النص */}
        <TextInput
          ref={textInputRef}
          style={[
            styles.textInput,
            { textAlign: getTextAlign(i18n.language) },
            isRtl && styles.textInputRtl
          ]}
          placeholder={placeholder || t('chat.typeMessage')}
          placeholderTextColor="#8696A0"
          value={message}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSendMessage}
        />

        {/* زر المرفقات */}
        <TouchableOpacity 
          style={styles.attachmentButton}
          onPress={handleAttachmentPress}
          disabled={disabled}
        >
          <Ionicons name="attach" size={24} color="#8696A0" />
        </TouchableOpacity>
      </View>

      {/* زر الإرسال أو التسجيل الصوتي */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          isRecording && styles.recordingButton
        ]}
        onPress={message.trim() ? handleSendMessage : handleVoicePress}
        disabled={disabled}
      >
        {message.trim() ? (
          <Ionicons name="send" size={20} color="#ffffff" />
        ) : (
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={20}
            color="#ffffff"
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  emojiButton: {
    padding: 4,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 80,
  },
  textInputRtl: {
    textAlign: 'right',
  },
  attachmentButton: {
    padding: 4,
    marginLeft: 8,
    transform: [{ rotate: '45deg' }],
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordingButton: {
    backgroundColor: '#FF5722',
  },
});

export default WhatsAppMessageInput;
