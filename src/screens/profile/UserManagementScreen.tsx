import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useUserManagementStore, canManageUsers, canCreateUsers, canDeleteUsers, getManageableRoles } from '../../store/userManagementStore';
import { useAuthStore } from '../../store/authStore';
import { User, UserRole } from '../../types';
import { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { isRTL, getTextAlign } from '../../i18n';

type UserManagementNavigationProp = StackNavigationProp<ProfileStackParamList, 'UserManagement'>;

const UserManagementScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<UserManagementNavigationProp>();
  const { user: currentUser } = useAuthStore();
  const {
    users,
    isLoading,
    error,
    fetchUsers,
    updateUserSpecialization,
    updateUserRole,
    activateUser,
    deactivateUser,
    deleteUser,
    clearError,
  } = useUserManagementStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newSpecializations, setNewSpecializations] = useState<string[]>([]);
  const [newRole, setNewRole] = useState<UserRole | ''>('');

  const isRtl = isRTL(i18n.language);

  const specializations = [
    'التواصل الفعال',
    'العرض والتقديم',
    'العقلية',
    'العمل الجماعي'
  ];

  const manageableRoles = getManageableRoles(currentUser?.role || UserRole.TRAINER);

  useEffect(() => {
    // Check permissions
    if (!currentUser || !canManageUsers(currentUser.role)) {
      Alert.alert(
        t('common.accessDenied'),
        t('userManagement.accessDenied'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
      return;
    }

    loadUsers();
  }, [currentUser]);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error,
      });
      clearError();
    }
  }, [error]);

  const loadUsers = async () => {
    try {
      await fetchUsers({
        role: selectedRole || undefined,
        specialization: selectedSpecialization || undefined,
        searchTerm: searchTerm || undefined,
      });
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewSpecializations(user.specialization || []);
    setShowEditModal(true);
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const handleAddUser = () => {
    navigation.navigate('CreateUser' as never);
  };

  const handleUpdateSpecialization = async () => {
    if (!selectedUser) return;

    try {
      await updateUserSpecialization(selectedUser.id, newSpecializations);
      Toast.show({
        type: 'success',
        text1: t('userManagement.specializationUpdated'),
      });
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      await updateUserRole(selectedUser.id, newRole as UserRole);
      Toast.show({
        type: 'success',
        text1: t('userManagement.roleUpdated'),
      });
      setShowRoleModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.updateFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      t('userManagement.deleteUser'),
      `${t('userManagement.confirmDelete')}\n\n${t('userManagement.deleteWarning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              Toast.show({
                type: 'success',
                text1: t('userManagement.userDeleted'),
              });
              await loadUsers();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.deleteFailed'),
                text2: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = (user: User) => {
    const message = user.is_active
      ? t('userManagement.confirmDeactivate')
      : t('userManagement.confirmActivate');

    Alert.alert(
      t('common.confirm'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (user.is_active) {
                await deactivateUser(user.id);
                Toast.show({
                  type: 'success',
                  text1: t('userManagement.userDeactivated'),
                });
              } else {
                await activateUser(user.id);
                Toast.show({
                  type: 'success',
                  text1: t('userManagement.userActivated'),
                });
              }
              await loadUsers();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('errors.updateFailed'),
                text2: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item: user }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={[styles.userInfo, isRtl && styles.userInfoRtl]}>
        <View style={styles.userHeader}>
          <Text style={[styles.userName, { textAlign: getTextAlign(i18n.language) }]}>
            {user.full_name}
          </Text>
          <View style={[styles.statusBadge, user.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>
              {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.userEmail, { textAlign: getTextAlign(i18n.language) }]}>
          {user.email}
        </Text>
        
        <Text style={[styles.userRole, { textAlign: getTextAlign(i18n.language) }]}>
          {t(`roles.${user.role}`)}
        </Text>
        
        {user.specialization && user.specialization.length > 0 && (
          <Text style={[styles.userSpecialization, { textAlign: getTextAlign(i18n.language) }]}>
            {user.specialization.join(' • ')}
          </Text>
        )}
      </View>

      <View style={[styles.userActions, isRtl && styles.userActionsRtl]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditUser(user)}
        >
          <Ionicons name="school-outline" size={20} color="#667eea" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditRole(user)}
        >
          <Ionicons name="shield-outline" size={20} color="#6f42c1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleUserStatus(user)}
        >
          <Ionicons
            name={user.is_active ? "pause-outline" : "play-outline"}
            size={20}
            color={user.is_active ? "#dc3545" : "#28a745"}
          />
        </TouchableOpacity>

        {canDeleteUsers(currentUser?.role || UserRole.TRAINER) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteUser(user)}
          >
            <Ionicons name="trash-outline" size={20} color="#dc3545" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Show all users for PM
  const filteredUsers = users;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('userManagement.title')}
            </Text>
            <Text style={[styles.headerSubtitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('userManagement.manageAllUsers')}
            </Text>
          </View>

          {canCreateUsers(currentUser?.role || UserRole.TRAINER) && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddUser}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { textAlign: getTextAlign(i18n.language) }]}
            placeholder={t('userManagement.searchUsers')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterContainer}>
            <Picker
              selectedValue={selectedRole}
              onValueChange={(value) => setSelectedRole(value)}
              style={styles.picker}
            >
              <Picker.Item label={t('userManagement.allRoles')} value="" />
              {manageableRoles.map((role) => (
                <Picker.Item
                  key={role}
                  label={t(`roles.${role}`)}
                  value={role}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.filterContainer}>
            <Picker
              selectedValue={selectedSpecialization}
              onValueChange={(value) => setSelectedSpecialization(value)}
              style={styles.picker}
            >
              <Picker.Item label={t('userManagement.allSpecializations')} value="" />
              {specializations.map((spec) => (
                <Picker.Item
                  key={spec}
                  label={t(`specializations.${spec}`)}
                  value={spec}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={[styles.emptyStateText, { textAlign: getTextAlign(i18n.language) }]}>
              {isLoading ? t('userManagement.loadingUsers') : t('userManagement.noUsersFound')}
            </Text>
          </View>
        }
      />

      {/* Edit Role Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('userManagement.editUserRole')}
            </Text>

            {selectedUser && (
              <Text style={[styles.modalUserName, { textAlign: getTextAlign(i18n.language) }]}>
                {selectedUser.full_name}
              </Text>
            )}

            <View style={styles.modalPickerContainer}>
              <Picker
                selectedValue={newRole}
                onValueChange={(value) => setNewRole(value)}
                style={styles.modalPicker}
              >
                <Picker.Item label={t('userManagement.selectRole')} value="" />
                {manageableRoles.map((role) => (
                  <Picker.Item
                    key={role}
                    label={t(`roles.${role}`)}
                    value={role}
                  />
                ))}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowRoleModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleUpdateRole}
              >
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
              {t('userManagement.updateSpecialization')}
            </Text>
            
            {selectedUser && (
              <Text style={[styles.modalUserName, { textAlign: getTextAlign(i18n.language) }]}>
                {selectedUser.full_name}
              </Text>
            )}

            <View style={styles.specializationsContainer}>
              <Text style={[styles.specializationsLabel, { textAlign: getTextAlign(i18n.language) }]}>
                {t('userManagement.selectSpecializations')}
              </Text>
              {specializations.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={styles.specializationItem}
                  onPress={() => {
                    const isSelected = newSpecializations.includes(spec);
                    if (isSelected) {
                      setNewSpecializations(newSpecializations.filter(s => s !== spec));
                    } else {
                      setNewSpecializations([...newSpecializations, spec]);
                    }
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    newSpecializations.includes(spec) && styles.checkboxSelected
                  ]}>
                    {newSpecializations.includes(spec) && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    )}
                  </View>
                  <Text style={[styles.specializationText, { textAlign: getTextAlign(i18n.language) }]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleUpdateSpecialization}
              >
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  picker: {
    height: 50,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userInfoRtl: {
    alignItems: 'flex-end',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d4edda',
  },
  inactiveBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
    marginBottom: 4,
  },
  userSpecialization: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  userActionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalUserName: {
    fontSize: 16,
    color: '#667eea',
    marginBottom: 20,
  },
  modalPickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  modalPicker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  specializationsContainer: {
    marginBottom: 20,
  },
  specializationsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  specializationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  specializationText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});

export default UserManagementScreen;
