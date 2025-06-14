import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppSecuritySettingsProps {
  visible: boolean;
  onClose: () => void;
  onUpdateSettings: (settings: SecuritySettings) => void;
}

interface SecuritySettings {
  endToEndEncryption: boolean;
  hideLastSeen: boolean;
  hideProfilePhoto: boolean;
  hideStatus: boolean;
  readReceipts: boolean;
  disappearingMessages: boolean;
  disappearingMessagesDuration: number; // in hours
  blockScreenshots: boolean;
  requireBiometric: boolean;
  autoLockTime: number; // in minutes
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppSecuritySettings: React.FC<WhatsAppSecuritySettingsProps> = ({
  visible,
  onClose,
  onUpdateSettings,
}) => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SecuritySettings>({
    endToEndEncryption: true,
    hideLastSeen: false,
    hideProfilePhoto: false,
    hideStatus: false,
    readReceipts: true,
    disappearingMessages: false,
    disappearingMessagesDuration: 24,
    blockScreenshots: false,
    requireBiometric: false,
    autoLockTime: 0,
  });

  const isRtl = isRTL(i18n.language);

  const handleSettingChange = (key: keyof SecuritySettings, value: boolean | number) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdateSettings(newSettings);
  };

  const showDisappearingMessageOptions = () => {
    Alert.alert(
      t('security.disappearingMessages'),
      t('security.selectDuration'),
      [
        { text: '1 ' + t('security.hour'), onPress: () => handleSettingChange('disappearingMessagesDuration', 1) },
        { text: '24 ' + t('security.hours'), onPress: () => handleSettingChange('disappearingMessagesDuration', 24) },
        { text: '7 ' + t('security.days'), onPress: () => handleSettingChange('disappearingMessagesDuration', 168) },
        { text: '30 ' + t('security.days'), onPress: () => handleSettingChange('disappearingMessagesDuration', 720) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const showAutoLockOptions = () => {
    Alert.alert(
      t('security.autoLock'),
      t('security.selectAutoLockTime'),
      [
        { text: t('security.immediately'), onPress: () => handleSettingChange('autoLockTime', 0) },
        { text: '1 ' + t('security.minute'), onPress: () => handleSettingChange('autoLockTime', 1) },
        { text: '5 ' + t('security.minutes'), onPress: () => handleSettingChange('autoLockTime', 5) },
        { text: '15 ' + t('security.minutes'), onPress: () => handleSettingChange('autoLockTime', 15) },
        { text: '30 ' + t('security.minutes'), onPress: () => handleSettingChange('autoLockTime', 30) },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const getDurationText = (hours: number): string => {
    if (hours < 24) {
      return `${hours} ${hours === 1 ? t('security.hour') : t('security.hours')}`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? t('security.day') : t('security.days')}`;
    }
  };

  const getAutoLockText = (minutes: number): string => {
    if (minutes === 0) return t('security.immediately');
    if (minutes === 1) return `1 ${t('security.minute')}`;
    return `${minutes} ${t('security.minutes')}`;
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color={disabled ? "#CCCCCC" : "#25D366"} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle,
          { textAlign: getTextAlign(i18n.language) },
          disabled && styles.settingTitleDisabled
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.settingDescription,
          { textAlign: getTextAlign(i18n.language) },
          disabled && styles.settingDescriptionDisabled
        ]}>
          {description}
        </Text>
      </View>
      
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#E5E5EA', true: '#25D366' }}
        thumbColor="#ffffff"
      />
    </View>
  );

  const renderActionItem = (
    icon: string,
    title: string,
    description: string,
    value: string,
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color="#25D366" />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { textAlign: getTextAlign(i18n.language) }]}>
          {description}
        </Text>
      </View>
      
      <View style={styles.actionValue}>
        <Text style={styles.actionValueText}>{value}</Text>
        <Ionicons name={isRtl ? "chevron-back" : "chevron-forward"} size={16} color="#8696A0" />
      </View>
    </TouchableOpacity>
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
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {t('security.securitySettings')}
          </Text>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Encryption Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('security.encryption')}</Text>
            
            {renderSettingItem(
              'shield-checkmark',
              t('security.endToEndEncryption'),
              t('security.endToEndEncryptionDesc'),
              settings.endToEndEncryption,
              (value) => handleSettingChange('endToEndEncryption', value),
              true // Always enabled for security
            )}
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('security.privacy')}</Text>
            
            {renderSettingItem(
              'eye-off',
              t('security.hideLastSeen'),
              t('security.hideLastSeenDesc'),
              settings.hideLastSeen,
              (value) => handleSettingChange('hideLastSeen', value)
            )}
            
            {renderSettingItem(
              'person',
              t('security.hideProfilePhoto'),
              t('security.hideProfilePhotoDesc'),
              settings.hideProfilePhoto,
              (value) => handleSettingChange('hideProfilePhoto', value)
            )}
            
            {renderSettingItem(
              'radio',
              t('security.hideStatus'),
              t('security.hideStatusDesc'),
              settings.hideStatus,
              (value) => handleSettingChange('hideStatus', value)
            )}
          </View>

          {/* Messages Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('security.messages')}</Text>
            
            {renderSettingItem(
              'checkmark-done',
              t('security.readReceipts'),
              t('security.readReceiptsDesc'),
              settings.readReceipts,
              (value) => handleSettingChange('readReceipts', value)
            )}
            
            {renderSettingItem(
              'timer',
              t('security.disappearingMessages'),
              t('security.disappearingMessagesDesc'),
              settings.disappearingMessages,
              (value) => handleSettingChange('disappearingMessages', value)
            )}
            
            {settings.disappearingMessages && renderActionItem(
              'time',
              t('security.messageDuration'),
              t('security.messageDurationDesc'),
              getDurationText(settings.disappearingMessagesDuration),
              showDisappearingMessageOptions
            )}
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('security.appSecurity')}</Text>
            
            {renderSettingItem(
              'camera-off',
              t('security.blockScreenshots'),
              t('security.blockScreenshotsDesc'),
              settings.blockScreenshots,
              (value) => handleSettingChange('blockScreenshots', value)
            )}
            
            {renderSettingItem(
              'finger-print',
              t('security.requireBiometric'),
              t('security.requireBiometricDesc'),
              settings.requireBiometric,
              (value) => handleSettingChange('requireBiometric', value)
            )}
            
            {settings.requireBiometric && renderActionItem(
              'lock-closed',
              t('security.autoLock'),
              t('security.autoLockDesc'),
              getAutoLockText(settings.autoLockTime),
              showAutoLockOptions
            )}
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={20} color="#25D366" />
              <Text style={[styles.infoText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('security.securityInfo')}
              </Text>
            </View>
          </View>
        </ScrollView>
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
    paddingTop: 50,
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25D366',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: '#CCCCCC',
  },
  settingDescription: {
    fontSize: 12,
    color: '#8696A0',
    lineHeight: 16,
  },
  settingDescriptionDisabled: {
    color: '#CCCCCC',
  },
  actionValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionValueText: {
    fontSize: 14,
    color: '#8696A0',
    marginRight: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
  },
  infoText: {
    fontSize: 12,
    color: '#25D366',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});

export default WhatsAppSecuritySettings;
