import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ChatRoom, User } from '../../types';
import { isRTL, getTextAlign } from '../../i18n';

interface WhatsAppGroupSettingsProps {
  visible: boolean;
  group: ChatRoom;
  members: User[];
  currentUser: User;
  onClose: () => void;
  onUpdateGroup: (updates: Partial<ChatRoom>) => void;
  onAddMembers: () => void;
  onRemoveMember: (userId: string) => void;
  onLeaveGroup: () => void;
  onMakeAdmin: (userId: string) => void;
  onRemoveAdmin: (userId: string) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const WhatsAppGroupSettings: React.FC<WhatsAppGroupSettingsProps> = ({
  visible,
  group,
  members,
  currentUser,
  onClose,
  onUpdateGroup,
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onMakeAdmin,
  onRemoveAdmin,
}) => {
  const { t, i18n } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [groupDescription, setGroupDescription] = useState(group.description || '');
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [onlyAdminsCanMessage, setOnlyAdminsCanMessage] = useState(false);
  const isRtl = isRTL(i18n.language);

  const isAdmin = (userId: string): boolean => {
    // TODO: تحقق من كون المستخدم مشرف
    return group.created_by === userId;
  };

  const canManageGroup = (): boolean => {
    return isAdmin(currentUser.id);
  };

  const handleSaveGroupName = () => {
    if (groupName.trim() && groupName !== group.name) {
      onUpdateGroup({ name: groupName.trim() });
    }
    setEditingName(false);
  };

  const handleSaveGroupDescription = () => {
    if (groupDescription !== group.description) {
      onUpdateGroup({ description: groupDescription });
    }
    setEditingDescription(false);
  };

  const handleRemoveMember = (member: User) => {
    Alert.alert(
      t('chat.removeMember'),
      t('chat.removeMemberConfirm', { name: member.full_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.remove'),
          style: 'destructive',
          onPress: () => onRemoveMember(member.id),
        },
      ]
    );
  };

  const handleMakeAdmin = (member: User) => {
    Alert.alert(
      t('chat.makeAdmin'),
      t('chat.makeAdminConfirm', { name: member.full_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.makeAdmin'),
          onPress: () => onMakeAdmin(member.id),
        },
      ]
    );
  };

  const handleRemoveAdmin = (member: User) => {
    Alert.alert(
      t('chat.removeAdmin'),
      t('chat.removeAdminConfirm', { name: member.full_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.removeAdmin'),
          style: 'destructive',
          onPress: () => onRemoveAdmin(member.id),
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      t('chat.leaveGroup'),
      t('chat.leaveGroupConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.leave'),
          style: 'destructive',
          onPress: onLeaveGroup,
        },
      ]
    );
  };

  const renderMember = (member: User) => {
    const memberIsAdmin = isAdmin(member.id);
    const isCurrentUser = member.id === currentUser.id;

    return (
      <TouchableOpacity
        key={member.id}
        style={styles.memberItem}
        onPress={() => {
          if (!canManageGroup() || isCurrentUser) return;
          
          Alert.alert(
            member.full_name,
            t('chat.memberOptions'),
            [
              {
                text: memberIsAdmin ? t('chat.removeAdmin') : t('chat.makeAdmin'),
                onPress: () => memberIsAdmin ? handleRemoveAdmin(member) : handleMakeAdmin(member),
              },
              {
                text: t('chat.removeMember'),
                style: 'destructive',
                onPress: () => handleRemoveMember(member),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]
          );
        }}
      >
        <View style={styles.memberAvatar}>
          <Ionicons name="person" size={24} color="#25D366" />
        </View>
        
        <View style={styles.memberInfo}>
          <Text style={[
            styles.memberName,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {member.full_name}
            {isCurrentUser && ` (${t('chat.you')})`}
          </Text>
          <Text style={[
            styles.memberRole,
            { textAlign: getTextAlign(i18n.language) }
          ]}>
            {memberIsAdmin ? t('chat.admin') : t('chat.member')}
          </Text>
        </View>

        {memberIsAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#25D366" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {t('chat.groupSettings')}
          </Text>
          
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Group Info */}
          <View style={styles.section}>
            <View style={styles.groupHeader}>
              <View style={styles.groupAvatar}>
                <Ionicons name="people" size={40} color="#25D366" />
              </View>
              
              <View style={styles.groupInfo}>
                {editingName ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={[styles.editInput, { textAlign: getTextAlign(i18n.language) }]}
                      value={groupName}
                      onChangeText={setGroupName}
                      onBlur={handleSaveGroupName}
                      onSubmitEditing={handleSaveGroupName}
                      autoFocus
                      maxLength={50}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => canManageGroup() && setEditingName(true)}
                    disabled={!canManageGroup()}
                  >
                    <Text style={styles.groupName}>{group.name}</Text>
                  </TouchableOpacity>
                )}
                
                <Text style={styles.memberCount}>
                  {t('chat.membersCount', { count: members.length })}
                </Text>
              </View>
            </View>

            {/* Group Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>{t('chat.description')}</Text>
              {editingDescription ? (
                <TextInput
                  style={[styles.descriptionInput, { textAlign: getTextAlign(i18n.language) }]}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  onBlur={handleSaveGroupDescription}
                  onSubmitEditing={handleSaveGroupDescription}
                  multiline
                  maxLength={200}
                  placeholder={t('chat.addDescription')}
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  onPress={() => canManageGroup() && setEditingDescription(true)}
                  disabled={!canManageGroup()}
                >
                  <Text style={[
                    styles.descriptionText,
                    { textAlign: getTextAlign(i18n.language) }
                  ]}>
                    {groupDescription || t('chat.addDescription')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Group Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('chat.groupSettings')}</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-off" size={20} color="#8696A0" />
                <Text style={styles.settingText}>{t('chat.muteNotifications')}</Text>
              </View>
              <Switch
                value={muteNotifications}
                onValueChange={setMuteNotifications}
                trackColor={{ false: '#E5E5EA', true: '#25D366' }}
                thumbColor="#ffffff"
              />
            </View>

            {canManageGroup() && (
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="lock-closed" size={20} color="#8696A0" />
                  <Text style={styles.settingText}>{t('chat.onlyAdminsCanMessage')}</Text>
                </View>
                <Switch
                  value={onlyAdminsCanMessage}
                  onValueChange={setOnlyAdminsCanMessage}
                  trackColor={{ false: '#E5E5EA', true: '#25D366' }}
                  thumbColor="#ffffff"
                />
              </View>
            )}
          </View>

          {/* Members */}
          <View style={styles.section}>
            <View style={styles.membersHeader}>
              <Text style={styles.sectionTitle}>
                {t('chat.members')} ({members.length})
              </Text>
              {canManageGroup() && (
                <TouchableOpacity style={styles.addMemberButton} onPress={onAddMembers}>
                  <Ionicons name="person-add" size={20} color="#25D366" />
                </TouchableOpacity>
              )}
            </View>
            
            {members.map(renderMember)}
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLeaveGroup}>
              <Ionicons name="exit" size={20} color="#FF5722" />
              <Text style={styles.actionButtonText}>{t('chat.leaveGroup')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#8696A0',
  },
  editContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#25D366',
  },
  editInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingVertical: 4,
  },
  descriptionContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25D366',
    marginBottom: 12,
  },
  descriptionInput: {
    fontSize: 14,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
  },
  descriptionText: {
    fontSize: 14,
    color: '#000000',
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#000000',
    marginLeft: 12,
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addMemberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#8696A0',
  },
  adminBadge: {
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FF5722',
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default WhatsAppGroupSettings;
