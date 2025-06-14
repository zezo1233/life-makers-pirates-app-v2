import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { securityService } from '../../services/securityService';
import { isRTL, getTextAlign } from '../../i18n';

interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number;
  sessionTimeout: number;
  encryptionEnabled: boolean;
  auditLogging: boolean;
}

const SecuritySettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SecuritySettings>({
    biometricEnabled: false,
    pinEnabled: false,
    autoLockEnabled: true,
    autoLockTimeout: 5,
    sessionTimeout: 30,
    encryptionEnabled: true,
    auditLogging: true,
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await securityService.getSecuritySettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    const available = await securityService.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const updateSetting = async (key: keyof SecuritySettings, value: any) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      await securityService.updateSecuritySettings({ [key]: value });
    } catch (error) {
      console.error('Error updating security setting:', error);
      Alert.alert('خطأ', 'فشل في تحديث الإعداد');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        'غير متاح',
        'المصادقة البيومترية غير متاحة على هذا الجهاز'
      );
      return;
    }

    if (enabled) {
      const success = await securityService.authenticateWithBiometric();
      if (success) {
        await updateSetting('biometricEnabled', true);
      }
    } else {
      await updateSetting('biometricEnabled', false);
    }
  };

  const handlePinToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowPinModal(true);
    } else {
      Alert.alert(
        'إزالة الرقم السري',
        'هل أنت متأكد من إزالة الرقم السري؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إزالة',
            style: 'destructive',
            onPress: async () => {
              await securityService.removePIN();
              await updateSetting('pinEnabled', false);
            }
          }
        ]
      );
    }
  };

  const handleSetPin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('خطأ', 'الرقم السري يجب أن يكون 4 أرقام على الأقل');
      return;
    }

    if (pinInput !== confirmPinInput) {
      Alert.alert('خطأ', 'الرقم السري غير متطابق');
      return;
    }

    try {
      await securityService.setPIN(pinInput);
      await updateSetting('pinEnabled', true);
      setShowPinModal(false);
      setPinInput('');
      setConfirmPinInput('');
      Alert.alert('تم', 'تم تعيين الرقم السري بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تعيين الرقم السري');
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled: boolean = false
  ) => (
    <View style={[styles.settingItem, isRtl && styles.settingItemRtl]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { textAlign: getTextAlign(i18n.language) }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#767577', true: '#667eea' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
      />
    </View>
  );

  const renderTimeoutSetting = (
    title: string,
    value: number,
    options: number[],
    onSelect: (value: number) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { textAlign: getTextAlign(i18n.language) }]}>
          {value} دقيقة
        </Text>
      </View>
      <TouchableOpacity
        style={styles.timeoutButton}
        onPress={() => {
          Alert.alert(
            title,
            'اختر المدة الزمنية',
            options.map(option => ({
              text: `${option} دقيقة`,
              onPress: () => onSelect(option)
            }))
          );
        }}
      >
        <Ionicons name="chevron-down-outline" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderPinModal = () => (
    <Modal
      visible={showPinModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPinModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
            تعيين رقم سري
          </Text>

          <TextInput
            style={[styles.pinInput, { textAlign: getTextAlign(i18n.language) }]}
            placeholder="أدخل الرقم السري"
            value={pinInput}
            onChangeText={setPinInput}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />

          <TextInput
            style={[styles.pinInput, { textAlign: getTextAlign(i18n.language) }]}
            placeholder="تأكيد الرقم السري"
            value={confirmPinInput}
            onChangeText={setConfirmPinInput}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPinModal(false)}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleSetPin}
            >
              <Text style={styles.confirmButtonText}>تأكيد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🔐 المصادقة
        </Text>

        {renderSettingItem(
          'المصادقة البيومترية',
          'استخدم بصمة الإصبع أو الوجه لتسجيل الدخول',
          settings.biometricEnabled,
          handleBiometricToggle,
          !biometricAvailable
        )}

        {renderSettingItem(
          'الرقم السري',
          'تعيين رقم سري للتطبيق',
          settings.pinEnabled,
          handlePinToggle
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🔒 الحماية التلقائية
        </Text>

        {renderSettingItem(
          'القفل التلقائي',
          'قفل التطبيق تلقائياً عند عدم الاستخدام',
          settings.autoLockEnabled,
          (value) => updateSetting('autoLockEnabled', value)
        )}

        {settings.autoLockEnabled && renderTimeoutSetting(
          'مهلة القفل التلقائي',
          settings.autoLockTimeout,
          [1, 2, 5, 10, 15, 30],
          (value) => updateSetting('autoLockTimeout', value)
        )}

        {renderTimeoutSetting(
          'مهلة انتهاء الجلسة',
          settings.sessionTimeout,
          [15, 30, 60, 120, 240],
          (value) => updateSetting('sessionTimeout', value)
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🛡️ الأمان المتقدم
        </Text>

        {renderSettingItem(
          'تشفير البيانات',
          'تشفير البيانات المحفوظة محلياً',
          settings.encryptionEnabled,
          (value) => updateSetting('encryptionEnabled', value)
        )}

        {renderSettingItem(
          'سجل التدقيق',
          'تسجيل الأنشطة الأمنية',
          settings.auditLogging,
          (value) => updateSetting('auditLogging', value)
        )}
      </View>

      {renderPinModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemRtl: {
    flexDirection: 'row-reverse',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timeoutButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  confirmButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SecuritySettingsScreen;
