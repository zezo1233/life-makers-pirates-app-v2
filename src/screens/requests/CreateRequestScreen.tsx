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
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

// Import stores and types
import { useTrainingRequestsStore } from '../../store/trainingRequestsStore';
import { useAuthStore } from '../../store/authStore';
import { RequestsStackParamList } from '../../navigation/RequestsNavigator';
import { isRTL, getTextAlign } from '../../i18n';

type CreateRequestNavigationProp = StackNavigationProp<RequestsStackParamList, 'CreateRequest'>;
type CreateRequestRouteProp = RouteProp<RequestsStackParamList, 'CreateRequest'>;

const CreateRequestScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<CreateRequestNavigationProp>();
  const route = useRoute<CreateRequestRouteProp>();
  const { createRequest, updateRequest, isLoading } = useTrainingRequestsStore();
  const { user } = useAuthStore();

  // Check if we're in edit mode
  const isEditMode = route.params?.editMode || false;
  const requestId = route.params?.requestId;
  const requestData = route.params?.requestData;

  const [formData, setFormData] = useState({
    specialization: requestData?.specialization || '',
    province: requestData?.province || user?.province || '',
    requested_date: requestData?.requested_date ? new Date(requestData.requested_date) : new Date(),
    duration_hours: requestData?.duration_hours || 1,
    max_participants: requestData?.max_participants || 10,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const handleCreateRequest = async () => {
    // Validation
    if (!formData.specialization) {
      Toast.show({ type: 'error', text1: t('training.specialization') + ' ' + t('validation.required') });
      return;
    }
    if (!formData.province) {
      Toast.show({ type: 'error', text1: t('auth.province') + ' ' + t('validation.required') });
      return;
    }

    try {
      // Generate automatic title and description based on specialization and province
      const title = `${t(`specializations.${formData.specialization}`)} - ${t(`provinces.${formData.province}`)}`;
      const description = `${t('training.autoDescription')} ${t(`specializations.${formData.specialization}`)} ${t('training.inProvince')} ${t(`provinces.${formData.province}`)}`;

      const requestDataToSave = {
        ...formData,
        title,
        description,
        requested_date: formData.requested_date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      };

      if (isEditMode && requestId) {
        // Update existing request
        await updateRequest(requestId, requestDataToSave);
        Toast.show({
          type: 'success',
          text1: t('training.requestUpdated'),
        });
      } else {
        // Create new request
        await createRequest(requestDataToSave);
        Toast.show({
          type: 'success',
          text1: t('training.requestCreated'),
        });
      }

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: isEditMode ? t('errors.updateRequestFailed') : t('errors.createRequestFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('requested_date', selectedDate);
    }
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
              {isEditMode ? t('training.editRequest') : t('training.newRequest')}
            </Text>

            {/* Specialization Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>{t('training.specialization')}</Text>
              <Picker
                selectedValue={formData.specialization}
                onValueChange={(value) => updateFormData('specialization', value)}
                style={styles.picker}
              >
                <Picker.Item label={t('common.selectOption')} value="" />
                {specializations.map((spec) => (
                  <Picker.Item
                    key={spec}
                    label={t(`specializations.${spec}`)}
                    value={spec}
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
                <Picker.Item label={t('common.selectOption')} value="" />
                {provinces.map((province) => (
                  <Picker.Item
                    key={province}
                    label={t(`provinces.${province}`)}
                    value={province}
                  />
                ))}
              </Picker>
            </View>

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
              <TouchableOpacity
                style={[styles.input, styles.dateInput]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateText, { textAlign: getTextAlign(i18n.language) }]}>
                  {formData.requested_date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.requested_date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Duration Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="time-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('training.duration')}
                value={formData.duration_hours.toString()}
                onChangeText={(value) => updateFormData('duration_hours', parseInt(value) || 1)}
                keyboardType="numeric"
              />
            </View>

            {/* Max Participants Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="people-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { textAlign: getTextAlign(i18n.language) }]}
                placeholder={t('training.maxParticipants')}
                value={formData.max_participants.toString()}
                onChangeText={(value) => updateFormData('max_participants', parseInt(value) || 10)}
                keyboardType="numeric"
              />
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.createButtonDisabled]}
              onPress={handleCreateRequest}
              disabled={isLoading}
            >
              <Text style={styles.createButtonText}>
                {isLoading
                  ? t('common.loading')
                  : isEditMode
                    ? t('training.updateRequest')
                    : t('training.createRequest')
                }
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>
                {t('common.cancel')}
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
    minHeight: 50,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 120,
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateText: {
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
  createButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  cancelButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateRequestScreen;
