import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

// Import stores and utilities
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../config/supabase';
import { isRTL, getTextAlign } from '../../i18n';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeSelector from '../../components/settings/ThemeSelector';

const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { logout } = useAuthStore();
  const { theme, themeMode } = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isRtl = isRTL(i18n.language);

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    Toast.show({
      type: 'success',
      text1: t('settings.languageChanged'),
    });
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('validation.allFieldsRequired'),
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('validation.passwordsDoNotMatch'),
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: t('validation.passwordTooShort'),
      });
      return;
    }

    try {
      setIsChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: t('profile.passwordChanged'),
      });

      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.passwordChangeFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.confirm'),
      t('profile.confirmLogout'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.logoutFailed'),
              });
            }
          },
        },
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, isRtl && styles.settingItemRtl]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingLeft, isRtl && styles.settingLeftRtl]}>
        <Ionicons name={icon as any} size={24} color="#667eea" />
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightComponent || (onPress && (
        <Ionicons
          name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"}
          size={20}
          color="#ccc"
        />
      ))}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('settings.account')}
        </Text>

        {renderSettingItem(
          'person-outline',
          t('profile.editProfile'),
          t('settings.updatePersonalInfo'),
          () => {
            // Navigate to edit profile - handled by parent navigator
          }
        )}

        {renderSettingItem(
          'lock-closed-outline',
          t('profile.changePassword'),
          t('settings.updatePassword'),
          () => setShowPasswordModal(true)
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('settings.preferences')}
        </Text>

        {renderSettingItem(
          'language-outline',
          t('settings.language'),
          t(`settings.currentLanguage.${i18n.language}`),
          undefined,
          <Picker
            selectedValue={i18n.language}
            onValueChange={handleLanguageChange}
            style={styles.languagePicker}
          >
            <Picker.Item label="العربية" value="ar" />
            <Picker.Item label="English" value="en" />
          </Picker>
        )}

        {renderSettingItem(
          'color-palette-outline',
          t('settings.theme.title'),
          t(`settings.theme.${themeMode}`),
          () => setShowThemeSelector(true)
        )}

        {renderSettingItem(
          'notifications-outline',
          t('settings.pushNotifications'),
          t('settings.receiveNotifications'),
          undefined,
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#e9ecef', true: '#667eea' }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        )}

        {renderSettingItem(
          'mail-outline',
          t('settings.emailNotifications'),
          t('settings.receiveEmails'),
          undefined,
          <Switch
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            trackColor={{ false: '#e9ecef', true: '#667eea' }}
            thumbColor={emailNotifications ? '#ffffff' : '#f4f3f4'}
          />
        )}
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('settings.about')}
        </Text>

        {renderSettingItem(
          'information-circle-outline',
          t('settings.appVersion'),
          '1.0.0'
        )}

        {renderSettingItem(
          'help-circle-outline',
          t('settings.help'),
          t('settings.getSupport')
        )}

        {renderSettingItem(
          'document-text-outline',
          t('settings.termsOfService'),
          t('settings.readTerms')
        )}

        {renderSettingItem(
          'shield-checkmark-outline',
          t('settings.privacyPolicy'),
          t('settings.readPrivacy')
        )}
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('settings.account')}
        </Text>

        <TouchableOpacity
          style={[styles.logoutButton, isRtl && styles.logoutButtonRtl]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#dc3545" />
          <Text style={[styles.logoutText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.changePassword')}
            </Text>

            <View style={styles.passwordInputContainer}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('profile.currentPassword')}
              </Text>
              <TextInput
                style={[styles.passwordInput, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('profile.currentPassword')}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                secureTextEntry
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('profile.newPassword')}
              </Text>
              <TextInput
                style={[styles.passwordInput, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('profile.newPassword')}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                secureTextEntry
              />
            </View>

            <View style={styles.passwordInputContainer}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('auth.confirmPassword')}
              </Text>
              <TextInput
                style={[styles.passwordInput, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.confirmPassword')}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveButton, isChangingPassword && styles.modalSaveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                <Text style={styles.modalSaveText}>
                  {isChangingPassword ? t('common.saving') : t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selector Modal */}
      <ThemeSelector
        visible={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemRtl: {
    flexDirection: 'row-reverse',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLeftRtl: {
    flexDirection: 'row-reverse',
  },
  settingContent: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  languagePicker: {
    width: 120,
    height: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutButtonRtl: {
    flexDirection: 'row-reverse',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc3545',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  passwordInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default SettingsScreen;
