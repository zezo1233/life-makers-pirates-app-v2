/**
 * 🧩 مكون طلب المحادثة
 * للحالات التي تتطلب موافقة أو لها قيود خاصة
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';
import ChatPermissionService from '../../services/ChatPermissionService';
import { useAuthStore } from '../../store/authStore';

interface User {
  id: string;
  full_name: string;
  role: string;
  specialization?: string;
}

interface ChatRequestModalProps {
  visible: boolean;
  onClose: () => void;
  targetUser?: User;
  onSuccess?: () => void;
}

const ChatRequestModal: React.FC<ChatRequestModalProps> = ({
  visible,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
  } | null>(null);

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (visible && user && targetUser) {
      checkPermissions();
    }
  }, [visible, user, targetUser]);

  const checkPermissions = () => {
    if (!user || !targetUser) return;

    const currentUser = {
      id: user.id,
      full_name: user.full_name || user.email,
      role: user.role,
      specialization: user.specialization
    };

    const permission = ChatPermissionService.canCreateDirectChat(currentUser, targetUser);
    setPermissionCheck(permission);
  };

  const handleSubmitRequest = async () => {
    if (!user || !targetUser) return;

    setIsLoading(true);
    try {
      const currentUser = {
        id: user.id,
        full_name: user.full_name || user.email,
        role: user.role,
        specialization: user.specialization
      };

      if (permissionCheck?.allowed && !permissionCheck.requiresApproval) {
        // إنشاء محادثة مباشرة
        const chatId = await ChatPermissionService.createAutoDirectChat(currentUser, targetUser);
        if (chatId) {
          Alert.alert(
            t('common.success'),
            t('chat.chatCreated'),
            [{ text: t('common.ok'), onPress: () => {
              onSuccess?.();
              onClose();
            }}]
          );
        } else {
          throw new Error('فشل في إنشاء المحادثة');
        }
      } else if (permissionCheck?.requiresApproval) {
        // إرسال طلب موافقة
        const success = await ChatPermissionService.requestChatPermission(
          currentUser,
          targetUser,
          reason
        );
        
        if (success) {
          Alert.alert(
            t('common.success'),
            t('chat.requestSent'),
            [{ text: t('common.ok'), onPress: onClose }]
          );
        } else {
          throw new Error('فشل في إرسال الطلب');
        }
      }
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error.message || t('chat.requestFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPermissionStatus = () => {
    if (!permissionCheck) return null;

    if (permissionCheck.allowed && !permissionCheck.requiresApproval) {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, styles.successIcon]}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
          <Text style={[styles.statusText, styles.successText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('chat.directChatAllowed')}
          </Text>
        </View>
      );
    }

    if (permissionCheck.requiresApproval) {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusIcon, styles.warningIcon]}>
            <Ionicons name="time" size={24} color="#FF9800" />
          </View>
          <Text style={[styles.statusText, styles.warningText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('chat.requiresApproval')}
          </Text>
          <Text style={[styles.statusDescription, { textAlign: getTextAlign(i18n.language) }]}>
            {permissionCheck.reason}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statusContainer}>
        <View style={[styles.statusIcon, styles.errorIcon]}>
          <Ionicons name="close-circle" size={24} color="#F44336" />
        </View>
        <Text style={[styles.statusText, styles.errorText, { textAlign: getTextAlign(i18n.language) }]}>
          {t('chat.chatNotAllowed')}
        </Text>
        <Text style={[styles.statusDescription, { textAlign: getTextAlign(i18n.language) }]}>
          {permissionCheck.reason}
        </Text>
      </View>
    );
  };

  const canProceed = permissionCheck?.allowed || false;
  const needsReason = permissionCheck?.requiresApproval || false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
              {t('chat.requestChat')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Target User Info */}
            {targetUser && (
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={24} color="#25D366" />
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { textAlign: getTextAlign(i18n.language) }]}>
                    {targetUser.full_name}
                  </Text>
                  <Text style={[styles.userRole, { textAlign: getTextAlign(i18n.language) }]}>
                    {t(`roles.${targetUser.role}`)}
                  </Text>
                  {targetUser.specialization && (
                    <Text style={[styles.userSpec, { textAlign: getTextAlign(i18n.language) }]}>
                      {t(`specializations.${targetUser.specialization}`)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Permission Status */}
            {renderPermissionStatus()}

            {/* Reason Input (if needed) */}
            {needsReason && (
              <View style={styles.reasonContainer}>
                <Text style={[styles.reasonLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('chat.requestReason')}
                </Text>
                <TextInput
                  style={[
                    styles.reasonInput,
                    { textAlign: getTextAlign(i18n.language) }
                  ]}
                  placeholder={t('chat.requestReasonPlaceholder')}
                  placeholderTextColor="#999"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.charCount}>
                  {reason.length}/500
                </Text>
              </View>
            )}

            {/* Rules Info */}
            <View style={styles.rulesContainer}>
              <Text style={[styles.rulesTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {t('chat.chatRules')}
              </Text>
              <Text style={[styles.rulesText, { textAlign: getTextAlign(i18n.language) }]}>
                {getChatRulesForRoles(user?.role, targetUser?.role)}
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (!canProceed || isLoading) && styles.disabledButton
              ]}
              onPress={handleSubmitRequest}
              disabled={!canProceed || isLoading}
            >
              <Text style={[
                styles.submitButtonText,
                (!canProceed || isLoading) && styles.disabledButtonText
              ]}>
                {isLoading ? t('common.loading') : 
                 needsReason ? t('chat.sendRequest') : t('chat.createChat')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getChatRulesForRoles = (sourceRole?: string, targetRole?: string): string => {
  if (!sourceRole || !targetRole) return '';

  const rules = {
    'DV-CC': '🟦 مسؤولو التنمية يمكنهم التواصل مباشرة مع مسؤولي الإدارة',
    'SV-TR': '🟩 المتابعون والمدربون يمكنهم التواصل في نفس التخصص فقط',
    'PM-*': '🟨 مسؤول المشروع يحتاج موافقة للتواصل مع المستخدمين',
  };

  const key = `${sourceRole}-${targetRole}`;
  const reverseKey = `${targetRole}-${sourceRole}`;
  
  return rules[key] || rules[reverseKey] || rules[`${sourceRole}-*`] || 
         'يرجى مراجعة قواعد المحادثات للتأكد من الصلاحيات';
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  userSpec: {
    fontSize: 12,
    color: '#999999',
  },
  statusContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  successIcon: {},
  warningIcon: {},
  errorIcon: {},
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  successText: {
    color: '#4CAF50',
  },
  warningText: {
    color: '#FF9800',
  },
  errorText: {
    color: '#F44336',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  reasonContainer: {
    paddingVertical: 16,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
  },
  rulesContainer: {
    paddingVertical: 16,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#25D366',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#999999',
  },
});

export default ChatRequestModal;
