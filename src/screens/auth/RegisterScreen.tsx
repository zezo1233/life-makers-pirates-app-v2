import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: UserRole.TRAINER,
    province: '',
    phone: '',
    specialization: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const isRtl = isRTL(i18n.language);

  const provinces = [
    'cairo', 'giza', 'alexandria', 'dakahlia', 'red_sea', 'beheira', 'fayoum', 
'gharbiya', 'ismailia', 'menofia', 'minya', 'qalyubia', 'new_valley', 'suez',
'asyut', 'qena', 'damietta', 'aswan', 'sharqia', 'south_sinai', 'kafr_el_sheikh',
'matrouh', 'luxor', 'north_sinai', 'beni_suef', 'sohag', 'port_said'

  ];

  const specializations = [
    'communication', 'presentation', 'mindset', 'teamwork'
  ];

  const handleRegister = async () => {
    // Validation
    if (!formData.email.trim()) {
      Toast.show({ type: 'error', text1: t('auth.emailRequired') });
      return;
    }
    if (!formData.password.trim()) {
      Toast.show({ type: 'error', text1: t('auth.passwordRequired') });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Toast.show({ type: 'error', text1: t('auth.passwordMismatch') });
      return;
    }
    if (!formData.fullName.trim()) {
      Toast.show({ type: 'error', text1: t('validation.required') });
      return;
    }
    if (!formData.province) {
      Toast.show({ type: 'error', text1: t('auth.provinceRequired') });
      return;
    }

    // Check if specialization is required for this role
    const requiresSpecialization = formData.role === UserRole.TRAINER ||
                                  formData.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
                                  formData.role === UserRole.PROGRAM_SUPERVISOR;

    if (requiresSpecialization && !formData.specialization) {
      Toast.show({ type: 'error', text1: t('auth.specializationRequired') });
      return;
    }

    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        full_name: formData.fullName.trim(),
        role: formData.role,
        province: formData.province,
        phone: formData.phone,
        specialization: formData.specialization,
      });
      
      Toast.show({
        type: 'success',
        text1: t('auth.registerSuccess'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
              {t('auth.register')}
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.email')}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Full Name Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.fullName')}
                value={formData.fullName}
                onChangeText={(value) => updateFormData('fullName', value)}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.password')}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.confirmPassword')}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Role Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{t('auth.role')}</Text>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => updateFormData('role', value)}
                style={styles.picker}
              >
                {Object.values(UserRole).map((role) => (
                  <Picker.Item
                    key={role}
                    label={t(`roles.${role}`)}
                    value={role}
                  />
                ))}
              </Picker>
            </View>

            {/* Province Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{t('auth.province')}</Text>
              <Picker
                selectedValue={formData.province}
                onValueChange={(value) => updateFormData('province', value)}
                style={styles.picker}
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

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('auth.phone')}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Specialization Picker (for trainers, project managers, and supervisors) */}
            {(formData.role === UserRole.TRAINER ||
              formData.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
              formData.role === UserRole.PROGRAM_SUPERVISOR) && (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>{t('auth.specialization')}</Text>
                <Picker
                  selectedValue={formData.specialization}
                  onValueChange={(value) => updateFormData('specialization', value)}
                  style={styles.picker}
                >
                  <Picker.Item label={t('auth.selectSpecialization')} value="" />
                  {specializations.map((spec) => (
                    <Picker.Item
                      key={spec}
                      label={t(`specializations.${spec}`)}
                      value={spec}
                    />
                  ))}
                </Picker>
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? t('common.loading') : t('auth.register')}
              </Text>
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.loginLink, { textAlign: getTextAlign(i18n.language) }]}>
                Already have an account? {t('auth.login')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  registerButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RegisterScreen;
