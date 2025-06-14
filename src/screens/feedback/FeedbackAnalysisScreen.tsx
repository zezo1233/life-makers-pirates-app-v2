import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { aiChatService } from '../../services/aiChatService';
import { isRTL, getTextAlign } from '../../i18n';
import { UserRole } from '../../types';
import { supabase, TABLES } from '../../config/supabase';

interface FeedbackAnalysis {
  originalText: string;
  suggestedRating: number;
  confidence: number;
  reasoning: string;
  keywords: string[];
}

const FeedbackAnalysisScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [feedbackText, setFeedbackText] = useState('');
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [finalRating, setFinalRating] = useState<number>(0);
  const isRtl = isRTL(i18n.language);

  const hasAccess = (): boolean => {
    return user?.role === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER;
  };

  const analyzeFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال نص الفيدباك أولاً');
      return;
    }

    try {
      setIsAnalyzing(true);
      const result = await aiChatService.analyzeFeedback(feedbackText.trim());
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      Alert.alert('خطأ', 'فشل في تحليل الفيدباك');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderStars = (rating: number, size: number = 24, color: string = '#ffc107') => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={i <= rating ? color : '#ddd'}
          style={{ marginHorizontal: 2 }}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderEditableStars = (rating: number, onRatingChange: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onRatingChange(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={i <= rating ? '#ffc107' : '#ddd'}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.editableStarsContainer}>{stars}</View>;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#28a745';
    if (confidence >= 60) return '#ffc107';
    return '#dc3545';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 80) return 'عالية';
    if (confidence >= 60) return 'متوسطة';
    return 'منخفضة';
  };

  const applyRating = async () => {
    if (!selectedTrainerId || finalRating === 0) {
      Alert.alert('خطأ', 'يرجى تحديد المدرب والتقييم');
      return;
    }

    try {
      // Update trainer rating in database
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ rating: finalRating })
        .eq('id', selectedTrainerId);

      if (error) {
        throw error;
      }

      // Save feedback analysis record
      await supabase
        .from('feedback_analysis')
        .insert([{
          trainer_id: selectedTrainerId,
          original_feedback: analysis?.originalText,
          ai_suggested_rating: analysis?.suggestedRating,
          final_rating: finalRating,
          confidence: analysis?.confidence,
          reasoning: analysis?.reasoning,
          keywords: analysis?.keywords,
          analyzed_by: user?.id,
          created_at: new Date().toISOString()
        }]);

      Alert.alert(
        'تم بنجاح',
        `تم تحديث تقييم المدرب إلى ${finalRating} نجوم`,
        [{ text: 'حسناً', onPress: () => resetForm() }]
      );

      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error applying rating:', error);
      Alert.alert('خطأ', 'فشل في تطبيق التقييم');
    }
  };

  const resetForm = () => {
    setFeedbackText('');
    setAnalysis(null);
    setSelectedTrainerId('');
    setFinalRating(0);
  };

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              تأكيد التقييم
            </Text>
            <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
              <Ionicons name="close-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.confirmContent}>
            <Text style={[styles.confirmText, { textAlign: getTextAlign(i18n.language) }]}>
              هل أنت متأكد من تطبيق التقييم التالي؟
            </Text>

            <View style={styles.ratingPreview}>
              <Text style={[styles.ratingLabel, { textAlign: getTextAlign(i18n.language) }]}>
                التقييم النهائي:
              </Text>
              {renderStars(finalRating, 28)}
              <Text style={styles.ratingNumber}>{finalRating}/5</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={applyRating}
              >
                <Text style={styles.confirmButtonText}>تأكيد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!hasAccess()) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
        <Text style={[styles.accessDeniedText, { textAlign: getTextAlign(i18n.language) }]}>
          هذه الخدمة متاحة فقط لمسؤول المشروع
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          تحليل الفيدباك بالذكاء الاصطناعي
        </Text>
        <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
          تحويل الفيدباك النصي إلى تقييم بالنجوم
        </Text>
      </View>

      {/* Feedback Input */}
      <View style={styles.inputSection}>
        <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
          📝 نص الفيدباك
        </Text>
        <TextInput
          style={[
            styles.feedbackInput,
            { textAlign: getTextAlign(i18n.language) },
            isRtl && styles.feedbackInputRtl
          ]}
          placeholder="أدخل نص الفيدباك هنا..."
          placeholderTextColor="#999"
          value={feedbackText}
          onChangeText={setFeedbackText}
          multiline
          numberOfLines={6}
          maxLength={1000}
        />
        
        <View style={styles.inputActions}>
          <Text style={styles.charCount}>
            {feedbackText.length}/1000
          </Text>
          
          <TouchableOpacity
            style={[styles.analyzeButton, (!feedbackText.trim() || isAnalyzing) && styles.analyzeButtonDisabled]}
            onPress={analyzeFeedback}
            disabled={!feedbackText.trim() || isAnalyzing}
          >
            <Ionicons name="analytics-outline" size={20} color="#ffffff" />
            <Text style={styles.analyzeButtonText}>
              {isAnalyzing ? 'جاري التحليل...' : 'تحليل الفيدباك'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analysis Results */}
      {analysis && (
        <View style={styles.resultsSection}>
          <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
            🤖 نتائج التحليل
          </Text>

          {/* AI Suggested Rating */}
          <View style={styles.resultCard}>
            <Text style={[styles.resultLabel, { textAlign: getTextAlign(i18n.language) }]}>
              التقييم المقترح:
            </Text>
            <View style={styles.ratingRow}>
              {renderStars(analysis.suggestedRating)}
              <Text style={styles.ratingText}>{analysis.suggestedRating}/5</Text>
            </View>
          </View>

          {/* Confidence Level */}
          <View style={styles.resultCard}>
            <Text style={[styles.resultLabel, { textAlign: getTextAlign(i18n.language) }]}>
              مستوى الثقة:
            </Text>
            <View style={styles.confidenceRow}>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(analysis.confidence) }
              ]}>
                <Text style={styles.confidenceText}>
                  {analysis.confidence}% - {getConfidenceText(analysis.confidence)}
                </Text>
              </View>
            </View>
          </View>

          {/* AI Reasoning */}
          <View style={styles.resultCard}>
            <Text style={[styles.resultLabel, { textAlign: getTextAlign(i18n.language) }]}>
              تفسير الذكاء الاصطناعي:
            </Text>
            <Text style={[styles.reasoningText, { textAlign: getTextAlign(i18n.language) }]}>
              {analysis.reasoning}
            </Text>
          </View>

          {/* Keywords */}
          {analysis.keywords.length > 0 && (
            <View style={styles.resultCard}>
              <Text style={[styles.resultLabel, { textAlign: getTextAlign(i18n.language) }]}>
                الكلمات المفتاحية:
              </Text>
              <View style={styles.keywordsContainer}>
                {analysis.keywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordTag}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Manual Rating Adjustment */}
          <View style={styles.adjustmentSection}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign(i18n.language) }]}>
              ⭐ تعديل التقييم (اختياري)
            </Text>
            <Text style={[styles.adjustmentNote, { textAlign: getTextAlign(i18n.language) }]}>
              يمكنك تعديل التقييم المقترح إذا كان هناك سوء فهم من الذكاء الاصطناعي
            </Text>
            
            {renderEditableStars(finalRating || analysis.suggestedRating, setFinalRating)}
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                if (!finalRating) setFinalRating(analysis.suggestedRating);
                setShowConfirmModal(true);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.applyButtonText}>تطبيق التقييم</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Confirm Modal */}
      {renderConfirmModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  inputSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
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
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 12,
  },
  feedbackInputRtl: {
    textAlign: 'right',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsSection: {
    margin: 16,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  confidenceRow: {
    flexDirection: 'row',
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasoningText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: '#e8f2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  adjustmentSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adjustmentNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  editableStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmContent: {
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FeedbackAnalysisScreen;
