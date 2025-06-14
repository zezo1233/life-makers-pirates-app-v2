import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useAuthStore } from '../../store/authStore';
import { User, UserRole } from '../../types';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { isRTL, getTextAlign } from '../../i18n';

type EditProfileNavigationProp = StackNavigationProp<ProfileStackParamList, 'EditProfile'>;

const EditProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<EditProfileNavigationProp>();
  const { user, updateProfile, isLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    specializations: [] as string[],
    province: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const isRtl = isRTL(i18n.language);

  const provinces = [
    'cairo', 'giza', 'alexandria', 'dakahlia', 'red_sea', 'beheira', 'fayoum', 
'gharbiya', 'ismailia', 'menofia', 'minya', 'qalyubia', 'new_valley', 'suez',
'asyut', 'qena', 'damietta', 'aswan', 'sharqia', 'south_sinai', 'kafr_el_sheikh',
'matrouh', 'luxor', 'north_sinai', 'beni_suef', 'sohag', 'port_said'

  ];

  const specializations = [
    'التواصل الفعال',
    'العرض والتقديم',
    'العقلية',
    'العمل الجماعي'
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        specializations: user.specialization || [],
        province: user.province || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    // Validation
    if (!formData.full_name.trim()) {
      Toast.show({
        type: 'error',
        text1: t('auth.fullName') + ' ' + t('validation.required'),
      });
      return;
    }

    if (!formData.province) {
      Toast.show({
        type: 'error',
        text1: t('auth.provinceRequired'),
      });
      return;
    }

    // Check if specialization is required for this role
    const requiresSpecialization = user?.role === UserRole.TRAINER ||
                                  user?.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
                                  user?.role === UserRole.PROGRAM_SUPERVISOR;

    if (requiresSpecialization && formData.specializations.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('auth.specializationRequired'),
      });
      return;
    }

    try {
      await updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        specialization: formData.specializations.length > 0 ? formData.specializations : null,
        province: formData.province,
      });

      Toast.show({
        type: 'success',
        text1: t('profile.profileUpdated'),
      });

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        t('common.confirm'),
        t('profile.discardChanges'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => navigation.goBack()
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.personalInfo')}
            </Text>
            <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.updateYourInfo')}
            </Text>
          </View>

          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('auth.fullName')} *
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.fullName')}
                value={formData.full_name}
                onChangeText={(value) => handleInputChange('full_name', value)}
                maxLength={100}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('auth.phone')}
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.phone')}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          </View>

          {/* Province Picker */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('auth.province')} *
            </Text>
            <View style={styles.pickerWrapper}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <Picker
                selectedValue={formData.province}
                onValueChange={(value) => handleInputChange('province', value)}
                style={[styles.picker, isRtl && styles.pickerRtl]}
              >
                <Picker.Item label={t('auth.selectProvince')} value="" />
                {provinces.map((province) => (
                  <Picker.Item
                    key={province}
                    label={t(`provinces.${province}`)}
                    value={province}
                  />
                ))}
              </Picker>
            </View>
          </View>



          {/* Read-only fields */}
          <View style={styles.readOnlySection}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('profile.accountInfo')}
            </Text>

            <View style={styles.readOnlyItem}>
              <Text style={[styles.readOnlyLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('auth.email')}
              </Text>
              <Text style={[styles.readOnlyValue, { textAlign: getTextAlign(i18n.language) }]}>
                {user?.email}
              </Text>
            </View>

            <View style={styles.readOnlyItem}>
              <Text style={[styles.readOnlyLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('auth.role')}
              </Text>
              <Text style={[styles.readOnlyValue, { textAlign: getTextAlign(i18n.language) }]}>
                {user?.role && t(`roles.${user.role}`)}
              </Text>
            </View>

            {/* Specializations - Show for Trainers, Project Managers, and Supervisors */}
            {(user?.role === UserRole.TRAINER ||
              user?.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
              user?.role === UserRole.PROGRAM_SUPERVISOR) && (
              <View style={styles.readOnlyItem}>
                <Text style={[styles.readOnlyLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('auth.specialization')} *
                </Text>
                <View style={styles.specializationsContainer}>
                  {specializations.map((spec) => (
                    <TouchableOpacity
                      key={spec}
                      style={styles.specializationItem}
                      onPress={() => {
                        const isSelected = formData.specializations.includes(spec);
                        if (isSelected) {
                          handleInputChange('specializations', formData.specializations.filter(s => s !== spec));
                        } else {
                          handleInputChange('specializations', [...formData.specializations, spec]);
                        }
                      }}
                    >
                      <View style={[
                        styles.checkbox,
                        formData.specializations.includes(spec) && styles.checkboxSelected
                      ]}>
                        {formData.specializations.includes(spec) && (
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        )}
                      </View>
                      <Text style={[styles.specializationText, { textAlign: getTextAlign(i18n.language) }]}>
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.saveButtonText}>{t('common.saving')}</Text>
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  formContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  pickerRtl: {
    textAlign: 'right',
  },
  readOnlySection: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  readOnlyItem: {
    marginBottom: 12,
  },
  readOnlyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  specializationsContainer: {
    marginTop: 8,
  },
  specializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  specializationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default EditProfileScreen;
