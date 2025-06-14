import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';

// Import screens (placeholder for now)
import RequestsListScreen from '../screens/requests/RequestsListScreen';
import RequestDetailsScreen from '../screens/requests/RequestDetailsScreen';
import CreateRequestScreen from '../screens/requests/CreateRequestScreen';

export type RequestsStackParamList = {
  RequestsList: undefined;
  RequestDetails: { requestId: string };
  CreateRequest: {
    editMode?: boolean;
    requestId?: string;
    requestData?: {
      title: string;
      description: string;
      specialization: string;
      province: string;
      requested_date: string;
      duration_hours: number;
      max_participants: number;
    };
  } | undefined;
};

const Stack = createStackNavigator<RequestsStackParamList>();

const RequestsNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="RequestsList"
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
        name="RequestsList"
        component={RequestsListScreen}
        options={{
          title: t('training.requests'),
        }}
      />
      <Stack.Screen
        name="RequestDetails"
        component={RequestDetailsScreen}
        options={{
          title: t('training.requests'),
        }}
      />
      <Stack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{
          title: t('training.newRequest'),
        }}
      />
    </Stack.Navigator>
  );
};

export default RequestsNavigator;
