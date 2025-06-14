import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

// Import components
import WeeklyCalendar from '../../components/calendar/WeeklyCalendar';
import TrainingRequestIntegration from '../../components/calendar/TrainingRequestIntegration';
import CalendarExporter from '../../components/calendar/CalendarExporter';

// Import stores and types
import { useCalendarStore } from '../../store/calendarStore';
import { useAuthStore } from '../../store/authStore';
import { CalendarStackParamList, CalendarEvent, UserRole } from '../../types';
import { isRTL, getTextAlign, getMonthNames, getShortDayNames } from '../../i18n';

type CalendarScreenNavigationProp = StackNavigationProp<CalendarStackParamList, 'CalendarView'>;

const CalendarScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { user } = useAuthStore();
  const {
    events,
    selectedDate,
    viewMode,
    isLoading,
    fetchEvents,
    setSelectedDate,
    setViewMode,
    getEventsForDate,
    subscribeToEvents,
  } = useCalendarStore();

  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['training', 'meeting', 'availability', 'other']);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showTrainingIntegration, setShowTrainingIntegration] = useState(false);
  const [showExporter, setShowExporter] = useState(false);

  const isRtl = isRTL(i18n.language);

  // Subscribe to real-time events
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeToEvents();
      return unsubscribe;
    }, [subscribeToEvents])
  );

  // Fetch events when component mounts or date changes
  useEffect(() => {
    loadEvents();
  }, [selectedDate]);

  // Update marked dates when events change
  useEffect(() => {
    updateMarkedDates();
  }, [events, selectedDate]);

  const loadEvents = async () => {
    try {
      const currentDate = new Date(selectedDate);
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      await fetchEvents(startDate, endDate);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert(t('common.error'), t('errors.unknownError'));
    }
  };

  const updateMarkedDates = () => {
    const marked: any = {};
    
    // Mark selected date
    marked[selectedDate] = {
      selected: true,
      selectedColor: '#667eea',
    };

    // Mark dates with events
    events.forEach((event) => {
      const eventDate = format(parseISO(event.start_date), 'yyyy-MM-dd');
      
      if (marked[eventDate]) {
        marked[eventDate] = {
          ...marked[eventDate],
          marked: true,
          dotColor: getEventColor(event),
        };
      } else {
        marked[eventDate] = {
          marked: true,
          dotColor: getEventColor(event),
        };
      }
    });

    setMarkedDates(marked);
  };

  const getEventColor = (event: CalendarEvent): string => {
    switch (event.type) {
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

  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const navigateToCreateEvent = () => {
    navigation.navigate('CreateEvent');
  };

  const navigateToEventDetails = (eventId: string) => {
    navigation.navigate('EventDetails', { eventId });
  };

  const navigateToTrainerAvailability = () => {
    navigation.navigate('TrainerAvailability');
  };

  const toggleFilter = (filterType: string) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterType)) {
        return prev.filter(f => f !== filterType);
      } else {
        return [...prev, filterType];
      }
    });
  };

  const getFilteredEvents = () => {
    return events.filter(event => selectedFilters.includes(event.type));
  };

  const getFilteredEventsForDate = (date: string) => {
    const dateEvents = getEventsForDate(date);
    return dateEvents.filter(event => selectedFilters.includes(event.type));
  };

  const renderFilterButton = (type: string, icon: string, color: string) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.filterButton,
        selectedFilters.includes(type) && { backgroundColor: color },
        isRtl && styles.filterButtonRtl
      ]}
      onPress={() => toggleFilter(type)}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={selectedFilters.includes(type) ? '#ffffff' : color}
      />
      <Text style={[
        styles.filterButtonText,
        { color: selectedFilters.includes(type) ? '#ffffff' : color }
      ]}>
        {t(`calendar.types.${type}`)}
      </Text>
    </TouchableOpacity>
  );

  const renderEventItem = (event: CalendarEvent) => (
    <TouchableOpacity
      key={event.id}
      style={[
        styles.eventItem,
        { borderLeftColor: getEventColor(event) },
        isRtl && styles.eventItemRtl,
      ]}
      onPress={() => navigateToEventDetails(event.id)}
    >
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {event.title}
        </Text>
        <Text style={[styles.eventTime, { textAlign: getTextAlign(i18n.language) }]}>
          {format(parseISO(event.start_date), 'HH:mm')} - {format(parseISO(event.end_date), 'HH:mm')}
        </Text>
        {event.description && (
          <Text style={[styles.eventDescription, { textAlign: getTextAlign(i18n.language) }]}>
            {event.description}
          </Text>
        )}
      </View>
      <Ionicons
        name={isRtl ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color="#666"
      />
    </TouchableOpacity>
  );

  const selectedDateEvents = getFilteredEventsForDate(selectedDate);

  return (
    <View style={styles.container}>
      {/* Header Controls */}
      <View style={[styles.header, isRtl && styles.headerRtl]}>
        <View style={[styles.viewModeContainer, isRtl && styles.viewModeContainerRtl]}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[
              styles.viewModeText,
              viewMode === 'month' && styles.viewModeTextActive
            ]}>
              {t('calendar.month')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[
              styles.viewModeText,
              viewMode === 'week' && styles.viewModeTextActive
            ]}>
              {t('calendar.week')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionButtons, isRtl && styles.actionButtonsRtl]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter-outline" size={20} color="#667eea" />
          </TouchableOpacity>
          {user?.role === UserRole.TRAINER && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={navigateToTrainerAvailability}
            >
              <Ionicons name="time-outline" size={20} color="#667eea" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToCreateEvent}
          >
            <Ionicons name="add" size={24} color="#667eea" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersContainer, isRtl && styles.filtersContainerRtl]}>
          {renderFilterButton('training', 'school-outline', '#28a745')}
          {renderFilterButton('meeting', 'people-outline', '#ffc107')}
          {renderFilterButton('availability', 'time-outline', '#17a2b8')}
          {renderFilterButton('other', 'calendar-outline', '#6c757d')}
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendar Component */}
        {viewMode === 'month' ? (
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            monthFormat={isRtl ? 'MMMM yyyy' : 'MMMM yyyy'}
            hideExtraDays={true}
            disableMonthChange={false}
            firstDay={isRtl ? 6 : 0} // Saturday for Arabic, Sunday for English
            hideDayNames={false}
            showWeekNumbers={false}
            onPressArrowLeft={(subtractMonth) => subtractMonth()}
            onPressArrowRight={(addMonth) => addMonth()}
            disableArrowLeft={false}
            disableArrowRight={false}
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
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#2d4150',
              indicatorColor: '#667eea',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
            style={styles.calendar}
          />
        ) : (
          <WeeklyCalendar
            events={getFilteredEvents()}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventPress={(event) => navigateToEventDetails(event.id)}
          />
        )}

        {/* Events for Selected Date */}
        <View style={styles.eventsContainer}>
          <Text style={[styles.eventsTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('calendar.events')} - {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
          </Text>
          
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(renderEventItem)
          ) : (
            <View style={styles.noEventsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={[styles.noEventsText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.noEvents')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Quick Actions */}
      <View style={[styles.quickActionsContainer, isRtl && styles.quickActionsContainerRtl]}>
        {showQuickActions && (
          <>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
              onPress={navigateToTrainerAvailability}
            >
              <Ionicons name="time-outline" size={24} color="#667eea" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
              onPress={() => setShowTrainingIntegration(true)}
            >
              <Ionicons name="link-outline" size={24} color="#667eea" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
              onPress={() => {
                // Navigate to today
                setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
              }}
            >
              <Ionicons name="today-outline" size={24} color="#667eea" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => setShowQuickActions(!showQuickActions)}
        >
          <Ionicons
            name={showQuickActions ? "close" : "menu"}
            size={24}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      {/* Training Request Integration Modal */}
      <TrainingRequestIntegration
        visible={showTrainingIntegration}
        onClose={() => setShowTrainingIntegration(false)}
        selectedDate={selectedDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerRtl: {
    flexDirection: 'row-reverse',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2,
  },
  viewModeContainerRtl: {
    flexDirection: 'row-reverse',
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#667eea',
  },
  viewModeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  viewModeTextActive: {
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  calendar: {
    marginBottom: 16,
  },
  eventsContainer: {
    padding: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  eventItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventItemRtl: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    flexDirection: 'row-reverse',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filtersContainerRtl: {
    flexDirection: 'row-reverse',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
  },
  filterButtonRtl: {
    marginRight: 0,
    marginLeft: 8,
    flexDirection: 'row-reverse',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  quickActionsContainerRtl: {
    right: 'auto',
    left: 20,
  },
  quickActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  quickActionButtonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#667eea',
  },
});

export default CalendarScreen;
