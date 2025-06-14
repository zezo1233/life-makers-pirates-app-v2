import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { TrainingRequest, TrainingStatus, UserRole } from '../../types';
import { useTrainingRequestsStore } from '../../store/trainingRequestsStore';
import { useAuthStore } from '../../store/authStore';
import { isRTL, getTextAlign } from '../../i18n';
import Toast from 'react-native-toast-message';

interface QuickActionsProps {
  request: TrainingRequest;
  onActionComplete?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ request, onActionComplete }) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { updateRequest, isLoading } = useTrainingRequestsStore();
  const isRtl = isRTL(i18n.language);

  const getQuickActions = () => {
    if (!user) return [];

    const actions = [];

    // CC Quick Actions
    if (user.role === UserRole.DEVELOPMENT_MANAGEMENT_OFFICER && request.status === TrainingStatus.UNDER_REVIEW) {
      actions.push({
        id: 'quick_approve',
        title: t('quickActions.quickApprove'),
        icon: 'checkmark-circle-outline',
        color: '#28a745',
        action: () => handleQuickApprove()
      });
      
      actions.push({
        id: 'request_info',
        title: t('quickActions.requestInfo'),
        icon: 'help-circle-outline',
        color: '#17a2b8',
        action: () => handleRequestInfo()
      });
    }

    // PM Quick Actions
    if (user.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER) {
      if (request.status === TrainingStatus.CC_APPROVED) {
        actions.push({
          id: 'quick_approve',
          title: t('quickActions.quickApprove'),
          icon: 'shield-checkmark-outline',
          color: '#28a745',
          action: () => handleQuickApprove()
        });
      }
      
      if (request.status === TrainingStatus.SV_APPROVED) {
        actions.push({
          id: 'final_approve',
          title: t('quickActions.finalApprove'),
          icon: 'ribbon-outline',
          color: '#007bff',
          action: () => handleFinalApprove()
        });
      }
    }

    // SV Quick Actions
    if (user.role === UserRole.PROGRAM_SUPERVISOR) {
      if (request.status === TrainingStatus.PM_APPROVED && !request.assigned_trainer_id) {
        actions.push({
          id: 'ai_select',
          title: t('quickActions.aiSelect'),
          icon: 'bulb-outline',
          color: '#ff6b35',
          action: () => handleAISelect()
        });
      }
      
      if (request.status === TrainingStatus.TR_ASSIGNED) {
        actions.push({
          id: 'quick_approve',
          title: t('quickActions.quickApprove'),
          icon: 'thumbs-up-outline',
          color: '#28a745',
          action: () => handleQuickApprove()
        });
      }
    }

    // DV Quick Actions
    if (user.role === UserRole.PROVINCIAL_DEVELOPMENT_OFFICER && request.requester_id === user.id) {
      if (request.status === TrainingStatus.FINAL_APPROVED) {
        actions.push({
          id: 'receive_schedule',
          title: t('quickActions.receiveSchedule'),
          icon: 'calendar-outline',
          color: '#6f42c1',
          action: () => handleReceiveAndSchedule()
        });
      }
      
      if (request.status === TrainingStatus.SCHEDULED) {
        actions.push({
          id: 'complete_training',
          title: t('quickActions.completeTraining'),
          icon: 'trophy-outline',
          color: '#28a745',
          action: () => handleCompleteTraining()
        });
        
        actions.push({
          id: 'cancel_training',
          title: t('quickActions.cancelTraining'),
          icon: 'close-circle-outline',
          color: '#dc3545',
          action: () => handleCancelTraining()
        });
      }
    }

    // TR Quick Actions
    if (user.role === UserRole.TRAINER) {
      if (request.status === TrainingStatus.PM_APPROVED && !request.assigned_trainer_id) {
        actions.push({
          id: 'apply_now',
          title: t('quickActions.applyNow'),
          icon: 'hand-right-outline',
          color: '#007bff',
          action: () => handleApplyNow()
        });
      }
      
      if (request.status === TrainingStatus.SCHEDULED && request.assigned_trainer_id === user.id) {
        actions.push({
          id: 'complete_training',
          title: t('quickActions.completeTraining'),
          icon: 'trophy-outline',
          color: '#28a745',
          action: () => handleCompleteTraining()
        });
      }
    }

    return actions;
  };

  const handleQuickApprove = async () => {
    try {
      const nextStatus = getNextApprovalStatus(request.status);
      await updateRequest(request.id, { status: nextStatus });
      
      Toast.show({
        type: 'success',
        text1: t('quickActions.approved'),
      });
      
      onActionComplete?.();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.approvalFailed'),
      });
    }
  };

  const handleRequestInfo = () => {
    Alert.alert(
      t('quickActions.requestInfo'),
      t('quickActions.requestInfoMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.send'), onPress: () => {
          Toast.show({
            type: 'info',
            text1: t('quickActions.infoRequested'),
          });
        }}
      ]
    );
  };

  const handleFinalApprove = async () => {
    try {
      await updateRequest(request.id, { status: TrainingStatus.FINAL_APPROVED });
      
      Toast.show({
        type: 'success',
        text1: t('quickActions.finalApproved'),
      });
      
      onActionComplete?.();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.approvalFailed'),
      });
    }
  };

  const handleAISelect = () => {
    // Navigate to AI trainer selection
    Toast.show({
      type: 'info',
      text1: t('quickActions.aiSelectStarted'),
    });
  };

  const handleReceiveAndSchedule = async () => {
    try {
      await updateRequest(request.id, { status: TrainingStatus.SCHEDULED });
      
      Toast.show({
        type: 'success',
        text1: t('quickActions.receivedAndScheduled'),
      });
      
      onActionComplete?.();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
      });
    }
  };

  const handleCompleteTraining = async () => {
    Alert.alert(
      t('quickActions.completeTraining'),
      t('quickActions.completeTrainingConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.complete'), onPress: async () => {
          try {
            await updateRequest(request.id, { status: TrainingStatus.COMPLETED });
            
            Toast.show({
              type: 'success',
              text1: t('quickActions.trainingCompleted'),
            });
            
            onActionComplete?.();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: t('errors.updateFailed'),
            });
          }
        }}
      ]
    );
  };

  const handleCancelTraining = async () => {
    Alert.alert(
      t('quickActions.cancelTraining'),
      t('quickActions.cancelTrainingConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: async () => {
          try {
            await updateRequest(request.id, { status: TrainingStatus.CANCELLED });
            
            Toast.show({
              type: 'success',
              text1: t('quickActions.trainingCancelled'),
            });
            
            onActionComplete?.();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: t('errors.updateFailed'),
            });
          }
        }}
      ]
    );
  };

  const handleApplyNow = () => {
    // Navigate to application form or handle application
    Toast.show({
      type: 'info',
      text1: t('quickActions.applicationStarted'),
    });
  };

  const getNextApprovalStatus = (currentStatus: TrainingStatus): TrainingStatus => {
    switch (currentStatus) {
      case TrainingStatus.UNDER_REVIEW:
        return TrainingStatus.CC_APPROVED;
      case TrainingStatus.CC_APPROVED:
        return TrainingStatus.PM_APPROVED;
      case TrainingStatus.TR_ASSIGNED:
        return TrainingStatus.SV_APPROVED;
      default:
        return currentStatus;
    }
  };

  const actions = getQuickActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
        {t('quickActions.title')}
      </Text>
      
      <View style={[styles.actionsContainer, isRtl && styles.actionsContainerRtl]}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.actionButton, { borderColor: action.color }]}
            onPress={action.action}
            disabled={isLoading}
          >
            <Ionicons name={action.icon} size={24} color={action.color} />
            <Text style={[
              styles.actionText,
              { color: action.color, textAlign: getTextAlign(i18n.language) }
            ]}>
              {action.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionsContainerRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    minWidth: '45%',
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default QuickActions;
