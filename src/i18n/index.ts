import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill for Intl.PluralRules if not available
if (typeof Intl === 'undefined' || !Intl.PluralRules) {
  require('intl-pluralrules');
}

// Import translation files
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Get saved language from AsyncStorage
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }

      // Fallback to device locale with multiple safety checks
      let deviceLanguage = 'en';
      try {
        const locales = Localization.getLocales();
        if (locales && locales.length > 0 && locales[0].languageCode) {
          deviceLanguage = locales[0].languageCode;
        }
      } catch (localeError) {
        console.log('Locale detection failed, using default language');
      }

      callback(deviceLanguage === 'ar' ? 'ar' : 'en');
    } catch (error) {
      console.log('Language detection completed with default language');
      callback('en'); // Default fallback
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng);
    } catch (error) {
      console.log('Language cache completed');
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    debug: false, // تعطيل debug لتجنب التحذيرات
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // إضافة إعدادات لتجنب التحذيرات
    initImmediate: false,
    compatibilityJSON: 'v3',
  });

export default i18n;

// Helper functions for RTL support
export const isRTL = (language: string = i18n.language): boolean => {
  return language === 'ar';
};

export const getTextAlign = (language: string = i18n.language): 'left' | 'right' => {
  return isRTL(language) ? 'right' : 'left';
};

export const getFlexDirection = (language: string = i18n.language): 'row' | 'row-reverse' => {
  return isRTL(language) ? 'row-reverse' : 'row';
};

// Language switching utility
export const changeLanguage = async (language: 'en' | 'ar') => {
  try {
    await i18n.changeLanguage(language);
    await AsyncStorage.setItem('user-language', language);
  } catch (error) {
    console.error('Language change error:', error);
  }
};

// Get available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

// Month names in Arabic and English
export const getMonthNames = (language: string = i18n.language): string[] => {
  if (language === 'ar') {
    return [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
  }

  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
};

// Short day names for calendar
export const getShortDayNames = (language: string = i18n.language): string[] => {
  if (language === 'ar') {
    return ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
  }

  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
};
