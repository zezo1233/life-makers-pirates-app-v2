import React, { useState, useEffect } from 'react';
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
import { format, parseISO } from 'date-fns';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useTrainingRequestsStore } from '../../store/trainingRequestsStore';
import { useCalendarStore } from '../../store/calendarStore';
import { TrainingRequest } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface TrainingRequestIntegrationProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: string;
}

const TrainingRequestIntegration: React.FC<TrainingRequestIntegrationProps> = ({
  visible,
  onClose,
  selectedDate,
}) => {
  const { t, i18n } = useTranslation();
  const { requests, fetchRequests } = useTrainingRequestsStore();
  const { createEvent } = useCalendarStore();
  
  const [approvedRequests, setApprovedRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (visible) {
      loadApprovedRequests();
    }
  }, [visible]);

  const loadApprovedRequests = async () => {
    try {
      setLoading(true);
      // Load all requests without user filtering for calendar integration
      await fetchRequests();

      // Filter approved requests that don't have calendar events yet
      // We'll need to check against calendar events to see which requests are already scheduled
      const approved = requests.filter((request: TrainingRequest) =>
        request.status === 'final_approved'
      );

      setApprovedRequests(approved);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  const createCalendarEvent = async (request: TrainingRequest) => {
    try {
      setLoading(true);
      
      // Create event data from training request
      const eventData = {
        title: `${t('training.training')}: ${request.title}`,
        description: request.description,
        start_date: selectedDate ?
          `${selectedDate}T09:00:00.000Z` :
          request.requested_date,
        end_date: selectedDate ?
          `${selectedDate}T11:00:00.000Z` :
          new Date(new Date(request.requested_date).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        location: `${t(`provinces.${request.province}`)} - ${t(`specializations.${request.specialization}`)}`,
        type: 'training' as const,
        training_request_id: request.id,
        max_attendees: request.max_participants,
        attendees: [],
      };

      await createEvent(eventData);
      
      Toast.show({
        type: 'success',
        text1: t('calendar.eventCreated'),
        text2: t('calendar.trainingScheduled'),
      });

      // Refresh the list
      await loadApprovedRequests();
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.createEventFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRequestItem = (request: TrainingRequest) => (
    <View key={request.id} style={[styles.requestItem, isRtl && styles.requestItemRtl]}>
      <View style={styles.requestInfo}>
        <Text style={[styles.requestTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {request.title}
        </Text>
        <Text style={[styles.requestDetails, { textAlign: getTextAlign(i18n.language) }]}>
          {t(`specializations.${request.specialization}`)} • {t(`provinces.${request.province}`)}
        </Text>
        <Text style={[styles.requestDate, { textAlign: getTextAlign(i18n.language) }]}>
          {t('training.requestedDate')}: {format(parseISO(request.requested_date), 'MMM dd, yyyy')}
        </Text>
        <Text style={[styles.requestDuration, { textAlign: getTextAlign(i18n.language) }]}>
          {t('training.duration')}: 2 {t('common.hours')}
        </Text>
        {request.max_participants && (
          <Text style={[styles.requestParticipants, { textAlign: getTextAlign(i18n.language) }]}>
            {t('training.maxParticipants')}: {request.max_participants}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={() => createCalendarEvent(request)}
        disabled={loading}
      >
        <Ionicons name="calendar-outline" size={20} color="#ffffff" />
        <Text style={styles.scheduleButtonText}>
          {t('calendar.schedule')}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('calendar.scheduleTraining')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Selected Date Info */}
          {selectedDate && (
            <View style={styles.selectedDateInfo}>
              <Ionicons name="calendar-outline" size={20} color="#667eea" />
              <Text style={[styles.selectedDateText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('calendar.schedulingFor')}: {format(parseISO(selectedDate), 'MMMM dd, yyyy')}
              </Text>
            </View>
          )}

          {/* Approved Requests List */}
          <ScrollView style={styles.requestsList} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('common.loading')}
                </Text>
              </View>
            ) : approvedRequests.length > 0 ? (
              approvedRequests.map(renderRequestItem)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color="#28a745" />
                <Text style={[styles.emptyText, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('calendar.noApprovedRequests')}
                </Text>
                <Text style={[styles.emptySubtext, { textAlign: getTextAlign(i18n.language) }]}>
                  {t('calendar.allRequestsScheduled')}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.refreshButton} onPress={loadApprovedRequests}>
              <Ionicons name="refresh-outline" size={20} color="#667eea" />
              <Text style={styles.refreshButtonText}>{t('common.refresh')}</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '500',
  },
  requestsList: {
    flex: 1,
    padding: 16,
  },
  requestItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  requestItemRtl: {
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderRightColor: '#28a745',
  },
  requestInfo: {
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 2,
  },
  requestDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  requestParticipants: {
    fontSize: 14,
    color: '#666',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  refreshButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TrainingRequestIntegration;
