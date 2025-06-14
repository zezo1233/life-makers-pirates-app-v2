import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';

import { aiTrainerMatching } from '../../services/aiTrainerMatching';
import { isRTL, getTextAlign } from '../../i18n';
import useResponsiveScreen from '../../hooks/useResponsiveScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TrainerScore {
  trainerId: string;
  trainer: any;
  score: number;
  factors: {
    locationMatch: number;
    specializationMatch: number;
    availabilityMatch: number;
    ratingScore: number;
    experienceScore: number;
    workloadScore: number;
  };
  reasoning: string[];
}

interface TrainerRecommendationsProps {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  onTrainerSelect?: (trainerId: string) => void;
}

const TrainerRecommendations: React.FC<TrainerRecommendationsProps> = ({
  visible,
  onClose,
  requestId,
  onTrainerSelect,
}) => {
  const { t, i18n } = useTranslation();
  const { responsiveStyles, scale, isTablet, dimensions } = useResponsiveScreen();
  const [recommendations, setRecommendations] = useState<TrainerScore[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (visible && requestId) {
      loadRecommendations();
    }
  }, [visible, requestId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const result = await aiTrainerMatching.getTrainerRecommendations(requestId);
      setRecommendations(result.recommendations);
      setSummary(result.summary);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrainerSelect = (trainerId: string) => {
    setSelectedTrainer(trainerId);
    onTrainerSelect?.(trainerId);
    Toast.show({
      type: 'success',
      text1: t('ai.trainerSelected'),
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return '#28a745';
    if (score >= 0.6) return '#ffc107';
    if (score >= 0.4) return '#fd7e14';
    return '#dc3545';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return t('ai.excellentMatch');
    if (score >= 0.6) return t('ai.goodMatch');
    if (score >= 0.4) return t('ai.fairMatch');
    return t('ai.poorMatch');
  };

  const renderFactorBar = (label: string, value: number, color: string) => (
    <View style={styles.factorContainer}>
      <Text style={[styles.factorLabel, { textAlign: getTextAlign(i18n.language) }]}>
        {label}
      </Text>
      <View style={styles.factorBarContainer}>
        <View style={[styles.factorBar, { width: `${value * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.factorValue}>{Math.round(value * 100)}%</Text>
    </View>
  );

  const renderTrainerCard = (recommendation: TrainerScore, index: number) => {
    const scoreColor = getScoreColor(recommendation.score);
    const isSelected = selectedTrainer === recommendation.trainerId;

    return (
      <TouchableOpacity
        key={recommendation.trainerId}
        style={[
          styles.trainerCard,
          {
            borderRadius: scale.width(16),
            marginBottom: scale.height(16),
            padding: responsiveStyles.padding.horizontal,
          },
          isSelected && styles.selectedCard,
          isRtl && styles.trainerCardRtl
        ]}
        onPress={() => handleTrainerSelect(recommendation.trainerId)}
        activeOpacity={0.8}
      >
        {/* Rank Badge */}
        <View style={[
          styles.rankBadge,
          {
            backgroundColor: scoreColor,
            width: scale.width(32),
            height: scale.width(32),
            borderRadius: scale.width(16),
            top: scale.height(-8),
            right: scale.width(16),
          }
        ]}>
          <Text style={[styles.rankText, { fontSize: scale.font(12) }]}>#{index + 1}</Text>
        </View>

        {/* Trainer Info */}
        <View style={[styles.trainerInfo, isRtl && styles.trainerInfoRtl]}>
          <View style={[styles.trainerHeader, { marginBottom: scale.height(8) }]}>
            <Text style={[
              styles.trainerName,
              {
                textAlign: getTextAlign(i18n.language),
                fontSize: scale.font(18),
              }
            ]}>
              {recommendation.trainer.full_name}
            </Text>
            <View style={[
              styles.scoreContainer,
              {
                backgroundColor: scoreColor,
                paddingHorizontal: scale.width(12),
                paddingVertical: scale.height(6),
                borderRadius: scale.width(20),
              }
            ]}>
              <Text style={[styles.scoreText, { fontSize: scale.font(14) }]}>
                {Math.round(recommendation.score * 100)}%
              </Text>
            </View>
          </View>

          <Text style={[
            styles.trainerSpecialization,
            {
              textAlign: getTextAlign(i18n.language),
              fontSize: scale.font(14),
              marginBottom: scale.height(4),
            }
          ]}>
            {t(`specializations.${recommendation.trainer.specialization}`)}
          </Text>

          <Text style={[
            styles.trainerLocation,
            {
              textAlign: getTextAlign(i18n.language),
              fontSize: scale.font(14),
              marginBottom: scale.height(8),
            }
          ]}>
            📍 {t(`provinces.${recommendation.trainer.province}`)}
          </Text>

          {/* Rating */}
          <View style={[styles.ratingContainer, isRtl && styles.ratingContainerRtl]}>
            <Ionicons name="star" size={16} color="#ffc107" />
            <Text style={styles.ratingText}>
              {recommendation.trainer.rating || 0}/5
            </Text>
            <Text style={styles.experienceText}>
              • {recommendation.trainer.total_training_hours || 0}h
            </Text>
          </View>

          {/* Match Factors */}
          <View style={styles.factorsContainer}>
            {renderFactorBar(
              t('ai.location'),
              recommendation.factors.locationMatch,
              '#667eea'
            )}
            {renderFactorBar(
              t('ai.specialization'),
              recommendation.factors.specializationMatch,
              '#28a745'
            )}
            {renderFactorBar(
              t('ai.availability'),
              recommendation.factors.availabilityMatch,
              '#17a2b8'
            )}
          </View>

          {/* Reasoning */}
          <View style={styles.reasoningContainer}>
            <Text style={[styles.reasoningTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('ai.whyRecommended')}:
            </Text>
            {recommendation.reasoning.map((reason, idx) => (
              <Text key={idx} style={[styles.reasoningItem, { textAlign: getTextAlign(i18n.language) }]}>
                {reason}
              </Text>
            ))}
          </View>
        </View>

        {/* Selection Indicator */}
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {
          width: isTablet ? '80%' : '95%',
          maxWidth: isTablet ? 800 : undefined,
          maxHeight: '90%',
          alignSelf: 'center',
        }]}>
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={[styles.header, {
              paddingHorizontal: responsiveStyles.padding.horizontal,
              paddingVertical: scale.height(20),
              borderTopLeftRadius: scale.width(16),
              borderTopRightRadius: scale.width(16),
            }]}
          >
            <View style={[styles.headerContent, isRtl && styles.headerContentRtl]}>
              <View style={styles.headerLeft}>
                <Ionicons name="sparkles" size={scale.width(24)} color="#ffffff" />
                <Text style={[
                  styles.headerTitle,
                  {
                    textAlign: getTextAlign(i18n.language),
                    fontSize: scale.font(20),
                    marginLeft: isRtl ? 0 : scale.width(12),
                    marginRight: isRtl ? scale.width(12) : 0,
                  }
                ]}>
                  {t('ai.trainerRecommendations')}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={scale.width(24)} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={[styles.content, {
              paddingHorizontal: responsiveStyles.padding.horizontal,
              backgroundColor: '#ffffff',
            }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingVertical: scale.height(16),
            }}
          >
            {loading ? (
              <View style={[styles.loadingContainer, {
                minHeight: scale.height(200),
                justifyContent: 'center',
                alignItems: 'center',
              }]}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={[styles.loadingText, {
                  fontSize: scale.font(16),
                  marginTop: scale.height(16),
                }]}>{t('ai.analyzingTrainers')}</Text>
              </View>
            ) : (
              <>
                {/* Summary */}
                {summary && (
                  <View style={[styles.summaryContainer, {
                    borderRadius: scale.width(12),
                    padding: responsiveStyles.padding.horizontal,
                    marginBottom: scale.height(16),
                  }]}>
                    <Text style={[
                      styles.summaryText,
                      {
                        textAlign: getTextAlign(i18n.language),
                        fontSize: scale.font(14),
                        lineHeight: scale.height(20),
                      }
                    ]}>
                      {summary}
                    </Text>
                  </View>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 ? (
                  <View style={{ flex: 1 }}>
                    {recommendations.map(renderTrainerCard)}
                  </View>
                ) : !loading ? (
                  <View style={[styles.emptyContainer, {
                    minHeight: scale.height(200),
                    justifyContent: 'center',
                    alignItems: 'center',
                  }]}>
                    <Ionicons name="search-outline" size={scale.width(60)} color="#ccc" />
                    <Text style={[
                      styles.emptyText,
                      {
                        textAlign: getTextAlign(i18n.language),
                        fontSize: scale.font(16),
                        marginTop: scale.height(16),
                      }
                    ]}>
                      {t('ai.noRecommendations')}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, {
            paddingHorizontal: responsiveStyles.padding.horizontal,
            paddingVertical: scale.height(16),
            backgroundColor: '#ffffff',
            borderBottomLeftRadius: scale.width(16),
            borderBottomRightRadius: scale.width(16),
          }]}>
            <TouchableOpacity
              style={[styles.refreshButton, {
                paddingHorizontal: responsiveStyles.button.paddingHorizontal,
                paddingVertical: scale.height(12),
                borderRadius: scale.width(8),
              }]}
              onPress={loadRecommendations}
            >
              <Ionicons name="refresh-outline" size={scale.width(20)} color="#667eea" />
              <Text style={[styles.refreshButtonText, {
                fontSize: scale.font(14),
                marginLeft: isRtl ? 0 : scale.width(8),
                marginRight: isRtl ? scale.width(8) : 0,
              }]}>{t('ai.refreshRecommendations')}</Text>
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
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    // Dynamic styling handled in component
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContentRtl: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.6, // Limit content height
    minHeight: 200, // Minimum height
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  summaryText: {
    color: '#333',
  },
  trainerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#28a745',
  },
  trainerCardRtl: {
    // RTL specific styles if needed
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trainerInfo: {
    padding: 16,
  },
  trainerInfoRtl: {
    // RTL specific styles if needed
  },
  trainerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trainerSpecialization: {
    fontSize: 14,
    color: '#667eea',
    marginBottom: 4,
  },
  trainerLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainerRtl: {
    flexDirection: 'row-reverse',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  experienceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  factorsContainer: {
    marginBottom: 12,
  },
  factorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  factorLabel: {
    fontSize: 12,
    color: '#666',
    width: 80,
  },
  factorBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  factorBar: {
    height: '100%',
    borderRadius: 3,
  },
  factorValue: {
    fontSize: 12,
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  reasoningContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  reasoningItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  refreshButtonText: {
    color: '#667eea',
    fontWeight: '600',
  },
});

export default TrainerRecommendations;
