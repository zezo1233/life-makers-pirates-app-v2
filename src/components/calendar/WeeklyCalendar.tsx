import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameDay, 
  parseISO,
  addWeeks,
  subWeeks
} from 'date-fns';

// Import types and utilities
import { CalendarEvent } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WeeklyCalendarProps {
  events: CalendarEvent[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onEventPress: (event: CalendarEvent) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const dayWidth = (screenWidth - 32) / 7; // 32 for padding
const hourHeight = 60;

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventPress,
}) => {
  const { t, i18n } = useTranslation();
  const [currentWeek, setCurrentWeek] = useState(new Date(selectedDate));
  
  const isRtl = isRTL(i18n.language);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: isRtl ? 6 : 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: isRtl ? 6 : 0 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventDate = format(parseISO(event.start_date), 'yyyy-MM-dd');
      return eventDate === dateString;
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = parseISO(event.start_date);
    const endTime = parseISO(event.end_date);
    
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    return {
      top: startHour * hourHeight,
      height: Math.max(duration * hourHeight, 30), // Minimum height of 30
    };
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const renderDayHeader = (day: Date, index: number) => {
    const isSelected = isSameDay(day, new Date(selectedDate));
    const isToday = isSameDay(day, new Date());
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayHeader,
          isSelected && styles.dayHeaderSelected,
          isToday && styles.dayHeaderToday,
        ]}
        onPress={() => onDateSelect(format(day, 'yyyy-MM-dd'))}
      >
        <Text style={[
          styles.dayName,
          isSelected && styles.dayNameSelected,
          isToday && styles.dayNameToday,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {format(day, 'EEE')}
        </Text>
        <Text style={[
          styles.dayNumber,
          isSelected && styles.dayNumberSelected,
          isToday && styles.dayNumberToday,
          { textAlign: getTextAlign(i18n.language) }
        ]}>
          {format(day, 'd')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEvent = (event: CalendarEvent, dayIndex: number) => {
    const position = getEventPosition(event);
    const color = getEventColor(event);
    
    return (
      <TouchableOpacity
        key={event.id}
        style={[
          styles.eventBlock,
          {
            top: position.top,
            height: position.height,
            backgroundColor: color,
            left: dayIndex * dayWidth + 2,
            width: dayWidth - 4,
          },
        ]}
        onPress={() => onEventPress(event)}
      >
        <Text style={[styles.eventTitle, { textAlign: getTextAlign(i18n.language) }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.eventTime, { textAlign: getTextAlign(i18n.language) }]}>
          {format(parseISO(event.start_date), 'HH:mm')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHourLine = (hour: number) => (
    <View key={hour} style={[styles.hourLine, { top: hour * hourHeight }]}>
      <Text style={[styles.hourLabel, { textAlign: getTextAlign(i18n.language) }]}>
        {hour.toString().padStart(2, '0')}:00
      </Text>
      <View style={styles.hourDivider} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={[styles.weekNavigation, isRtl && styles.weekNavigationRtl]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('prev')}
        >
          <Ionicons 
            name={isRtl ? "chevron-forward" : "chevron-back"} 
            size={24} 
            color="#667eea" 
          />
        </TouchableOpacity>
        
        <Text style={[styles.weekTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('next')}
        >
          <Ionicons 
            name={isRtl ? "chevron-back" : "chevron-forward"} 
            size={24} 
            color="#667eea" 
          />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={[styles.dayHeaders, isRtl && styles.dayHeadersRtl]}>
        {weekDays.map(renderDayHeader)}
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.calendarGrid} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {/* Hour Lines */}
          {hours.map(renderHourLine)}
          
          {/* Day Columns */}
          {weekDays.map((day, dayIndex) => (
            <View key={dayIndex} style={[styles.dayColumn, { left: dayIndex * dayWidth }]}>
              {/* Events for this day */}
              {getEventsForDay(day).map(event => renderEvent(event, dayIndex))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  weekNavigationRtl: {
    flexDirection: 'row-reverse',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dayHeadersRtl: {
    flexDirection: 'row-reverse',
  },
  dayHeader: {
    width: dayWidth,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  dayHeaderSelected: {
    backgroundColor: '#667eea',
  },
  dayHeaderToday: {
    backgroundColor: '#e3f2fd',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#ffffff',
  },
  dayNameToday: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dayNumberSelected: {
    color: '#ffffff',
  },
  dayNumberToday: {
    color: '#667eea',
  },
  calendarGrid: {
    flex: 1,
  },
  gridContainer: {
    height: 24 * hourHeight,
    position: 'relative',
    paddingHorizontal: 16,
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: 50,
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  hourDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dayColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: dayWidth,
  },
  eventBlock: {
    position: 'absolute',
    borderRadius: 4,
    padding: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 255, 255, 0.8)',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default WeeklyCalendar;
