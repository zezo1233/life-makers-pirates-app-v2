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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { notificationService } from '../../services/NotificationService';
import { enhancedOneSignalService } from '../../services/enhancedOneSignalService';
import { isRTL, getTextAlign } from '../../i18n';

interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  workflowUpdates: boolean;
  chatMessages: boolean;
  reminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: {
    urgent: boolean;
    normal: boolean;
    info: boolean;
  };
}

const NotificationSettingsScreen: React.FC = () => {
  const { i18n } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    sound: true,
    vibration: true,
    badge: true,
    workflowUpdates: true,
    chatMessages: true,
    reminders: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    categories: {
      urgent: true,
      normal: true,
      info: true,
    },
  });
  const [showTimeModal, setShowTimeModal] = useState<'start' | 'end' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const currentPreferences = await notificationService.getPreferences();
      setPreferences(currentPreferences);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: string, value: any) => {
    try {
      const updatedPreferences = { ...preferences };
      
      // Handle nested objects
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        (updatedPreferences as any)[parent][child] = value;
      } else {
        (updatedPreferences as any)[key] = value;
      }
      
      setPreferences(updatedPreferences);
      await notificationService.updatePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Alert.alert('خطأ', 'فشل في تحديث الإعداد');
    }
  };

  const handleMainToggle = async (enabled: boolean) => {
    if (enabled) {
      // Request permissions when enabling
      try {
        await enhancedOneSignalService.initialize();
        // OneSignal handles permission requests internally during initialization
        console.log('✅ Notification permissions requested');
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert(
          'خطأ',
          'فشل في طلب صلاحيات الإشعارات. تأكد من أن التطبيق مثبت كـ Development Build.'
        );
        return;
      }
    }
    await updatePreference('enabled', enabled);
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
        disabled={disabled || !preferences.enabled}
        trackColor={{ false: '#767577', true: '#667eea' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
      />
    </View>
  );

  const renderTimeSelector = (
    title: string,
    time: string,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[styles.timeSelector, isRtl && styles.timeSelectorRtl]}
      onPress={onPress}
      disabled={!preferences.quietHours.enabled}
    >
      <Text style={[styles.timeLabel, { textAlign: getTextAlign(i18n.language) }]}>
        {title}
      </Text>
      <View style={styles.timeValue}>
        <Text style={styles.timeText}>{time}</Text>
        <Ionicons name="chevron-down-outline" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push({
          text: timeString,
          onPress: () => {
            if (showTimeModal === 'start') {
              updatePreference('quietHours.start', timeString);
            } else if (showTimeModal === 'end') {
              updatePreference('quietHours.end', timeString);
            }
            setShowTimeModal(null);
          }
        });
      }
    }
    return options;
  };

  const renderTimeModal = () => (
    <Modal
      visible={showTimeModal !== null}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTimeModal(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
            اختر الوقت
          </Text>
          
          <ScrollView style={styles.timeOptions}>
            {generateTimeOptions().map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.timeOption}
                onPress={option.onPress}
              >
                <Text style={styles.timeOptionText}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowTimeModal(null)}
          >
            <Text style={styles.closeButtonText}>إغلاق</Text>
          </TouchableOpacity>
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
      {/* Main Toggle */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🔔 الإشعارات العامة
        </Text>

        {renderSettingItem(
          'تفعيل الإشعارات',
          'تشغيل أو إيقاف جميع الإشعارات',
          preferences.enabled,
          handleMainToggle
        )}
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          📱 أنواع الإشعارات
        </Text>

        {renderSettingItem(
          'تحديثات سير العمل',
          'إشعارات عند تغيير حالة طلبات التدريب',
          preferences.workflowUpdates,
          (value) => updatePreference('workflowUpdates', value)
        )}

        {renderSettingItem(
          'رسائل المحادثة',
          'إشعارات الرسائل الجديدة',
          preferences.chatMessages,
          (value) => updatePreference('chatMessages', value)
        )}

        {renderSettingItem(
          'التذكيرات',
          'تذكيرات المهام والمواعيد',
          preferences.reminders,
          (value) => updatePreference('reminders', value)
        )}
      </View>

      {/* Notification Style */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🎵 نمط الإشعارات
        </Text>

        {renderSettingItem(
          'الصوت',
          'تشغيل صوت عند وصول الإشعارات',
          preferences.sound,
          (value) => updatePreference('sound', value)
        )}

        {renderSettingItem(
          'الاهتزاز',
          'اهتزاز الجهاز عند وصول الإشعارات',
          preferences.vibration,
          (value) => updatePreference('vibration', value)
        )}

        {renderSettingItem(
          'شارة التطبيق',
          'عرض عدد الإشعارات على أيقونة التطبيق',
          preferences.badge,
          (value) => updatePreference('badge', value)
        )}
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          📂 فئات الإشعارات
        </Text>

        {renderSettingItem(
          'عاجل',
          'إشعارات المهام العاجلة والمهمة',
          preferences.categories.urgent,
          (value) => updatePreference('categories.urgent', value)
        )}

        {renderSettingItem(
          'عادي',
          'إشعارات المهام العادية',
          preferences.categories.normal,
          (value) => updatePreference('categories.normal', value)
        )}

        {renderSettingItem(
          'معلوماتي',
          'إشعارات المعلومات والتحديثات',
          preferences.categories.info,
          (value) => updatePreference('categories.info', value)
        )}
      </View>

      {/* Quiet Hours */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          🌙 ساعات الهدوء
        </Text>

        {renderSettingItem(
          'تفعيل ساعات الهدوء',
          'إيقاف الإشعارات في أوقات محددة',
          preferences.quietHours.enabled,
          (value) => updatePreference('quietHours.enabled', value)
        )}

        {preferences.quietHours.enabled && (
          <View style={styles.timeSelectors}>
            {renderTimeSelector(
              'بداية الهدوء',
              preferences.quietHours.start,
              () => setShowTimeModal('start')
            )}
            
            {renderTimeSelector(
              'نهاية الهدوء',
              preferences.quietHours.end,
              () => setShowTimeModal('end')
            )}
          </View>
        )}
      </View>

      {renderTimeModal()}
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
  timeSelectors: {
    marginTop: 16,
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  timeSelectorRtl: {
    flexDirection: 'row-reverse',
  },
  timeLabel: {
    fontSize: 16,
    color: '#333',
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#667eea',
    marginRight: 8,
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
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  timeOptions: {
    maxHeight: 300,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationSettingsScreen;
