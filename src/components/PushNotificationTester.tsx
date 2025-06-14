import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { notificationService } from '../services/NotificationService';
import { enhancedOneSignalService } from '../services/enhancedOneSignalService';

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

export const PushNotificationTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testNotificationService = async () => {
    setIsLoading(true);
    try {
      await notificationService.initialize();
      const status = notificationService.getStatus();

      addTestResult({
        success: status.isInitialized,
        message: 'Notification Service Test',
        details: `Initialized: ${status.isInitialized}\nOneSignal: ${status.oneSignalReady}\nSupabase: ${status.supabaseReady}\nDevice: ${status.deviceType}`
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Notification Service Test Failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setIsLoading(false);
  };

  const testOneSignalSetup = async () => {
    setIsLoading(true);
    try {
      await enhancedOneSignalService.initialize();
      const status = enhancedOneSignalService.getStatus();

      addTestResult({
        success: status.isInitialized,
        message: 'OneSignal Setup Test',
        details: `Initialized: ${status.isInitialized}\nPlayer ID: ${status.playerId || 'Not available'}\nPermissions: ${status.hasPermissions ? 'Granted' : 'Not granted'}`
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: 'OneSignal Setup Test Failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setIsLoading(false);
  };

  const testNotificationSending = async () => {
    setIsLoading(true);
    try {
      const result = await notificationService.sendNotification({
        title: 'Test Notification',
        body: 'This is a test notification from the Notification Service',
        type: 'system',
        targetUserIds: ['test-user-id'],
        priority: 'normal',
        data: { test: true }
      });

      addTestResult({
        success: result.success,
        message: 'Notification Sending Test',
        details: `Method: ${result.method}\nDetails: ${result.details}`
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Notification Sending Test Failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    setIsLoading(false);
  };

  const generateSystemReport = async () => {
    setIsLoading(true);
    try {
      const notificationStatus = notificationService.getStatus();
      const oneSignalStatus = enhancedOneSignalService.getStatus();

      const report = `
📊 System Status Report:

🔔 Notification Service:
- Initialized: ${notificationStatus.isInitialized}
- OneSignal Ready: ${notificationStatus.oneSignalReady}
- Supabase Ready: ${notificationStatus.supabaseReady}
- Device Type: ${notificationStatus.deviceType}
- Platform: ${notificationStatus.platform}

📱 OneSignal Service:
- Initialized: ${oneSignalStatus.isInitialized}
- Player ID: ${oneSignalStatus.playerId || 'Not available'}
- Permissions: ${oneSignalStatus.hasPermissions ? 'Granted' : 'Not granted'}

🔧 Environment:
- App ID: ${process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ? 'Set' : 'Missing'}
- Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}
      `;

      Alert.alert(
        'System Report',
        report,
        [
          { text: 'Copy to Console', onPress: () => {
            console.log('System Report:', report);
          }},
          { text: 'OK' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    }
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Push Notification Tester</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testNotificationService}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Notification Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testOneSignalSetup}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test OneSignal Setup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={testNotificationSending}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Notification Sending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={generateSystemReport}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Generate System Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton]} 
          onPress={clearResults}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Running test...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <View key={index} style={[
            styles.resultItem,
            result.success ? styles.successResult : styles.errorResult
          ]}>
            <Text style={styles.resultMessage}>
              {result.success ? '✅' : '❌'} {result.message}
            </Text>
            {result.details && (
              <Text style={styles.resultDetails}>{result.details}</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  successResult: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorResult: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  resultMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
});
