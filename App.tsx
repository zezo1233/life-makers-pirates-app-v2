import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigationRef } from './src/services/navigationService';
import ErrorBoundary from './src/components/ErrorBoundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as ScreenOrientation from 'expo-screen-orientation';

// Import i18n configuration
import './src/i18n';

// Import stores
import { useAuthStore } from './src/store/authStore';

// Import enhanced services
import { performanceManager } from './src/utils/performance';
import { offlineService } from './src/services/offlineService';
import { notificationService } from './src/services/NotificationService';
import { securityService } from './src/services/securityService';
import { analyticsService } from './src/services/analyticsService';

// Import contexts
import { ThemeProvider } from './src/contexts/ThemeContext';

// Import screens
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import LoadingScreen from './src/screens/LoadingScreen';

// Import types
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize auth first
      await initialize();

      // Initialize enhanced services
      try {
        // Initialize offline service
        await offlineService.initialize();

        // Initialize security service
        await securityService.initialize();

        // Initialize analytics (no initialization needed for analytics service)
        console.log('Analytics service ready');

        // Initialize Perfect Notification System (OneSignal + Supabase)
        console.log('🚀 Initializing Perfect Notification System...');
        try {
          await notificationService.initialize();
          console.log('✅ Perfect Notification System initialized successfully');
          console.log('🎉 Simple, reliable, and powerful notification system ready!');
        } catch (error) {
          console.error('❌ Perfect Notification System initialization failed:', error);
          console.log('⚠️ Some notification features may not work');
        }

        console.log('Enhanced services initialized successfully');
      } catch (error) {
        console.error('Error initializing enhanced services:', error);
      }
    };

    // Set up screen orientation and auto-scaling
    const setupScreen = async () => {
      try {
        // Allow all orientations for better responsiveness
        await ScreenOrientation.unlockAsync();

        // Listen for orientation changes
        const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
          console.log('Orientation changed to:', event.orientationInfo.orientation);
        });

        return () => {
          ScreenOrientation.removeOrientationChangeListener(subscription);
        };
      } catch (error) {
        console.warn('Screen orientation setup failed:', error);
      }
    };

    initializeApp();
    setupScreen();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('🚨 App-level error caught:', error);
              console.error('🚨 Error info:', errorInfo);
            }}
          >
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="auto" />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                  <Stack.Screen name="Main" component={MainNavigator} />
                ) : (
                  <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
              </Stack.Navigator>
              <Toast />
            </NavigationContainer>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
