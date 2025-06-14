import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useTrainingRequestsStore, getStatusDisplayName, getStatusColor, canCreateRequest, parseUserSpecializations } from '../../store/trainingRequestsStore';
import { useAuthStore } from '../../store/authStore';
import { TrainingRequest, TrainingStatus } from '../../types';
import { supabase } from '../../config/supabase';
import NotificationBell from '../../components/notifications/NotificationBell';
import RoleDashboard from '../../components/dashboard/RoleDashboard';
import { RequestsStackParamList } from '../../navigation/RequestsNavigator';
import { isRTL, getTextAlign } from '../../i18n';

type RequestsListNavigationProp = StackNavigationProp<RequestsStackParamList, 'RequestsList'>;

const RequestsListScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<RequestsListNavigationProp>();
  const { user } = useAuthStore();
  const {
    requests,
    isLoading,
    error,
    fetchRequests,
    subscribeToRequests,
    clearError,
  } = useTrainingRequestsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrainingStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TrainingRequest[]>([]);
  const [requestersMap, setRequestersMap] = useState<Record<string, string>>({});

  const isRtl = isRTL(i18n.language);

  // Subscribe to real-time updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeToRequests();
      return unsubscribe;
    }, [subscribeToRequests])
  );

  // Load requests when component mounts
  useEffect(() => {
    loadRequests();
  }, []);

  // Filter requests based on search and status
  useEffect(() => {
    let filtered = requests;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.province.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchQuery, statusFilter]);

  // Fetch requesters names when requests change
  useEffect(() => {
    if (requests.length > 0) {
      fetchRequestersNames(requests);
    }
  }, [requests]);

  const loadRequests = async () => {
    try {
      // Pass user role and specializations for filtering
      const userSpecializations = parseUserSpecializations(user?.specialization);

      const filters = user ? {
        userRole: user.role,
        userSpecializations,
        userId: user.id
      } : undefined;

      await fetchRequests(filters);
    } catch (error) {
      console.error('Error loading requests:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('training.errorLoadingRequests'),
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const navigateToCreateRequest = () => {
    if (!user || !canCreateRequest(user.role)) {
      Alert.alert(
        t('common.accessDenied'),
        t('training.cannotCreateRequest')
      );
      return;
    }
    navigation.navigate('CreateRequest');
  };

  const navigateToRequestDetails = (requestId: string) => {
    navigation.navigate('RequestDetails', { requestId });
  };

  const fetchRequestersNames = async (requests: TrainingRequest[]) => {
    try {
      const requesterIds = [...new Set(requests.map(req => req.requester_id))];

      if (requesterIds.length === 0) return;

      const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', requesterIds);

      if (error) {
        console.error('Error fetching requesters:', error);
        return;
      }

      const newRequestersMap: Record<string, string> = {};
      users?.forEach(user => {
        newRequestersMap[user.id] = user.full_name;
      });

      setRequestersMap(newRequestersMap);
    } catch (error) {
      console.error('Error fetching requesters names:', error);
    }
  };

  const getRequesterName = (request: TrainingRequest): string => {
    // Try to get name from nested requester object first
    if (request.requester?.full_name) {
      return request.requester.full_name;
    }

    // Try to get name from requestersMap
    if (requestersMap[request.requester_id]) {
      return requestersMap[request.requester_id];
    }

    // Fallback to unknown
    return t('common.unknown');
  };



  const renderRequestItem = ({ item }: { item: TrainingRequest }) => (
    <TouchableOpacity
      style={[styles.requestItem, isRtl && styles.requestItemRtl]}
      onPress={() => navigateToRequestDetails(item.id)}
    >
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.statusText}>
          {getStatusDisplayName(item.status, i18n.language)}
        </Text>
      </View>

      {/* Request Content */}
      <View style={styles.requestContent}>
        <Text style={[styles.requestTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {item.title}
        </Text>

        <Text style={[styles.requestDescription, { textAlign: getTextAlign(i18n.language) }]} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Request Details */}
        <View style={[styles.requestDetails, isRtl && styles.requestDetailsRtl]}>
          <View style={[styles.detailItem, isRtl && styles.detailItemRtl]}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.detailText}>{item.province}</Text>
          </View>

          <View style={[styles.detailItem, isRtl && styles.detailItemRtl]}>
            <Ionicons name="school-outline" size={14} color="#666" />
            <Text style={styles.detailText}>{item.specialization}</Text>
          </View>

          <View style={[styles.detailItem, isRtl && styles.detailItemRtl]}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.detailText}>{item.duration_hours}h</Text>
          </View>
        </View>

        {/* Request Meta */}
        <View style={[styles.requestMeta, isRtl && styles.requestMetaRtl]}>
          <Text style={[styles.metaText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('training.requestedBy')}: {getRequesterName(item)}
          </Text>
          <Text style={[styles.metaDate, { textAlign: getTextAlign(i18n.language) }]}>
            {new Date(item.requested_date).toLocaleDateString(
              isRtl ? 'ar-SA' : 'en-US',
              {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }
            )}
          </Text>
        </View>
      </View>

      {/* Arrow Icon */}
      <Ionicons
        name={isRtl ? "chevron-back-outline" : "chevron-forward-outline"}
        size={20}
        color="#ccc"
      />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={[styles.emptyStateTitle, { textAlign: getTextAlign(i18n.language) }]}>
        {t('training.noRequests')}
      </Text>
      <Text style={[styles.emptyStateSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
        {user && canCreateRequest(user.role)
          ? t('training.createFirstRequest')
          : t('training.noRequestsAvailable')
        }
      </Text>
      {user && canCreateRequest(user.role) && (
        <TouchableOpacity style={styles.createButton} onPress={navigateToCreateRequest}>
          <Ionicons name="add-outline" size={20} color="#ffffff" />
          <Text style={styles.createButtonText}>{t('training.newRequest')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('common.filters')}
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { textAlign: getTextAlign(i18n.language) }]}>
              {t('training.status')}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
                style={styles.picker}
              >
                <Picker.Item label={t('common.all')} value="all" />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.UNDER_REVIEW, i18n.language)} value={TrainingStatus.UNDER_REVIEW} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.CC_APPROVED, i18n.language)} value={TrainingStatus.CC_APPROVED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.PM_APPROVED, i18n.language)} value={TrainingStatus.PM_APPROVED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.TR_ASSIGNED, i18n.language)} value={TrainingStatus.TR_ASSIGNED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.SV_APPROVED, i18n.language)} value={TrainingStatus.SV_APPROVED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.FINAL_APPROVED, i18n.language)} value={TrainingStatus.FINAL_APPROVED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.SCHEDULED, i18n.language)} value={TrainingStatus.SCHEDULED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.COMPLETED, i18n.language)} value={TrainingStatus.COMPLETED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.REJECTED, i18n.language)} value={TrainingStatus.REJECTED} />
                <Picker.Item label={getStatusDisplayName(TrainingStatus.CANCELLED, i18n.language)} value={TrainingStatus.CANCELLED} />
              </Picker>
            </View>
          </View>

          {/* Apply Filters Button */}
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyFiltersText}>{t('common.apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );



  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          {t('training.requests')}
        </Text>
        <View style={[styles.headerActions, isRtl && styles.headerActionsRtl]}>
          <NotificationBell size={20} color="#667eea" />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="filter-outline" size={20} color="#667eea" />
          </TouchableOpacity>
          {user && canCreateRequest(user.role) && (
            <TouchableOpacity style={styles.addButton} onPress={navigateToCreateRequest}>
              <Ionicons name="add-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color="#666"
          style={[styles.searchIcon, isRtl && styles.searchIconRtl]}
        />
        <TextInput
          style={[
            styles.searchInput,
            { textAlign: getTextAlign(i18n.language) },
            isRtl && styles.searchInputRtl,
          ]}
          placeholder={t('training.searchRequests')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign: getTextAlign(i18n.language) }]}>
            {error}
          </Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      )}

      {/* Single Scroll View with Dashboard + Requests */}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <View style={styles.dashboardWrapper}>
            <RoleDashboard />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateWrapper}>
            {renderEmptyState()}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.singleScrollContainer}
      />

      {/* Filters Modal */}
      {renderFiltersModal()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionsRtl: {
    flexDirection: 'row-reverse',
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchIconRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#333',
  },
  searchInputRtl: {
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8d7da',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    flex: 1,
    color: '#721c24',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 0,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  requestItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
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
  requestItemRtl: {
    flexDirection: 'row-reverse',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  requestDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  requestDetailsRtl: {
    flexDirection: 'row-reverse',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailItemRtl: {
    flexDirection: 'row-reverse',
    marginRight: 0,
    marginLeft: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestMetaRtl: {
    flexDirection: 'row-reverse',
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  metaDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  picker: {
    height: 50,
  },
  applyFiltersButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  applyFiltersText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Single Scroll Layout Styles
  singleScrollContainer: {
    paddingBottom: 20,
  },
  dashboardWrapper: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
});

export default RequestsListScreen;
