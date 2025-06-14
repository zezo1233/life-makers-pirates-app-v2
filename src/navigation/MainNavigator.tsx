import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

// Import screens
import DashboardScreen from '../screens/main/DashboardScreen';
import CalendarNavigator from './CalendarNavigator';
import RequestsNavigator from './RequestsNavigator';
import ChatNavigator from './ChatNavigator';
import ProfileNavigator from './ProfileNavigator';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';

// Import types
import { MainTabParamList } from '../types';
import { isRTL } from '../i18n';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator();

const MainNavigator: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = isRTL(i18n.language);
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Requests':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Chat':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e1e1e1',
          paddingBottom: Platform.OS === 'android' ? insets.bottom + 5 : 5,
          paddingTop: 5,
          height: Platform.OS === 'android' ? 70 + insets.bottom : 60,
          flexDirection: isRtl ? 'row-reverse' : 'row',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
          textAlign: isRtl ? 'right' : 'left',
        },
        headerTitleAlign: 'center',
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('navigation.dashboard'),
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarNavigator}
        options={{
          title: t('navigation.calendar'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsNavigator}
        options={{
          title: t('navigation.requests'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          title: t('navigation.chat'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: t('navigation.analytics'),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          title: t('navigation.profile'),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
