import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useTrainingRequestsStore, getStatusDisplayName, getStatusColor, canApproveRequest, canEditRequest, parseUserSpecializations } from '../../store/trainingRequestsStore';
import { useTrainerApplicationsStore, canReviewApplications, getApplicationStatusDisplayName, getApplicationStatusColor } from '../../store/trainerApplicationsStore';
import { useAuthStore } from '../../store/authStore';
import { TrainingRequest, TrainingStatus, UserRole } from '../../types';
import { RequestsStackParamList } from '../../navigation/RequestsNavigator';
import { isRTL, getTextAlign } from '../../i18n';
import TrainerRecommendations from '../../components/ai/TrainerRecommendations';
import ProgressTracker from '../../components/workflow/ProgressTracker';
import QuickActions from '../../components/workflow/QuickActions';
import { supabase, TABLES } from '../../config/supabase';

type RequestDetailsRouteProp = RouteProp<RequestsStackParamList, 'RequestDetails'>;
type RequestDetailsNavigationProp = StackNavigationProp<RequestsStackParamList, 'RequestDetails'>;

const RequestDetailsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const route = useRoute<RequestDetailsRouteProp>();
  const navigation = useNavigation<RequestDetailsNavigationProp>();

  // Safe parameter extraction with validation
  const requestId = route.params?.requestId;

  // Early return if no requestId
  if (!requestId) {
    console.error('❌ No requestId provided to RequestDetailsScreen');
    React.useEffect(() => {
      Toast.show({
        type: 'error',
        text1: 'خطأ في المعاملات',
        text2: 'لم يتم توفير معرف الطلب',
      });
      navigation.goBack();
    }, []);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>خطأ: لم يتم توفير معرف الطلب</Text>
      </View>
    );
  }

  const { getRequestById, updateRequest, isLoading } = useTrainingRequestsStore();
  const { user } = useAuthStore();
  const {
    applications,
    fetchApplications,
    applyForRequest,
    rejectApplication,
    rejectRemainingApplications,
    hasApplied,
    getApplicationsByRequest,
    getAvailableApplicationsByRequest
  } = useTrainerApplicationsStore();

  const [request, setRequest] = useState<TrainingRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [availableTrainersCount, setAvailableTrainersCount] = useState(0);

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    console.log('🔄 RequestDetailsScreen mounted with requestId:', requestId);
    loadRequest();
    fetchApplications(requestId);
  }, [requestId]);

  useEffect(() => {
    if (request) {
      checkAvailableTrainers();
    }
  }, [request]);

  const loadRequest = async () => {
    console.log('🔍 Loading request with ID:', requestId);

    // First try to get from local store
    let foundRequest = getRequestById(requestId);

    if (!foundRequest) {
      console.log('📡 Request not found locally, fetching from server...');

      try {
        // Fetch from server if not found locally
        const { data: serverRequest, error } = await supabase
          .from(TABLES.TRAINING_REQUESTS)
          .select(`
            *,
            requester:users!training_requests_requester_id_fkey(id, full_name, email, role, province),
            assigned_trainer:users!training_requests_assigned_trainer_id_fkey(id, full_name, email, specialization, rating)
          `)
          .eq('id', requestId)
          .single();

        if (error) {
          console.error('❌ Error fetching request from server:', error);
          throw error;
        }

        if (serverRequest) {
          console.log('✅ Request found on server:', serverRequest.title);
          foundRequest = serverRequest as TrainingRequest;

          // Update local store with the fetched request
          useTrainingRequestsStore.setState(state => ({
            requests: [foundRequest!, ...state.requests.filter(r => r.id !== foundRequest!.id)]
          }));
        }
      } catch (error) {
        console.error('❌ Failed to fetch request from server:', error);
      }
    } else {
      console.log('✅ Request found locally:', foundRequest.title);
    }

    setRequest(foundRequest || null);

    if (!foundRequest) {
      console.error('❌ Request not found anywhere:', requestId);
      console.error('❌ Available requests in store:', useTrainingRequestsStore.getState().requests.map(r => ({ id: r.id, title: r.title })));

      Toast.show({
        type: 'error',
        text1: t('errors.notFound'),
        text2: `Request ID: ${requestId}`,
      });

      // Add delay before going back to allow user to see the error
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
    } else {
      console.log('✅ Request loaded successfully:', foundRequest.title);
    }
  };

  const checkAvailableTrainers = async () => {
    if (!request) return;

    try {
      // Get trainers who match the request criteria and are available
      const { data: trainers, error } = await supabase
        .from(TABLES.USERS)
        .select('id, specialization, province, is_active')
        .eq('role', UserRole.TRAINER)
        .eq('is_active', true)
        .eq('province', request.province);

      if (error) {
        console.error('Error fetching trainers:', error);
        setAvailableTrainersCount(0);
        return;
      }

      if (!trainers) {
        setAvailableTrainersCount(0);
        return;
      }

      // Filter trainers by specialization
      const matchingTrainers = trainers.filter(trainer => {
        // Handle trainer specialization (could be string or array)
        let trainerSpecs: string[] = [];
        if (Array.isArray(trainer.specialization)) {
          trainerSpecs = trainer.specialization;
        } else if (typeof trainer.specialization === 'string') {
          try {
            const parsed = JSON.parse(trainer.specialization);
            trainerSpecs = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            trainerSpecs = [trainer.specialization];
          }
        }

        return trainerSpecs.includes(request.specialization);
      });

      setAvailableTrainersCount(matchingTrainers.length);
    } catch (error) {
      console.error('Error checking available trainers:', error);
      setAvailableTrainersCount(0);
    }
  };

  const handleApplyForRequest = async () => {
    if (!request || !user) return;

    try {
      await applyForRequest(request.id, 'أرغب في التقدم لهذا التدريب');
      Toast.show({
        type: 'success',
        text1: t('training.applicationSubmitted'),
      });
      // Refresh applications
      fetchApplications(requestId);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.applicationFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSelectTrainer = async (trainerId: string) => {
    if (!request || !trainerId) return;

    try {
      // 1. Update request to assign trainer and change status to tr_assigned
      await updateRequest(request.id, {
        assigned_trainer_id: trainerId,
        status: TrainingStatus.TR_ASSIGNED
      });

      // 2. Reject all remaining applications for this request
      await rejectRemainingApplications(request.id, trainerId);

      Toast.show({
        type: 'success',
        text1: t('training.trainerSelected'),
        text2: t('training.remainingApplicationsRejected'),
      });

      // Refresh request and applications
      loadRequest();
      fetchApplications(requestId);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.selectionFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleScheduleTraining = async (requestId: string) => {
    if (!request || !user) return;

    // التحقق من وجود مدرب معين
    if (!request.assigned_trainer_id) {
      throw new Error('No trainer assigned to this request');
    }

    try {
      // 1. إنشاء حدث في التقويم
      const calendarEvent = {
        title: request.title,
        description: request.description,
        start_date: request.requested_date,
        end_date: new Date(new Date(request.requested_date).getTime() + request.duration_hours * 60 * 60 * 1000).toISOString(),
        location: t(`provinces.${request.province}`),
        training_request_id: request.id,
        assigned_trainer_id: request.assigned_trainer_id,
        type: 'training' as const,
        max_attendees: request.max_participants,
        created_by: user.id,
      };

      // إنشاء الحدث
      const { data: eventData, error: eventError } = await supabase
        .from('calendar_events')
        .insert(calendarEvent)
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. إنشاء chat room بين DV والمدرب
      const chatRoom = {
        name: `${request.title} - Chat`,
        type: 'direct' as const,
        participants: [user.id, request.assigned_trainer_id],
        created_by: user.id,
        training_request_id: request.id,
      };

      const { data: chatData, error: chatError } = await supabase
        .from('chat_rooms')
        .insert(chatRoom)
        .select()
        .single();

      if (chatError) throw chatError;

    } catch (error) {
      console.error('Error scheduling training:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh from server first with user filtering
      const userSpecializations = parseUserSpecializations(user?.specialization);

      const filters = user ? {
        userRole: user.role,
        userSpecializations
      } : undefined;

      await useTrainingRequestsStore.getState().fetchRequests(filters);
      // Then load the updated request
      loadRequest();
      fetchApplications(requestId);
    } catch (error) {
      console.error('Refresh error:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.refreshFailed'),
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async () => {
    if (!request || !user) return;

    Alert.alert(
      t('training.approve'),
      t('training.confirmApproval'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('training.approve'),
          onPress: async () => {
            try {
              const nextStatus = getNextApprovalStatus(request.status);
              await updateRequest(request.id, { status: nextStatus });

              // Show different message based on approval type
              if (nextStatus === 'sv_approved') {
                Toast.show({
                  type: 'success',
                  text1: t('training.requestApprovedBySV'),
                  text2: t('training.applicationsListHidden'),
                });
              } else if (nextStatus === 'final_approved') {
                Toast.show({
                  type: 'success',
                  text1: t('training.requestFinallyApproved'),
                  text2: t('training.readyForExecution'),
                });
              } else if (nextStatus === 'scheduled') {
                // إنشاء الحدث والـ chat room
                try {
                  await handleScheduleTraining(request.id);
                  Toast.show({
                    type: 'success',
                    text1: t('training.trainingScheduled'),
                    text2: t('training.eventCreatedAndChatOpened'),
                  });
                } catch (scheduleError) {
                  // إذا فشل إنشاء الحدث، لا نغير الحالة
                  throw new Error(scheduleError instanceof Error ? scheduleError.message : 'Scheduling failed');
                }
              } else {
                Toast.show({
                  type: 'success',
                  text1: t('training.requestApproved'),
                });
              }

              loadRequest();
              // Refresh applications to update the UI
              fetchApplications(requestId);
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.approvalFailed'),
              });
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!request) return;

    Alert.alert(
      t('training.reject'),
      t('training.confirmRejection'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('training.reject'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateRequest(request.id, { status: TrainingStatus.REJECTED });

              Toast.show({
                type: 'success',
                text1: t('training.requestRejected'),
              });

              loadRequest();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.rejectionFailed'),
              });
            }
          },
        },
      ]
    );
  };

  const getNextApprovalStatus = (currentStatus: TrainingStatus): TrainingStatus => {
    switch (currentStatus) {
      case TrainingStatus.UNDER_REVIEW:
        return TrainingStatus.CC_APPROVED; // CC يوافق أولاً
      case TrainingStatus.CC_APPROVED:
        return TrainingStatus.PM_APPROVED; // PM يوافق ثانياً
      case TrainingStatus.PM_APPROVED:
        return TrainingStatus.TR_ASSIGNED; // TR يقبل التعيين
      case TrainingStatus.TR_ASSIGNED:
        return TrainingStatus.SV_APPROVED; // SV يوافق أخيراً
      case TrainingStatus.SV_APPROVED:
        return TrainingStatus.FINAL_APPROVED; // الموافقة النهائية
      case TrainingStatus.FINAL_APPROVED:
        return TrainingStatus.SCHEDULED; // DV يضغط received
      default:
        return currentStatus;
    }
  };

  const canUserApprove = (): boolean => {
    if (!request || !user) return false;
    return canApproveRequest(user.role as UserRole, request.status);
  };

  const canUserEdit = (): boolean => {
    if (!request || !user) return false;
    return canEditRequest(user.role as UserRole, request.status, request.requester_id, user.id);
  };

  const handleEditRequest = () => {
    if (!request) return;

    // Navigate to edit screen with request data
    navigation.navigate('CreateRequest', {
      editMode: true,
      requestId: request.id,
      requestData: {
        title: request.title,
        description: request.description,
        specialization: request.specialization,
        province: request.province,
        requested_date: request.requested_date,
        duration_hours: request.duration_hours,
        max_participants: request.max_participants,
      }
    });
  };

  const handleTrainerSelect = async (trainerId: string) => {
    if (!request) return;

    try {
      await updateRequest(request.id, {
        assigned_trainer_id: trainerId,
        status: TrainingStatus.TR_ASSIGNED
      });

      Toast.show({
        type: 'success',
        text1: t('ai.trainerSelected'),
      });

      setShowRecommendations(false);
      loadRequest();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
      });
    }
  };

  const canShowRecommendations = (): boolean => {
    if (!request || !user) return false;

    // Get pending applications (not rejected)
    const pendingApplications = getApplicationsByRequest(request.id).filter(
      app => app.status === 'pending'
    );

    // Show recommendations only if:
    // 1. Request is approved by PM and needs trainer assignment
    // 2. There are at least 2 trainers who applied (pending applications)
    // 3. User has permission to assign trainers
    // 4. Request is not yet finally approved
    return request.status === TrainingStatus.PM_APPROVED &&
           !request.assigned_trainer_id &&
           pendingApplications.length >= 2 &&
           (user.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
            user.role === UserRole.PROGRAM_SUPERVISOR);
  };

  const handleCompleteTraining = async () => {
    if (!request) return;

    try {
      await updateRequest(request.id, { status: TrainingStatus.COMPLETED });

      Toast.show({
        type: 'success',
        text1: t('training.trainingCompleted'),
      });

      // Navigate to feedback screen
      // navigation.navigate('TrainingFeedback', { requestId: request.id });

      loadRequest();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
      });
    }
  };

  const handleCancelTraining = async () => {
    if (!request) return;

    Alert.alert(
      t('training.cancelTraining'),
      t('training.confirmCancellation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('training.cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateRequest(request.id, { status: TrainingStatus.CANCELLED });

              Toast.show({
                type: 'success',
                text1: t('training.trainingCancelled'),
              });

              // Navigate to cancellation reason screen
              // navigation.navigate('CancellationReason', { requestId: request.id });

              loadRequest();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.updateFailed'),
              });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US');
  };

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          <Text style={styles.statusText}>
            {getStatusDisplayName(request.status, i18n.language)}
          </Text>
        </View>

        <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
          {request.title}
        </Text>

        <Text style={[styles.description, { textAlign: getTextAlign(i18n.language) }]}>
          {request.description}
        </Text>
      </View>

      {/* Progress Tracker */}
      <ProgressTracker currentStatus={request.status} />

      {/* Quick Actions */}
      <QuickActions request={request} onActionComplete={loadRequest} />

      {/* Details Section */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('training.requestedBy')}:</Text>
          <Text style={styles.detailValue}>{request.requester?.full_name || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('auth.province')}:</Text>
          <Text style={styles.detailValue}>{t(`provinces.${request.province}`)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="school-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('training.specialization')}:</Text>
          <Text style={styles.detailValue}>{t(`specializations.${request.specialization}`)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('training.requestedDate')}:</Text>
          <Text style={styles.detailValue}>{formatDate(request.requested_date)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('training.duration')}:</Text>
          <Text style={styles.detailValue}>{request.duration_hours} {t('calendar.hours')}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="people-outline" size={20} color="#667eea" />
          <Text style={styles.detailLabel}>{t('training.maxParticipants')}:</Text>
          <Text style={styles.detailValue}>{request.max_participants}</Text>
        </View>

        {request.assigned_trainer_id && (
          <View style={styles.detailRow}>
            <Ionicons name="person-circle-outline" size={20} color="#667eea" />
            <Text style={styles.detailLabel}>{t('training.assignedTrainer')}:</Text>
            <Text style={styles.detailValue}>{request.assigned_trainer?.full_name || 'N/A'}</Text>
          </View>
        )}
      </View>

      {/* SV Approval Message */}
      {(request?.status === 'sv_approved' || request?.status === 'final_approved') && (
        <View style={styles.finalApprovalContainer}>
          <View style={styles.finalApprovalContent}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <View style={styles.finalApprovalTextContainer}>
              <Text style={[styles.finalApprovalTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {request?.status === 'final_approved'
                  ? t('training.requestFinallyApproved')
                  : t('training.requestApprovedBySV')
                }
              </Text>
              <Text style={[styles.finalApprovalMessage, { textAlign: getTextAlign(i18n.language) }]}>
                {request?.status === 'final_approved'
                  ? t('training.finalApprovalMessage')
                  : t('training.svApprovalMessage')
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* PM Final Approval Notice */}
      {request?.status === 'sv_approved' &&
       user?.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER && (
        <View style={styles.pmNoticeContainer}>
          <View style={styles.pmNoticeContent}>
            <Ionicons name="information-circle" size={24} color="#0066cc" />
            <View style={styles.pmNoticeTextContainer}>
              <Text style={[styles.pmNoticeTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {t('training.awaitingFinalApproval')}
              </Text>
              <Text style={[styles.pmNoticeMessage, { textAlign: getTextAlign(i18n.language) }]}>
                {t('training.pmFinalApprovalMessage')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Edit Button for DV */}
      {canUserEdit() && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEditRequest}
            disabled={isLoading}
          >
            <Ionicons name="create-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('training.editRequest')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      {canUserApprove() && request?.status !== TrainingStatus.SCHEDULED && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={isLoading}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>
              {request?.status === 'final_approved' ? t('training.received') : t('training.approve')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={isLoading}
          >
            <Ionicons name="close-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('training.reject')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scheduled Training Actions */}
      {request?.status === 'scheduled' &&
       (user?.role === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER ||
        user?.role === UserRole.TRAINER) && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleCompleteTraining()}
            disabled={isLoading}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('training.markCompleted')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelTraining()}
            disabled={isLoading}
          >
            <Ionicons name="close-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('training.markCancelled')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trainer Application Button */}
      {user?.role === UserRole.TRAINER &&
       request?.status === 'pm_approved' &&
       !hasApplied(request.id, user.id) && (
        <View style={styles.aiContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApplyForRequest}
            disabled={isLoading}
          >
            <Ionicons name="hand-right-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('training.applyForRequest')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Show Application Status for Trainers */}
      {user?.role === UserRole.TRAINER &&
       request?.status === 'pm_approved' &&
       hasApplied(request.id, user.id) && (
        <View style={styles.aiContainer}>
          <View style={[styles.statusContainer, styles.appliedContainer]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28a745" />
            <Text style={styles.appliedText}>{t('training.alreadyApplied')}</Text>
          </View>
        </View>
      )}

      {/* Show Applications for Supervisors - Only Reject functionality */}
      {canReviewApplications(user?.role || '') &&
       request &&
       request.status !== 'sv_approved' &&
       request.status !== 'final_approved' &&
       getApplicationsByRequest(request.id).length > 0 && (
        <View style={styles.applicationsContainer}>
          <Text style={[styles.applicationsTitle, { textAlign: getTextAlign(i18n.language) }]}>
            {t('training.trainerApplications')} ({getApplicationsByRequest(request.id).length})
          </Text>
          <Text style={[styles.applicationsNote, { textAlign: getTextAlign(i18n.language) }]}>
            {t('training.applicationsNote')}
          </Text>
          {getApplicationsByRequest(request.id).map((application) => (
            <View key={application.id} style={styles.applicationItem}>
              <View style={styles.applicationHeader}>
                <Text style={styles.trainerName}>
                  {application.trainer?.full_name}
                </Text>
                <View style={[
                  styles.applicationStatusBadge,
                  { backgroundColor: getApplicationStatusColor(application.status) }
                ]}>
                  <Text style={styles.applicationStatusText}>
                    {getApplicationStatusDisplayName(application.status, i18n.language)}
                  </Text>
                </View>
              </View>
              {application.application_message && (
                <Text style={styles.applicationMessage}>
                  {application.application_message}
                </Text>
              )}
              {application.status === 'pending' && (
                <View style={styles.applicationActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.selectButton]}
                    onPress={() => handleSelectTrainer(application.trainer?.id || '')}
                  >
                    <Text style={styles.actionButtonText}>{t('training.selectTrainer')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => rejectApplication(application.id)}
                  >
                    <Text style={styles.actionButtonText}>{t('common.reject')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* AI Trainer Recommendations Button */}
      {canShowRecommendations() && (
        <View style={styles.aiContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.aiButton]}
            onPress={() => setShowRecommendations(true)}
            disabled={isLoading}
          >
            <Ionicons name="sparkles" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t('ai.trainerRecommendations')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message when not enough trainer applications */}
      {request?.status === TrainingStatus.PM_APPROVED &&
       !request.assigned_trainer_id &&
       getApplicationsByRequest(request.id).filter(app => app.status === 'pending').length < 2 &&
       (user?.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER ||
        user?.role === UserRole.PROGRAM_SUPERVISOR) && (
        <View style={styles.warningContainer}>
          <View style={styles.warningContent}>
            <Ionicons name="warning-outline" size={24} color="#ff9500" />
            <View style={styles.warningTextContainer}>
              <Text style={[styles.warningTitle, { textAlign: getTextAlign(i18n.language) }]}>
                {t('ai.notEnoughTrainers')}
              </Text>
              <Text style={[styles.warningMessage, { textAlign: getTextAlign(i18n.language) }]}>
                {t('ai.needAtLeastTwoApplications', {
                  count: getApplicationsByRequest(request.id).filter(app => app.status === 'pending').length
                })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Timestamps */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestampText}>
          {t('common.created')}: {formatDate(request.created_at)}
        </Text>
        <Text style={styles.timestampText}>
          {t('common.updated')}: {formatDate(request.updated_at)}
        </Text>
      </View>

      {/* AI Trainer Recommendations Modal */}
      <TrainerRecommendations
        visible={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        requestId={requestId}
        onTrainerSelect={handleTrainerSelect}
      />
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  aiContainer: {
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  aiButton: {
    backgroundColor: '#667eea',
  },
  applyButton: {
    backgroundColor: '#17a2b8',
  },
  selectButton: {
    backgroundColor: '#28a745',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  editButton: {
    backgroundColor: '#17a2b8',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timestampContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  warningContainer: {
    padding: 20,
    paddingTop: 0,
  },
  warningContent: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  appliedContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  appliedText: {
    color: '#155724',
    fontSize: 14,
    fontWeight: '500',
  },
  applicationsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applicationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  applicationsNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  applicationItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  applicationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  applicationStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  applicationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  applicationActions: {
    flexDirection: 'row',
    gap: 10,
  },
  finalApprovalContainer: {
    padding: 20,
    paddingTop: 0,
  },
  finalApprovalContent: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  finalApprovalTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  finalApprovalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 4,
  },
  finalApprovalMessage: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
  },
  pmNoticeContainer: {
    padding: 20,
    paddingTop: 0,
  },
  pmNoticeContent: {
    backgroundColor: '#e3f2fd',
    borderColor: '#90caf9',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pmNoticeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  pmNoticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d47a1',
    marginBottom: 4,
  },
  pmNoticeMessage: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
});

export default RequestDetailsScreen;
