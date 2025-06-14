import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { TrainingStatus, UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface ProgressStep {
  step: number;
  name: string;
  role: UserRole;
  status: 'completed' | 'current' | 'pending' | 'skipped';
  icon: string;
  description?: string;
}

interface ProgressTrackerProps {
  currentStatus: TrainingStatus;
  className?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStatus, className }) => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);

  const getProgressSteps = (status: TrainingStatus): ProgressStep[] => {
    const allSteps: ProgressStep[] = [
      {
        step: 1,
        name: t('workflow.steps.created'),
        role: UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
        status: 'completed',
        icon: 'create-outline',
        description: t('workflow.descriptions.created')
      },
      {
        step: 2,
        name: t('workflow.steps.under_review'),
        role: UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
        status: 'pending',
        icon: 'eye-outline',
        description: t('workflow.descriptions.under_review')
      },
      {
        step: 3,
        name: t('workflow.steps.cc_approved'),
        role: UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
        status: 'pending',
        icon: 'checkmark-circle-outline',
        description: t('workflow.descriptions.cc_approved')
      },
      {
        step: 4,
        name: t('workflow.steps.pm_approved'),
        role: UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
        status: 'pending',
        icon: 'shield-checkmark-outline',
        description: t('workflow.descriptions.pm_approved')
      },
      {
        step: 5,
        name: t('workflow.steps.trainer_selection'),
        role: UserRole.PROGRAM_SUPERVISOR,
        status: 'pending',
        icon: 'people-outline',
        description: t('workflow.descriptions.trainer_selection')
      },
      {
        step: 6,
        name: t('workflow.steps.sv_approved'),
        role: UserRole.PROGRAM_SUPERVISOR,
        status: 'pending',
        icon: 'thumbs-up-outline',
        description: t('workflow.descriptions.sv_approved')
      },
      {
        step: 7,
        name: t('workflow.steps.final_approved'),
        role: UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
        status: 'pending',
        icon: 'ribbon-outline',
        description: t('workflow.descriptions.final_approved')
      },
      {
        step: 8,
        name: t('workflow.steps.scheduled'),
        role: UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
        status: 'pending',
        icon: 'calendar-outline',
        description: t('workflow.descriptions.scheduled')
      },
      {
        step: 9,
        name: t('workflow.steps.completed'),
        role: UserRole.TRAINER,
        status: 'pending',
        icon: 'trophy-outline',
        description: t('workflow.descriptions.completed')
      }
    ];

    // Update status based on current workflow status
    const statusMap: Record<TrainingStatus, number> = {
      [TrainingStatus.UNDER_REVIEW]: 2,
      [TrainingStatus.CC_APPROVED]: 3,
      [TrainingStatus.PM_APPROVED]: 4,
      [TrainingStatus.TR_ASSIGNED]: 5,
      [TrainingStatus.SV_APPROVED]: 6,
      [TrainingStatus.FINAL_APPROVED]: 7,
      [TrainingStatus.SCHEDULED]: 8,
      [TrainingStatus.COMPLETED]: 9,
      [TrainingStatus.CANCELLED]: 8, // Show as scheduled but mark as cancelled
      [TrainingStatus.REJECTED]: 2 // Show rejection at review stage
    };

    const currentStep = statusMap[status] || 1;

    return allSteps.map((step, index) => {
      if (index + 1 < currentStep) {
        return { ...step, status: 'completed' as const };
      } else if (index + 1 === currentStep) {
        if (status === TrainingStatus.REJECTED) {
          return { ...step, status: 'skipped' as const };
        } else if (status === TrainingStatus.CANCELLED && index + 1 === 8) {
          return { ...step, status: 'skipped' as const };
        }
        return { ...step, status: 'current' as const };
      } else {
        return { ...step, status: 'pending' as const };
      }
    });
  };

  const steps = getProgressSteps(currentStatus);

  const getStepColor = (status: ProgressStep['status']): string => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'current':
        return '#007bff';
      case 'pending':
        return '#6c757d';
      case 'skipped':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStepIcon = (step: ProgressStep): string => {
    if (step.status === 'completed') return 'checkmark-circle';
    if (step.status === 'current') return step.icon;
    if (step.status === 'skipped') return 'close-circle';
    return step.icon;
  };

  return (
    <View style={[styles.container, isRtl && styles.containerRtl]}>
      <Text style={[styles.title, { textAlign: getTextAlign(i18n.language) }]}>
        {t('workflow.progressTitle')}
      </Text>
      
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={step.step} style={styles.stepWrapper}>
            {/* Step Circle */}
            <View style={[
              styles.stepCircle,
              { backgroundColor: getStepColor(step.status) }
            ]}>
              <Ionicons
                name={getStepIcon(step)}
                size={20}
                color="#ffffff"
              />
            </View>

            {/* Step Content */}
            <View style={[styles.stepContent, isRtl && styles.stepContentRtl]}>
              <Text style={[
                styles.stepName,
                { textAlign: getTextAlign(i18n.language) },
                step.status === 'current' && styles.stepNameCurrent
              ]}>
                {step.name}
              </Text>
              
              <Text style={[
                styles.stepRole,
                { textAlign: getTextAlign(i18n.language) }
              ]}>
                {t(`roles.${step.role}`)}
              </Text>

              {step.description && (
                <Text style={[
                  styles.stepDescription,
                  { textAlign: getTextAlign(i18n.language) }
                ]}>
                  {step.description}
                </Text>
              )}
            </View>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <View style={[
                styles.connector,
                { backgroundColor: getStepColor(steps[index + 1].status) }
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Status Summary */}
      <View style={[styles.summary, isRtl && styles.summaryRtl]}>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={16} color="#28a745" />
          <Text style={styles.summaryText}>
            {steps.filter(s => s.status === 'completed').length} {t('workflow.completed')}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Ionicons name="time" size={16} color="#007bff" />
          <Text style={styles.summaryText}>
            {steps.filter(s => s.status === 'pending').length} {t('workflow.remaining')}
          </Text>
        </View>

        {steps.some(s => s.status === 'skipped') && (
          <View style={styles.summaryItem}>
            <Ionicons name="close-circle" size={16} color="#dc3545" />
            <Text style={styles.summaryText}>
              {steps.filter(s => s.status === 'skipped').length} {t('workflow.skipped')}
            </Text>
          </View>
        )}
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
  containerRtl: {
    // RTL specific styles if needed
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepContentRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  stepNameCurrent: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  stepRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  connector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 32,
    opacity: 0.3,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  summaryRtl: {
    flexDirection: 'row-reverse',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default ProgressTracker;
