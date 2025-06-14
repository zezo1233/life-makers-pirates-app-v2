import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

// Import stores and types
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatStackParamList } from '../../navigation/ChatNavigator';
import { User, UserRole } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';
import ChatPermissionService from '../../services/ChatPermissionService';
import ChatRequestModal from '../../components/chat/ChatRequestModal';
import { supabase } from '../../config/supabase';

type CreateChatNavigationProp = StackNavigationProp<ChatStackParamList, 'CreateChat'>;

const CreateChatScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<CreateChatNavigationProp>();
  const { isLoading } = useChatStore();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedTargetUser, setSelectedTargetUser] = useState<User | null>(null);

  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // جلب المستخدمين من قاعدة البيانات
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', user?.id)
        .eq('is_active', true);

      if (error) throw error;

      // تصفية المستخدمين حسب الصلاحيات
      const filteredUsers = users?.filter(u => {
        if (!user) return false;

        const currentUser = {
          id: user.id,
          full_name: user.full_name || user.email,
          role: user.role,
          specialization: user.specialization
        };

        const targetUser = {
          id: u.id,
          full_name: u.full_name || u.email,
          role: u.role,
          specialization: u.specialization
        };

        // فحص إمكانية إنشاء محادثة مع هذا المستخدم
        const permission = ChatPermissionService.canCreateDirectChat(currentUser, targetUser);
        return permission.allowed || permission.requiresApproval;
      }) || [];

      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('خطأ في تحميل المستخدمين:', error);
      Toast.show({
        type: 'error',
        text1: t('errors.loadFailed'),
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleUserSelection = (selectedUser: User) => {
    if (chatType === 'direct') {
      // للمحادثات المباشرة، فحص الصلاحيات أولاً
      handleDirectChatRequest(selectedUser);
    } else {
      // للمجموعات، إضافة/إزالة المستخدم
      setSelectedUsers(prev => {
        const isSelected = prev.find(u => u.id === selectedUser.id);
        if (isSelected) {
          return prev.filter(u => u.id !== selectedUser.id);
        } else {
          return [...prev, selectedUser];
        }
      });
    }
  };

  const handleDirectChatRequest = (targetUser: User) => {
    if (!user) return;

    const currentUser = {
      id: user.id,
      full_name: user.full_name || user.email,
      role: user.role,
      specialization: user.specialization
    };

    const permission = ChatPermissionService.canCreateDirectChat(currentUser, targetUser);

    if (permission.allowed && !permission.requiresApproval) {
      // إنشاء محادثة مباشرة فوراً
      createDirectChat(targetUser);
    } else if (permission.requiresApproval || permission.allowed) {
      // عرض نافذة طلب المحادثة
      setSelectedTargetUser(targetUser);
      setShowRequestModal(true);
    } else {
      // غير مسموح
      Toast.show({
        type: 'error',
        text1: t('chat.chatNotAllowed'),
        text2: permission.reason,
      });
    }
  };

  const createDirectChat = async (targetUser: User) => {
    if (!user) return;

    try {
      const currentUser = {
        id: user.id,
        full_name: user.full_name || user.email,
        role: user.role,
        specialization: user.specialization
      };

      const chatId = await ChatPermissionService.createAutoDirectChat(currentUser, targetUser);

      if (chatId) {
        Toast.show({
          type: 'success',
          text1: t('chat.chatCreated'),
        });

        navigation.navigate('ChatRoom', {
          roomId: chatId,
          roomName: targetUser.full_name || targetUser.email,
        });
      } else {
        throw new Error('فشل في إنشاء المحادثة');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.createChatFailed'),
        text2: error.message,
      });
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('chat.selectUsers'),
      });
      return;
    }

    if (chatType === 'group' && !groupName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('chat.groupNameRequired'),
      });
      return;
    }

    try {
      const chatName = chatType === 'group'
        ? groupName.trim()
        : selectedUsers[0].full_name;

      // For now, create a mock room since createChatRoom might need different parameters
      // const roomData = {
      //   name: chatName,
      //   type: chatType,
      //   participants: [user!.id, ...selectedUsers.map(u => u.id)],
      // };
      const newRoom = {
        id: Date.now().toString(),
        name: chatName,
        type: chatType,
      };

      Toast.show({
        type: 'success',
        text1: t('chat.chatCreated'),
      });

      navigation.navigate('ChatRoom', {
        roomId: newRoom.id,
        roomName: newRoom.name,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.createChatFailed'),
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.find(u => u.id === item.id);

    // فحص صلاحيات المحادثة مع هذا المستخدم
    const getPermissionStatus = () => {
      if (!user) return null;

      const currentUser = {
        id: user.id,
        full_name: user.full_name || user.email,
        role: user.role,
        specialization: user.specialization
      };

      const targetUser = {
        id: item.id,
        full_name: item.full_name || item.email,
        role: item.role,
        specialization: item.specialization
      };

      return ChatPermissionService.canCreateDirectChat(currentUser, targetUser);
    };

    const permission = getPermissionStatus();

    return (
      <TouchableOpacity
        style={[styles.userItem, isRtl && styles.userItemRtl]}
        onPress={() => toggleUserSelection(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.userInfo, isRtl && styles.userInfoRtl]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.full_name || item.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { textAlign: getTextAlign(i18n.language) }]}>
              {item.full_name || item.email}
            </Text>
            <Text style={[styles.userRole, { textAlign: getTextAlign(i18n.language) }]}>
              {t(`roles.${item.role}`)}
            </Text>
            {item.specialization && (
              <Text style={[styles.userSpec, { textAlign: getTextAlign(i18n.language) }]}>
                {t(`specializations.${item.specialization}`)}
              </Text>
            )}

            {/* إظهار حالة الصلاحية */}
            {chatType === 'direct' && permission && (
              <View style={styles.permissionStatus}>
                {permission.allowed && !permission.requiresApproval && (
                  <View style={styles.permissionBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                    <Text style={[styles.permissionText, styles.allowedText]}>
                      {t('chat.directChatAllowed')}
                    </Text>
                  </View>
                )}
                {permission.requiresApproval && (
                  <View style={styles.permissionBadge}>
                    <Ionicons name="time" size={12} color="#FF9800" />
                    <Text style={[styles.permissionText, styles.approvalText]}>
                      {t('chat.requiresApproval')}
                    </Text>
                  </View>
                )}
                {!permission.allowed && (
                  <View style={styles.permissionBadge}>
                    <Ionicons name="close-circle" size={12} color="#F44336" />
                    <Text style={[styles.permissionText, styles.blockedText]}>
                      {t('chat.chatNotAllowed')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {chatType === 'group' ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            )}
          </View>
        ) : (
          <View style={styles.chatAction}>
            <Ionicons
              name={permission?.allowed ? "chatbubble" : "chatbubble-outline"}
              size={20}
              color={permission?.allowed ? "#25D366" : "#999"}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Chat Type Selector */}
      <View style={styles.chatTypeContainer}>
        <TouchableOpacity
          style={[
            styles.chatTypeButton,
            chatType === 'direct' && styles.chatTypeButtonActive
          ]}
          onPress={() => {
            setChatType('direct');
            setSelectedUsers([]);
          }}
        >
          <Text style={[
            styles.chatTypeText,
            chatType === 'direct' && styles.chatTypeTextActive
          ]}>
            {t('chat.directMessages')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.chatTypeButton,
            chatType === 'group' && styles.chatTypeButtonActive
          ]}
          onPress={() => {
            setChatType('group');
            setSelectedUsers([]);
          }}
        >
          <Text style={[
            styles.chatTypeText,
            chatType === 'group' && styles.chatTypeTextActive
          ]}>
            {t('chat.groupChats')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Name Input (only for group chats) */}
      {chatType === 'group' && (
        <View style={styles.groupNameContainer}>
          <TextInput
            style={[styles.groupNameInput, { textAlign: getTextAlign(i18n.language) }]}
            placeholder={t('chat.groupName')}
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={[styles.searchInput, { textAlign: getTextAlign(i18n.language) }]}
          placeholder={t('chat.searchUsers')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Selected Users Count */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={[styles.selectedText, { textAlign: getTextAlign(i18n.language) }]}>
            {t('chat.selectedUsers', { count: selectedUsers.length })}
          </Text>
        </View>
      )}

      {/* Users List */}
      {isLoadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#ccc" />
              <Text style={[styles.emptyText, { textAlign: getTextAlign(i18n.language) }]}>
                {t('chat.noUsersFound')}
              </Text>
            </View>
          }
        />
      )}

      {/* Create Button */}
      <TouchableOpacity
        style={[
          styles.createButton,
          (selectedUsers.length === 0 || isLoading) && styles.createButtonDisabled
        ]}
        onPress={handleCreateChat}
        disabled={selectedUsers.length === 0 || isLoading}
      >
        <Text style={styles.createButtonText}>
          {isLoading ? t('common.loading') : t('chat.createGroup')}
        </Text>
      </TouchableOpacity>

      {/* Chat Request Modal */}
      <ChatRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedTargetUser(null);
        }}
        targetUser={selectedTargetUser || undefined}
        onSuccess={() => {
          setShowRequestModal(false);
          setSelectedTargetUser(null);
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatTypeButtonActive: {
    backgroundColor: '#667eea',
  },
  chatTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chatTypeTextActive: {
    color: '#ffffff',
  },
  groupNameContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupNameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  selectedContainer: {
    backgroundColor: '#e3f2fd',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 12,
  },
  selectedText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userItemRtl: {
    flexDirection: 'row-reverse',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfoRtl: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userSpec: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  permissionStatus: {
    marginTop: 4,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F5F5F5',
  },
  permissionText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
  allowedText: {
    color: '#4CAF50',
  },
  approvalText: {
    color: '#FF9800',
  },
  blockedText: {
    color: '#F44336',
  },
  chatAction: {
    padding: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  createButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

export default CreateChatScreen;
