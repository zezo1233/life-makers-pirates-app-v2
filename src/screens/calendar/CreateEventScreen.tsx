import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

// Import stores and utilities
import { useCalendarStore } from '../../store/calendarStore';

import { isRTL, getTextAlign } from '../../i18n';

interface CreateEventForm {
  title: string;
  description: string;
  type: 'training' | 'meeting' | 'availability' | 'other';
  startDate: Date;
  endDate: Date;
  location: string;
  attendees: string[];
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  maxAttendees?: number;
}

const CreateEventScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { createEvent, isLoading } = useCalendarStore();

  const [form, setForm] = useState<CreateEventForm>({
    title: '',
    description: '',
    type: 'training',
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
    location: '',
    attendees: [],
    isRecurring: false,
    maxAttendees: 20,
  });

  const isRtl = isRTL(i18n.language);

  // Get initial date from route params if provided
  useEffect(() => {
    if (route.params && 'selectedDate' in route.params) {
      const selectedDate = new Date(route.params.selectedDate as string);
      setForm(prev => ({
        ...prev,
        startDate: selectedDate,
        endDate: new Date(selectedDate.getTime() + 2 * 60 * 60 * 1000),
      }));
    }
  }, [route.params]);

  const updateForm = (field: keyof CreateEventForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      Alert.alert(t('common.error'), t('calendar.errors.titleRequired'));
      return false;
    }

    if (!form.location.trim()) {
      Alert.alert(t('common.error'), t('calendar.errors.locationRequired'));
      return false;
    }

    if (form.startDate >= form.endDate) {
      Alert.alert(t('common.error'), t('calendar.errors.invalidDateRange'));
      return false;
    }

    return true;
  };

  const handleCreateEvent = async () => {
    if (!validateForm()) return;

    try {
      await createEvent({
        title: form.title,
        description: form.description,
        type: form.type,
        start_date: form.startDate.toISOString(),
        end_date: form.endDate.toISOString(),
        location: form.location,
        attendees: form.attendees,
        max_attendees: form.maxAttendees,
        is_recurring: form.isRecurring,
        recurring_pattern: form.recurringPattern,
      });

      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('calendar.eventCreated'),
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };



  const eventTypes = [
    { label: t('calendar.types.training'), value: 'training' },
    { label: t('calendar.types.meeting'), value: 'meeting' },
    { label: t('calendar.types.availability'), value: 'availability' },
    { label: t('calendar.types.other'), value: 'other' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.form.title')} *
          </Text>
          <TextInput
            style={[
              styles.input,
              { textAlign: getTextAlign(i18n.language) },
              isRtl && styles.inputRtl,
            ]}
            value={form.title}
            onChangeText={(text) => updateForm('title', text)}
            placeholder={t('calendar.form.titlePlaceholder')}
            placeholderTextColor="#999"
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.form.description')}
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { textAlign: getTextAlign(i18n.language) },
              isRtl && styles.inputRtl,
            ]}
            value={form.description}
            onChangeText={(text) => updateForm('description', text)}
            placeholder={t('calendar.form.descriptionPlaceholder')}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Event Type Picker */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.form.type')} *
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.type}
              onValueChange={(value) => updateForm('type', value)}
              style={styles.picker}
            >
              {eventTypes.map((type) => (
                <Picker.Item
                  key={type.value}
                  label={type.label}
                  value={type.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Location Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.form.location')} *
          </Text>
          <TextInput
            style={[
              styles.input,
              { textAlign: getTextAlign(i18n.language) },
              isRtl && styles.inputRtl,
            ]}
            value={form.location}
            onChangeText={(text) => updateForm('location', text)}
            placeholder={t('calendar.form.locationPlaceholder')}
            placeholderTextColor="#999"
          />
        </View>

        {/* Date and Time Section */}
        <View style={styles.dateTimeSection}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.form.dateTime')}
          </Text>

          {/* Start Date and Time */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.startDate')}
              </Text>
              <CustomDateTimePicker
                value={form.startDate}
                mode="date"
                onDateChange={(date) => updateForm('startDate', date)}
                style={styles.dateTimeButton}
              />
            </View>

            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.startTime')}
              </Text>
              <CustomDateTimePicker
                value={form.startDate}
                mode="time"
                onDateChange={(date) => updateForm('startDate', date)}
                style={styles.dateTimeButton}
              />
            </View>
          </View>

          {/* End Date and Time */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.endDate')}
              </Text>
              <CustomDateTimePicker
                value={form.endDate}
                mode="date"
                onDateChange={(date) => updateForm('endDate', date)}
                style={styles.dateTimeButton}
              />
            </View>

            <View style={styles.dateTimeItem}>
              <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.endTime')}
              </Text>
              <CustomDateTimePicker
                value={form.endDate}
                mode="time"
                onDateChange={(date) => updateForm('endDate', date)}
                style={styles.dateTimeButton}
              />
            </View>
          </View>
        </View>

        {/* Max Attendees (for training events) */}
        {form.type === 'training' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.form.maxAttendees')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { textAlign: getTextAlign(i18n.language) },
                isRtl && styles.inputRtl,
              ]}
              value={form.maxAttendees?.toString() || ''}
              onChangeText={(text) => updateForm('maxAttendees', parseInt(text) || 0)}
              placeholder="20"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.createButton, isLoading && styles.disabledButton]}
            onPress={handleCreateEvent}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? t('common.creating') : t('common.create')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>


    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputRtl: {
    textAlign: 'right',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  dateTimeSection: {
    marginBottom: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateTimeItem: {
    flex: 0.48,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 20,
  },
  button: {
    flex: 0.48,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#667eea',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default CreateEventScreen;
