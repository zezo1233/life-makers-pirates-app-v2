import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Ionicons } from '@expo/vector-icons';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import { Calendar, DateData } from 'react-native-calendars';
import Toast from 'react-native-toast-message';

// Import stores and utilities
import { useCalendarStore } from '../../store/calendarStore';
import { useAuthStore } from '../../store/authStore';
import { isRTL, getTextAlign } from '../../i18n';
import { TrainerAvailability, UserRole } from '../../types';

interface AvailabilitySlot {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const TrainerAvailabilityScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const {
    trainerAvailability,
    fetchTrainerAvailability,
    setTrainerAvailability,
    isLoading
  } = useCalendarStore();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSlot, setCurrentSlot] = useState<AvailabilitySlot>({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
  });

  const isRtl = isRTL(i18n.language);

  // Check if user is trainer
  const isTrainer = user?.role === UserRole.TRAINER;

  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user]);

  const loadAvailability = async () => {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Load 3 months ahead

      await fetchTrainerAvailability(
        user?.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
    } catch (error) {
      console.error('Error loading availability:', error);
      Alert.alert(t('common.error'), t('errors.unknownError'));
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};

    // Mark selected date
    marked[selectedDate] = {
      selected: true,
      selectedColor: '#667eea',
    };

    // Mark dates with availability
    trainerAvailability.forEach((availability) => {
      const date = availability.date;

      if (marked[date]) {
        marked[date] = {
          ...marked[date],
          marked: true,
          dotColor: availability.is_available ? '#28a745' : '#dc3545',
        };
      } else {
        marked[date] = {
          marked: true,
          dotColor: availability.is_available ? '#28a745' : '#dc3545',
        };
      }
    });

    return marked;
  };

  const getAvailabilityForDate = (date: string): TrainerAvailability[] => {
    return trainerAvailability.filter(av => av.date === date);
  };

  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    setCurrentSlot(prev => ({ ...prev, date: day.dateString }));
  };

  const handleAddAvailability = async () => {
    if (!isTrainer) {
      Alert.alert(t('common.error'), t('common.accessDenied'));
      return;
    }

    try {
      await setTrainerAvailability({
        trainer_id: user?.id || '',
        date: currentSlot.date,
        start_time: currentSlot.startTime,
        end_time: currentSlot.endTime,
        is_available: currentSlot.isAvailable,
      });

      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('calendar.availabilitySet'),
      });

      // Reset form
      setCurrentSlot({
        date: selectedDate,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      });

    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleDeleteAvailability = async (_availabilityId: string) => {
    Alert.alert(t('common.info'), t('calendar.deleteFeatureComingSoon'));
  };

  const parseTimeToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatDateToTime = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
  };

  const selectedDateAvailability = getAvailabilityForDate(selectedDate);

  if (!isTrainer) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
        <Text style={[styles.accessDeniedTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('common.accessDenied')}
        </Text>
        <Text style={[styles.accessDeniedText, { textAlign: getTextAlign(i18n.language) }]}>
          {t('calendar.trainerOnlyFeature')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={getMarkedDates()}
            monthFormat={isRtl ? 'MMMM yyyy' : 'MMMM yyyy'}
            hideExtraDays={true}
            firstDay={isRtl ? 6 : 0}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#667eea',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#667eea',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#667eea',
              selectedDotColor: '#ffffff',
              arrowColor: '#667eea',
              monthTextColor: '#2d4150',
              indicatorColor: '#667eea',
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
            <Text style={styles.legendText}>{t('calendar.available')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#dc3545' }]} />
            <Text style={styles.legendText}>{t('calendar.unavailable')}</Text>
          </View>
        </View>

        {/* Add Availability Form */}
        <View style={styles.formContainer}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.setAvailability')}
          </Text>

          {/* Availability Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.status')}
            </Text>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  currentSlot.isAvailable && styles.toggleButtonActive,
                ]}
                onPress={() => setCurrentSlot(prev => ({ ...prev, isAvailable: true }))}
              >
                <Text style={[
                  styles.toggleButtonText,
                  currentSlot.isAvailable && styles.toggleButtonTextActive,
                ]}>
                  {t('calendar.available')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !currentSlot.isAvailable && styles.toggleButtonActive,
                ]}
                onPress={() => setCurrentSlot(prev => ({ ...prev, isAvailable: false }))}
              >
                <Text style={[
                  styles.toggleButtonText,
                  !currentSlot.isAvailable && styles.toggleButtonTextActive,
                ]}>
                  {t('calendar.unavailable')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Time Selection */}
          {currentSlot.isAvailable && (
            <View style={styles.timeContainer}>
              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                    {t('calendar.form.startTime')}
                  </Text>
                  <CustomDateTimePicker
                    value={parseTimeToDate(currentSlot.startTime)}
                    mode="time"
                    onDateChange={(date) => setCurrentSlot(prev => ({
                      ...prev,
                      startTime: formatDateToTime(date)
                    }))}
                    style={styles.timeButton}
                  />
                </View>

                <View style={styles.timeItem}>
                  <Text style={[styles.label, { textAlign: getTextAlign(i18n.language) }]}>
                    {t('calendar.form.endTime')}
                  </Text>
                  <CustomDateTimePicker
                    value={parseTimeToDate(currentSlot.endTime)}
                    mode="time"
                    onDateChange={(date) => setCurrentSlot(prev => ({
                      ...prev,
                      endTime: formatDateToTime(date)
                    }))}
                    style={styles.timeButton}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.disabledButton]}
            onPress={handleAddAvailability}
            disabled={isLoading}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>
              {isLoading ? t('common.loading') : t('calendar.addAvailability')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Existing Availability for Selected Date */}
        <View style={styles.existingContainer}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.existingAvailability')} - {selectedDate}
          </Text>

          {selectedDateAvailability.length > 0 ? (
            selectedDateAvailability.map((availability) => (
              <View key={availability.id} style={styles.availabilityItem}>
                <View style={styles.availabilityInfo}>
                  <View style={styles.availabilityHeader}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: availability.is_available ? '#28a745' : '#dc3545' }
                    ]} />
                    <Text style={styles.availabilityStatus}>
                      {availability.is_available ? t('calendar.available') : t('calendar.unavailable')}
                    </Text>
                  </View>
                  {availability.is_available && (
                    <Text style={styles.availabilityTime}>
                      {availability.start_time} - {availability.end_time}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteAvailability(availability.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.noAvailabilityContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={[styles.noAvailabilityText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.noAvailabilitySet')}
              </Text>
            </View>
          )}
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  toggleContainer: {
    marginBottom: 16,
  },
  toggleButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#667eea',
  },
  toggleButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  timeContainer: {
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 0.48,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  existingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityTime: {
    fontSize: 14,
    color: '#666',
    marginLeft: 16,
  },
  deleteButton: {
    padding: 8,
  },
  noAvailabilityContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noAvailabilityText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default TrainerAvailabilityScreen;
