import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { restrictedChatService, GroupChatInfo } from '../../services/restrictedChatService';
import { isRTL, getTextAlign } from '../../i18n';
import { User, UserRole } from '../../types';

interface ChatOption {
  id: string;
  name: string;
  type: 'direct' | 'group';
  description?: string;
  user?: User;
  group?: GroupChatInfo;
  lastMessage?: string;
  unreadCount?: number;
}

const RestrictedChatScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [chatOptions, setChatOptions] = useState<ChatOption[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isRtl = isRTL(i18n.language);

  useEffect(() => {
    if (user) {
      loadChatOptions();
    }
  }, [user]);

  const loadChatOptions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get available direct chat users
      const directChatUsers = await restrictedChatService.getDirectChatableUsers(user.id);
      
      // Get available group chats
      const groupChats = restrictedChatService.getAvailableGroupChats(user.role);

      const options: ChatOption[] = [];

      // Add direct chat options
      directChatUsers.forEach(chatUser => {
        options.push({
          id: `direct_${chatUser.id}`,
          name: chatUser.full_name,
          type: 'direct',
          description: getRoleDisplayName(chatUser.role),
          user: chatUser,
          lastMessage: 'اضغط للبدء في المحادثة',
          unreadCount: 0
        });
      });

      // Add group chat options
      groupChats.forEach(group => {
        options.push({
          id: `group_${group.id}`,
          name: group.name,
          type: 'group',
          description: group.description,
          group,
          lastMessage: 'مجموعة نشطة',
          unreadCount: 0
        });
      });

      setChatOptions(options);
    } catch (error) {
      console.error('Error loading chat options:', error);
      Alert.alert('خطأ', 'فشل في تحميل خيارات المحادثة');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role: UserRole): string => {
    const roleNames = {
      [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: 'مسؤول تنمية المحافظة',
      [UserRole.DEVELOPMENT_MANAGEMENT_OFFICER]: 'مسؤول إدارة التنمية',
      [UserRole.TRAINER_PREPARATION_PROJECT_MANAGER]: 'مسؤول مشروع إعداد المدربين',
      [UserRole.PROGRAM_SUPERVISOR]: 'المتابع',
      [UserRole.TRAINER]: 'المدرب',
      [UserRole.BOARD_MEMBER]: 'عضو مجلس الإدارة'
    };
    return roleNames[role] || role;
  };

  const handleChatPress = async (option: ChatOption) => {
    if (!user) return;

    try {
      if (option.type === 'direct' && option.user) {
        // Check permission first
        const permission = await restrictedChatService.canDirectChat(user.id, option.user.id);
        
        if (!permission.canChat) {
          Alert.alert('غير مسموح', permission.reason || 'لا يمكنك المحادثة مع هذا المستخدم');
          return;
        }

        // Create or get chat room
        const roomId = await restrictedChatService.getOrCreateChatRoom(user.id, option.user.id);
        
        if (roomId) {
          // Navigate to chat room (implement navigation)
          Alert.alert('محادثة', `سيتم فتح محادثة مع ${option.user.full_name}`);
        } else {
          Alert.alert('خطأ', 'فشل في إنشاء غرفة المحادثة');
        }
      } else if (option.type === 'group' && option.group) {
        // Check group permission
        const permission = restrictedChatService.canJoinGroupChat(user.role, option.group.id);
        
        if (!permission.canChat) {
          Alert.alert('غير مسموح', permission.reason || 'لا يمكنك الانضمام لهذه المجموعة');
          return;
        }

        // Join or create group chat
        const roomId = await restrictedChatService.createGroupChatRoom(option.group.id, user.id);
        
        if (roomId) {
          Alert.alert('مجموعة', `سيتم فتح مجموعة ${option.group.name}`);
        } else {
          Alert.alert('خطأ', 'فشل في الانضمام للمجموعة');
        }
      }
    } catch (error) {
      console.error('Error handling chat press:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء فتح المحادثة');
    }
  };

  const renderChatOption = ({ item }: { item: ChatOption }) => (
    <TouchableOpacity
      style={[styles.chatOption, isRtl && styles.chatOptionRtl]}
      onPress={() => handleChatPress(item)}
    >
      <View style={[styles.chatIcon, item.type === 'group' && styles.groupIcon]}>
        <Ionicons
          name={item.type === 'direct' ? 'person-outline' : 'people-outline'}
          size={24}
          color={item.type === 'direct' ? '#667eea' : '#28a745'}
        />
      </View>

      <View style={styles.chatInfo}>
        <Text style={[styles.chatName, { textAlign: getTextAlign(i18n.language) }]}>
          {item.name}
        </Text>
        <Text style={[styles.chatDescription, { textAlign: getTextAlign(i18n.language) }]}>
          {item.description}
        </Text>
        {item.lastMessage && (
          <Text style={[styles.lastMessage, { textAlign: getTextAlign(i18n.language) }]}>
            {item.lastMessage}
          </Text>
        )}
      </View>

      <View style={styles.chatMeta}>
        {item.unreadCount && item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
        <Ionicons
          name={isRtl ? 'chevron-back-outline' : 'chevron-forward-outline'}
          size={20}
          color="#ccc"
        />
      </View>
    </TouchableOpacity>
  );

  const renderRulesModal = () => {
    if (!user) return null;

    const restrictions = restrictedChatService.getChatRestrictionsInfo(user.role);

    return (
      <Modal
        visible={showRulesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { textAlign: getTextAlign(i18n.language) }]}>
                قواعد المحادثات
              </Text>
              <TouchableOpacity onPress={() => setShowRulesModal(false)}>
                <Ionicons name="close-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesTitle, { textAlign: getTextAlign(i18n.language) }]}>
                📱 المحادثات المباشرة:
              </Text>
              {restrictions.directChatRules.map((rule, index) => (
                <Text key={index} style={[styles.ruleText, { textAlign: getTextAlign(i18n.language) }]}>
                  • {rule}
                </Text>
              ))}
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesTitle, { textAlign: getTextAlign(i18n.language) }]}>
                👥 المحادثات الجماعية:
              </Text>
              {restrictions.groupChatRules.map((rule, index) => (
                <Text key={index} style={[styles.ruleText, { textAlign: getTextAlign(i18n.language) }]}>
                  • {rule}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRulesModal(false)}
            >
              <Text style={styles.closeButtonText}>فهمت</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <Text style={[styles.emptyTitle, { textAlign: getTextAlign(i18n.language) }]}>
        لا توجد محادثات متاحة
      </Text>
      <Text style={[styles.emptySubtitle, { textAlign: getTextAlign(i18n.language) }]}>
        المحادثات محدودة حسب دورك في النظام
      </Text>
      <TouchableOpacity
        style={styles.rulesButton}
        onPress={() => setShowRulesModal(true)}
      >
        <Ionicons name="information-circle-outline" size={20} color="#667eea" />
        <Text style={styles.rulesButtonText}>اعرف القواعد</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>يرجى تسجيل الدخول أولاً</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign: getTextAlign(i18n.language) }]}>
          المحادثات
        </Text>
        <TouchableOpacity
          style={styles.rulesIconButton}
          onPress={() => setShowRulesModal(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Chat Options List */}
      <FlatList
        data={chatOptions}
        renderItem={renderChatOption}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={chatOptions.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshing={isLoading}
        onRefresh={loadChatOptions}
      />

      {/* Rules Modal */}
      {renderRulesModal()}
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
  rulesIconButton: {
    padding: 8,
  },
  chatList: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  chatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatOptionRtl: {
    flexDirection: 'row-reverse',
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIcon: {
    backgroundColor: '#e8f5e8',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  chatDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 12,
    color: '#999',
  },
  chatMeta: {
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  rulesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f2ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rulesButtonText: {
    fontSize: 14,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 50,
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
  rulesSection: {
    marginBottom: 20,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RestrictedChatScreen;
