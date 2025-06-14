import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import CreateChatScreen from '../screens/chat/CreateChatScreen';
import RestrictedChatScreen from '../screens/chat/RestrictedChatScreen';
import AIChatScreen from '../screens/ai/AIChatScreen';
import FeedbackAnalysisScreen from '../screens/feedback/FeedbackAnalysisScreen';

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string };
  CreateChat: undefined;
  RestrictedChat: undefined;
  AIChat: undefined;
  FeedbackAnalysis: undefined;
};

const Stack = createStackNavigator<ChatStackParamList>();

const ChatNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="ChatList"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          title: t('chat.messages'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({
          title: route.params.roomName,
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="CreateChat"
        component={CreateChatScreen}
        options={{
          title: t('chat.newMessage'),
        }}
      />
      <Stack.Screen
        name="RestrictedChat"
        component={RestrictedChatScreen}
        options={{
          title: t('restrictedChat.title'),
        }}
      />
      <Stack.Screen
        name="AIChat"
        component={AIChatScreen}
        options={{
          title: t('aiChat.title'),
        }}
      />
      <Stack.Screen
        name="FeedbackAnalysis"
        component={FeedbackAnalysisScreen}
        options={{
          title: t('feedbackAnalysis.title'),
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator;
