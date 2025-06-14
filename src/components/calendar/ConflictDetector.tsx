import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

// Import types and utilities
import { CalendarEvent } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface ConflictDetectorProps {
  visible: boolean;
  onClose: () => void;
  newEvent: Partial<CalendarEvent>;
  existingEvents: CalendarEvent[];
  onResolve: (resolution: 'force' | 'reschedule' | 'cancel') => void;
}

interface Conflict {
  event: CalendarEvent;
  type: 'time_overlap' | 'trainer_conflict' | 'location_conflict';
  severity: 'high' | 'medium' | 'low';
}

const ConflictDetector: React.FC<ConflictDetectorProps> = ({
  visible,
  onClose,
  newEvent,
  existingEvents,
  onResolve,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);

  const detectConflicts = (): Conflict[] => {
    if (!newEvent.start_date || !newEvent.end_date) return [];

    const conflicts: Conflict[] = [];
    const newStart = parseISO(newEvent.start_date);
    const newEnd = parseISO(newEvent.end_date);

    existingEvents.forEach(event => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);

      // Check time overlap
      if (areIntervalsOverlapping(
        { start: newStart, end: newEnd },
        { start: eventStart, end: eventEnd }
      )) {
        conflicts.push({
          event,
          type: 'time_overlap',
          severity: 'high',
        });
      }

      // Check trainer conflict (if same trainer is involved)
      if (newEvent.attendees && event.attendees) {
        const hasCommonAttendees = newEvent.attendees.some(attendee =>
          event.attendees?.includes(attendee)
        );
        if (hasCommonAttendees) {
          conflicts.push({
            event,
            type: 'trainer_conflict',
            severity: 'medium',
          });
        }
      }

      // Check location conflict (if same location)
      if (newEvent.location && event.location && 
          newEvent.location === event.location) {
        conflicts.push({
          event,
          type: 'location_conflict',
          severity: 'low',
        });
      }
    });

    return conflicts;
  };

  const conflicts = detectConflicts();
  const hasHighSeverityConflicts = conflicts.some(c => c.severity === 'high');

  const getConflictIcon = (type: string): string => {
    switch (type) {
      case 'time_overlap':
        return 'time-outline';
      case 'trainer_conflict':
        return 'person-outline';
      case 'location_conflict':
        return 'location-outline';
      default:
        return 'warning-outline';
    }
  };

  const getConflictColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const renderConflictItem = (conflict: Conflict, index: number) => (
    <View key={index} style={[
      styles.conflictItem,
      { borderLeftColor: getConflictColor(conflict.severity) },
      isRtl && { borderLeftWidth: 0, borderRightWidth: 4, borderRightColor: getConflictColor(conflict.severity) }
    ]}>
      <View style={[styles.conflictHeader, isRtl && styles.conflictHeaderRtl]}>
        <Ionicons 
          name={getConflictIcon(conflict.type) as any} 
          size={20} 
          color={getConflictColor(conflict.severity)} 
        />
        <Text style={[
          styles.conflictType,
          { color: getConflictColor(conflict.severity), textAlign: getTextAlign(i18n.language) }
        ]}>
          {t(`calendar.conflicts.${conflict.type}`)}
        </Text>
        <View style={[
          styles.severityBadge,
          { backgroundColor: getConflictColor(conflict.severity) }
        ]}>
          <Text style={styles.severityText}>
            {t(`calendar.severity.${conflict.severity}`)}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.conflictEventTitle, { textAlign: getTextAlign(i18n.language) }]}>
        {conflict.event.title}
      </Text>
      
      <Text style={[styles.conflictEventTime, { textAlign: getTextAlign(i18n.language) }]}>
        {format(parseISO(conflict.event.start_date), 'MMM dd, yyyy HH:mm')} - 
        {format(parseISO(conflict.event.end_date), 'HH:mm')}
      </Text>
      
      {conflict.event.location && (
        <Text style={[styles.conflictEventLocation, { textAlign: getTextAlign(i18n.language) }]}>
          📍 {conflict.event.location}
        </Text>
      )}
    </View>
  );

  const renderResolutionButtons = () => (
    <View style={styles.resolutionButtons}>
      <TouchableOpacity
        style={[styles.resolutionButton, styles.cancelButton]}
        onPress={() => onResolve('cancel')}
      >
        <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
        <Text style={[styles.resolutionButtonText, { color: '#dc3545' }]}>
          {t('calendar.conflicts.cancel')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.resolutionButton, styles.rescheduleButton]}
        onPress={() => onResolve('reschedule')}
      >
        <Ionicons name="calendar-outline" size={20} color="#ffc107" />
        <Text style={[styles.resolutionButtonText, { color: '#ffc107' }]}>
          {t('calendar.conflicts.reschedule')}
        </Text>
      </TouchableOpacity>
      
      {!hasHighSeverityConflicts && (
        <TouchableOpacity
          style={[styles.resolutionButton, styles.forceButton]}
          onPress={() => onResolve('force')}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#28a745" />
          <Text style={[styles.resolutionButtonText, { color: '#28a745' }]}>
            {t('calendar.conflicts.force')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (conflicts.length === 0) {
    return null; // No conflicts, don't show modal
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={[styles.modalHeader, isRtl && styles.modalHeaderRtl]}>
            <Ionicons name="warning" size={24} color="#ffc107" />
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.conflicts.detected')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* New Event Info */}
          <View style={styles.newEventInfo}>
            <Text style={[styles.newEventTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.conflicts.newEvent')}: {newEvent.title}
            </Text>
            <Text style={[styles.newEventTime, { textAlign: getTextAlign(i18n.language) }]}>
              {newEvent.start_date && format(parseISO(newEvent.start_date), 'MMM dd, yyyy HH:mm')} - 
              {newEvent.end_date && format(parseISO(newEvent.end_date), 'HH:mm')}
            </Text>
          </View>

          {/* Conflicts List */}
          <ScrollView style={styles.conflictsList} showsVerticalScrollIndicator={false}>
            <Text style={[styles.conflictsHeader, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.conflicts.found', { count: conflicts.length })}
            </Text>
            {conflicts.map(renderConflictItem)}
          </ScrollView>

          {/* Resolution Buttons */}
          {renderResolutionButtons()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff3cd',
  },
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    flex: 1,
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  newEventInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  newEventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  newEventTime: {
    fontSize: 14,
    color: '#666',
  },
  conflictsList: {
    flex: 1,
    padding: 16,
  },
  conflictsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  conflictItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conflictHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  conflictType: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  conflictEventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  conflictEventTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  conflictEventLocation: {
    fontSize: 12,
    color: '#666',
  },
  resolutionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    justifyContent: 'space-around',
  },
  resolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  cancelButton: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  rescheduleButton: {
    borderColor: '#ffc107',
    backgroundColor: '#fff3cd',
  },
  forceButton: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda',
  },
  resolutionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default ConflictDetector;
