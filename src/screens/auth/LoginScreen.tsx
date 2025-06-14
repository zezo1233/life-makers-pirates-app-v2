import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { isRTL, getTextAlign } from '../../i18n';
import useResponsiveScreen from '../../hooks/useResponsiveScreen';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading } = useAuthStore();
  const { responsiveStyles, scale, isTablet, isSmallScreen } = useResponsiveScreen();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isRtl = isRTL(i18n.language);

  const handleLogin = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: t('auth.emailRequired'),
      });
      return;
    }

    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: t('auth.passwordRequired'),
      });
      return;
    }

    try {
      await login(email.trim(), password);
      Toast.show({
        type: 'success',
        text1: t('auth.loginSuccess'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('auth.invalidCredentials'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
          {/* Logo Section */}
          <View style={[styles.logoContainer, { marginBottom: scale.height(40) }]}>
            <Image
              source={require('../../../assets/icon.png')}
              style={[
                styles.logo,
                {
                  width: scale.width(isTablet ? 120 : isSmallScreen ? 80 : 100),
                  height: scale.height(isTablet ? 120 : isSmallScreen ? 80 : 100),
                  marginBottom: scale.height(20),
                }
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.title,
              {
                textAlign: getTextAlign(i18n.language),
                fontSize: scale.font(isTablet ? 28 : isSmallScreen ? 20 : 24),
              }
            ]}>
              Life Makers Pirates
            </Text>
            <Text style={[
              styles.subtitle,
              {
                textAlign: getTextAlign(i18n.language),
                fontSize: scale.font(isTablet ? 18 : isSmallScreen ? 14 : 16),
              }
            ]}>
              Trainers Preparation App
            </Text>
          </View>

          {/* Login Form */}
          <View style={[
            styles.formContainer,
            {
              padding: responsiveStyles.padding.horizontal * 1.5,
              borderRadius: scale.width(20),
            }
          ]}>
            <Text style={[
              styles.welcomeText,
              {
                textAlign: getTextAlign(i18n.language),
                fontSize: scale.font(isTablet ? 32 : isSmallScreen ? 24 : 28),
                marginBottom: scale.height(30),
              }
            ]}>
              {t('auth.login')}
            </Text>

            {/* Email Input */}
            <View style={[
              styles.inputContainer,
              {
                borderRadius: scale.width(12),
                marginBottom: scale.height(16),
                paddingHorizontal: responsiveStyles.padding.horizontal,
              }
            ]}>
              <Ionicons
                name="mail-outline"
                size={scale.width(20)}
                color="#666"
                style={[styles.inputIcon, isRtl && styles.inputIconRtl]}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    textAlign: getTextAlign(i18n.language),
                    height: responsiveStyles.button.height,
                    fontSize: scale.font(16),
                  },
                  isRtl && styles.inputRtl,
                ]}
                placeholder={t('auth.email')}
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={[styles.inputIcon, isRtl && styles.inputIconRtl]}
              />
              <TextInput
                style={[
                  styles.input,
                  { textAlign: getTextAlign(i18n.language) },
                  isRtl && styles.inputRtl,
                ]}
                placeholder={t('auth.password')}
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={[styles.eyeIcon, isRtl && styles.eyeIconRtl]}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={navigateToForgotPassword} style={styles.forgotPasswordContainer}>
              <Text style={[styles.forgotPasswordText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('auth.forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                {
                  borderRadius: scale.width(12),
                  height: responsiveStyles.button.height,
                  marginBottom: scale.height(20),
                },
                isLoading && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={[
                styles.loginButtonText,
                { fontSize: responsiveStyles.button.fontSize }
              ]}>
                {isLoading ? t('common.loading') : t('auth.login')}
              </Text>
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { textAlign: getTextAlign(i18n.language) }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.registerLink}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: '5%',
    paddingVertical: '5%',
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    // Dynamic sizing handled in component
  },
  title: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#f0f0f0',
    fontWeight: '300',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: 500, // Limit width on tablets
    width: '100%',
    alignSelf: 'center',
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputIconRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  input: {
    flex: 1,
    color: '#333',
  },
  inputRtl: {
    textAlign: 'right',
  },
  eyeIcon: {
    padding: 4,
  },
  eyeIconRtl: {
    marginLeft: 0,
    marginRight: 8,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
