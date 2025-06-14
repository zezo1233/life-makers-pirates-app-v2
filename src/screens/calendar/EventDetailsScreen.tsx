import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { format, parseISO } from 'date-fns';

// Import stores and utilities
import { useCalendarStore } from '../../store/calendarStore';
import { useAuthStore } from '../../store/authStore';
import { isRTL, getTextAlign } from '../../i18n';
import { CalendarEvent, UserRole } from '../../types';
import { CalendarStackParamList } from '../../types';

type EventDetailsScreenRouteProp = RouteProp<CalendarStackParamList, 'EventDetails'>;

const EventDetailsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<EventDetailsScreenRouteProp>();
  const { user } = useAuthStore();
  const { events, deleteEvent, isLoading } = useCalendarStore();

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const isRtl = isRTL(i18n.language);
  const { eventId } = route.params;

  useEffect(() => {
    loadEventDetails();
  }, [eventId, events]);

  const loadEventDetails = () => {
    try {
      const foundEvent = events.find(e => e.id === eventId);
      if (foundEvent) {
        setEvent(foundEvent);
      } else {
        Alert.alert(t('common.error'), t('calendar.eventNotFound'));
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      Alert.alert(t('common.error'), t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const canEditEvent = (): boolean => {
    if (!event || !user) return false;

    // Event creator can edit
    if (event.created_by === user.id) return true;

    // Admins and managers can edit
    if ([UserRole.PROVINCIAL_DEVELOPMENT_OFFICER, UserRole.DEVELOPMENT_MANAGEMENT_OFFICER, UserRole.TRAINER_PREPARATION_PROJECT_MANAGER].includes(user.role)) return true;

    return false;
  };

  const canDeleteEvent = (): boolean => {
    return canEditEvent();
  };

  const handleEditEvent = () => {
    if (!canEditEvent()) {
      Alert.alert(t('common.error'), t('common.accessDenied'));
      return;
    }

    // Navigate to edit screen (to be implemented)
    Alert.alert(t('common.info'), t('calendar.editFeatureComingSoon'));
  };

  const handleDeleteEvent = () => {
    if (!canDeleteEvent()) {
      Alert.alert(t('common.error'), t('common.accessDenied'));
      return;
    }

    Alert.alert(
      t('common.confirm'),
      t('calendar.confirmDeleteEvent'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              Toast.show({
                type: 'success',
                text1: t('common.success'),
                text2: t('calendar.eventDeleted'),
              });
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          },
        },
      ]
    );
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'training':
        return '#28a745';
      case 'meeting':
        return '#ffc107';
      case 'availability':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getEventTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'training':
        return 'school-outline';
      case 'meeting':
        return 'people-outline';
      case 'availability':
        return 'time-outline';
      default:
        return 'calendar-outline';
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, i18n.language === 'ar' ? 'dd/MM/yyyy - HH:mm' : 'MM/dd/yyyy - HH:mm');
  };

  const formatDate = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, i18n.language === 'ar' ? 'dd/MM/yyyy' : 'MM/dd/yyyy');
  };

  const formatTime = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={[styles.errorTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('calendar.eventNotFound')}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[
              styles.typeIndicator,
              { backgroundColor: getEventTypeColor(event.type) }
            ]}>
              <Ionicons
                name={getEventTypeIcon(event.type)}
                size={24}
                color="#fff"
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.eventTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {event.title}
              </Text>
              <Text style={[styles.eventType, { textAlign: getTextAlign(i18n.language) }]}>
                {t(`calendar.types.${event.type}`)}
              </Text>
            </View>
          </View>

          {(canEditEvent() || canDeleteEvent()) && (
            <View style={styles.headerActions}>
              {canEditEvent() && (
                <TouchableOpacity style={styles.actionButton} onPress={handleEditEvent}>
                  <Ionicons name="pencil-outline" size={20} color="#667eea" />
                </TouchableOpacity>
              )}
              {canDeleteEvent() && (
                <TouchableOpacity style={styles.actionButton} onPress={handleDeleteEvent}>
                  <Ionicons name="trash-outline" size={20} color="#dc3545" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Event Details */}
        <View style={styles.detailsContainer}>
          {/* Date and Time */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color="#667eea" />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.dateTime')}
              </Text>
              <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                {formatDate(event.start_date)}
              </Text>
              <Text style={[styles.detailSubValue, { textAlign: getTextAlign(i18n.language) }]}>
                {formatTime(event.start_date)} - {formatTime(event.end_date)}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="location-outline" size={20} color="#667eea" />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.form.location')}
              </Text>
              <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                {event.location}
              </Text>
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="document-text-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('calendar.form.description')}
                </Text>
                <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                  {event.description}
                </Text>
              </View>
            </View>
          )}

          {/* Max Attendees (for training events) */}
          {event.type === 'training' && event.max_attendees && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="people-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('calendar.form.maxAttendees')}
                </Text>
                <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                  {event.max_attendees} {t('calendar.participants')}
                </Text>
              </View>
            </View>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#667eea" />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('calendar.attendees')}
                </Text>
                <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                  {event.attendees.length} {t('calendar.registered')}
                </Text>
              </View>
            </View>
          )}

          {/* Created Info */}
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons name="information-circle-outline" size={20} color="#667eea" />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.createdAt')}
              </Text>
              <Text style={[styles.detailValue, { textAlign: getTextAlign(i18n.language) }]}>
                {formatDateTime(event.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {event.type === 'training' && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {t('calendar.joinEvent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="share-outline" size={20} color="#667eea" />
              <Text style={styles.secondaryButtonText}>
                {t('calendar.shareEvent')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  detailSubValue: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  primaryButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EventDetailsScreen;
