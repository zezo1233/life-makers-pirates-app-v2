import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

// Import screens
import CalendarScreen from '../screens/calendar/CalendarScreen';
import EventDetailsScreen from '../screens/calendar/EventDetailsScreen';
import CreateEventScreen from '../screens/calendar/CreateEventScreen';
import TrainerAvailabilityScreen from '../screens/calendar/TrainerAvailabilityScreen';

// Import types
import { CalendarStackParamList } from '../types';

const Stack = createStackNavigator<CalendarStackParamList>();

const CalendarNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="CalendarView"
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
        name="CalendarView"
        component={CalendarScreen}
        options={{
          title: t('calendar.title'),
        }}
      />
      <Stack.Screen
        name="EventDetails"
        component={EventDetailsScreen}
        options={{
          title: t('calendar.event'),
        }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: t('calendar.createEvent'),
        }}
      />
      <Stack.Screen
        name="TrainerAvailability"
        component={TrainerAvailabilityScreen}
        options={{
          title: t('calendar.trainerAvailability'),
        }}
      />
    </Stack.Navigator>
  );
};

export default CalendarNavigator;
