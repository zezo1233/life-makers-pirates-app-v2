import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useUserManagementStore, canCreateUsers } from '../../store/userManagementStore';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { isRTL, getTextAlign } from '../../i18n';

type CreateUserNavigationProp = StackNavigationProp<ProfileStackParamList, 'CreateUser'>;

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  role: UserRole | '';
  province: string;

  phone: string;
}

const CreateUserScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<CreateUserNavigationProp>();
  const { user: currentUser } = useAuthStore();
  const { createUser, isLoading } = useUserManagementStore();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: '',
    province: '',

    phone: '',
  });

  const isRtl = isRTL(i18n.language);

  const provinces = [
    'cairo', 'alexandria', 'giza', 'sharkia', 'dakahlia', 'beheira',
    'kafr_el_sheikh', 'gharbia', 'monufia', 'qalyubia', 'ismailia',
    'suez', 'port_said', 'north_sinai', 'south_sinai', 'red_sea',
    'new_valley', 'matrouh', 'fayoum', 'beni_suef', 'minya',
    'assiut', 'sohag', 'qena', 'luxor', 'aswan'
  ];



  const allRoles = [
    UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
    UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
    UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
    UserRole.PROGRAM_SUPERVISOR,
    UserRole.TRAINER,
    UserRole.BOARD_MEMBER,
  ];

  React.useEffect(() => {
    // Check permissions
    if (!currentUser || !canCreateUsers(currentUser.role)) {
      Alert.alert(
        t('common.accessDenied'),
        t('userManagement.accessDenied'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
      return;
    }
  }, [currentUser]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Toast.show({ type: 'error', text1: t('auth.emailRequired') });
      return false;
    }

    if (!formData.email.includes('@')) {
      Toast.show({ type: 'error', text1: t('auth.invalidEmail') });
      return false;
    }

    if (!formData.password) {
      Toast.show({ type: 'error', text1: t('auth.passwordRequired') });
      return false;
    }

    if (formData.password.length < 6) {
      Toast.show({ type: 'error', text1: t('auth.weakPassword') });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Toast.show({ type: 'error', text1: t('auth.passwordMismatch') });
      return false;
    }

    if (!formData.full_name.trim()) {
      Toast.show({ type: 'error', text1: t('validation.required') });
      return false;
    }

    if (!formData.role) {
      Toast.show({ type: 'error', text1: t('auth.roleRequired') });
      return false;
    }

    if (!formData.province) {
      Toast.show({ type: 'error', text1: t('auth.provinceRequired') });
      return false;
    }



    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role as UserRole,
        province: formData.province,

        phone: formData.phone || undefined,
      });

      Toast.show({
        type: 'success',
        text1: t('userManagement.userCreated'),
      });

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.createFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };



  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('userManagement.createNewUser')}
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('userManagement.userInformation')}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.fullName')} *
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { textAlign: getTextAlign(i18n.language) }]}
              placeholder={t('auth.fullName')}
              value={formData.full_name}
              onChangeText={(value) => handleInputChange('full_name', value)}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.email')} *
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { textAlign: getTextAlign(i18n.language) }]}
              placeholder={t('auth.email')}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.password')} *
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { textAlign: getTextAlign(i18n.language) }]}
              placeholder={t('auth.password')}
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              secureTextEntry
            />
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.confirmPassword')} *
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { textAlign: getTextAlign(i18n.language) }]}
              placeholder={t('auth.confirmPassword')}
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              secureTextEntry
            />
          </View>
        </View>

        {/* Role Picker */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.role')} *
          </Text>
          <View style={styles.pickerWrapper}>
            <Ionicons name="shield-outline" size={20} color="#666" style={styles.inputIcon} />
            <Picker
              selectedValue={formData.role}
              onValueChange={(value) => handleInputChange('role', value)}
              style={[styles.picker, isRtl && styles.pickerRtl]}
            >
              <Picker.Item label={t('userManagement.selectRole')} value="" />
              {allRoles.map((role) => (
                <Picker.Item
                  key={role}
                  label={t(`roles.${role}`)}
                  value={role}
                />
              ))}
            </Picker>
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



        {/* Phone (Optional) */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { textAlign: getTextAlign(i18n.language) }]}>
            {t('auth.phone')}
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { textAlign: getTextAlign(i18n.language) }]}
              placeholder={t('auth.phone')}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateUser}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? t('common.loading') : t('userManagement.createAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 20,
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
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: 50,
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
    paddingLeft: 16,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  pickerRtl: {
    textAlign: 'right',
  },
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },

});

export default CreateUserScreen;
