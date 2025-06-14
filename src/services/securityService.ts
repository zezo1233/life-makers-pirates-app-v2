import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

interface SecuritySettings {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // in minutes
  sessionTimeout: number; // in minutes
  encryptionEnabled: boolean;
  auditLogging: boolean;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'data_access' | 'permission_denied' | 'security_violation';
  timestamp: number;
  userId?: string;
  details: any;
  ipAddress?: string;
  deviceInfo?: any;
}

interface SessionInfo {
  userId: string;
  startTime: number;
  lastActivity: number;
  deviceId: string;
  isActive: boolean;
}

export class SecurityService {
  private static instance: SecurityService;
  private readonly SECURITY_SETTINGS_KEY = 'security_settings';
  private readonly SECURITY_EVENTS_KEY = 'security_events';
  private readonly SESSION_KEY = 'current_session';
  private readonly ENCRYPTION_KEY = 'app_encryption_key';
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
  
  private sessionTimer: NodeJS.Timeout | null = null;
  private autoLockTimer: NodeJS.Timeout | null = null;
  private failedAttempts: number = 0;
  private isLocked: boolean = false;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Initialize security service
  async initialize(): Promise<void> {
    await this.loadSecuritySettings();
    await this.startSessionMonitoring();
    await this.checkBiometricAvailability();
  }

  // Biometric authentication
  async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد الهوية',
        cancelLabel: 'إلغاء',
        fallbackLabel: 'استخدام كلمة المرور',
      });

      if (result.success) {
        await this.logSecurityEvent('login', { method: 'biometric' });
        return true;
      } else {
        await this.logSecurityEvent('failed_login', { 
          method: 'biometric', 
          reason: result.error 
        });
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  // PIN authentication
  async setPIN(pin: string): Promise<void> {
    const hashedPIN = this.hashData(pin);
    await SecureStore.setItemAsync('user_pin', hashedPIN);
    
    const settings = await this.getSecuritySettings();
    settings.pinEnabled = true;
    await this.updateSecuritySettings(settings);
  }

  async verifyPIN(pin: string): Promise<boolean> {
    try {
      const storedPIN = await SecureStore.getItemAsync('user_pin');
      if (!storedPIN) return false;

      const hashedPIN = this.hashData(pin);
      const isValid = hashedPIN === storedPIN;

      if (isValid) {
        this.failedAttempts = 0;
        await this.logSecurityEvent('login', { method: 'pin' });
      } else {
        this.failedAttempts++;
        await this.logSecurityEvent('failed_login', { 
          method: 'pin', 
          attempts: this.failedAttempts 
        });

        if (this.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
          await this.lockApp();
        }
      }

      return isValid;
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }

  async removePIN(): Promise<void> {
    await SecureStore.deleteItemAsync('user_pin');
    
    const settings = await this.getSecuritySettings();
    settings.pinEnabled = false;
    await this.updateSecuritySettings(settings);
  }

  // App locking
  async lockApp(): Promise<void> {
    this.isLocked = true;
    await AsyncStorage.setItem('app_locked', 'true');
    await AsyncStorage.setItem('lock_timestamp', Date.now().toString());
    
    await this.logSecurityEvent('security_violation', { 
      reason: 'max_failed_attempts_reached' 
    });
  }

  async unlockApp(): Promise<void> {
    this.isLocked = false;
    this.failedAttempts = 0;
    await AsyncStorage.removeItem('app_locked');
    await AsyncStorage.removeItem('lock_timestamp');
  }

  async isAppLocked(): Promise<boolean> {
    const locked = await AsyncStorage.getItem('app_locked');
    if (!locked) return false;

    const lockTimestamp = await AsyncStorage.getItem('lock_timestamp');
    if (!lockTimestamp) return false;

    const lockTime = parseInt(lockTimestamp, 10);
    const now = Date.now();

    // Auto-unlock after lockout duration
    if (now - lockTime > this.LOCKOUT_DURATION) {
      await this.unlockApp();
      return false;
    }

    return true;
  }

  // Session management
  async startSession(userId: string): Promise<void> {
    const session: SessionInfo = {
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      deviceId: await this.getDeviceId(),
      isActive: true
    };

    await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    await this.startSessionTimer();
    await this.logSecurityEvent('login', { userId, deviceId: session.deviceId });
  }

  async updateSessionActivity(): Promise<void> {
    const sessionStr = await AsyncStorage.getItem(this.SESSION_KEY);
    if (!sessionStr) return;

    const session: SessionInfo = JSON.parse(sessionStr);
    session.lastActivity = Date.now();
    
    await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    await this.resetAutoLockTimer();
  }

  async endSession(): Promise<void> {
    const sessionStr = await AsyncStorage.getItem(this.SESSION_KEY);
    if (sessionStr) {
      const session: SessionInfo = JSON.parse(sessionStr);
      await this.logSecurityEvent('logout', { userId: session.userId });
    }

    await AsyncStorage.removeItem(this.SESSION_KEY);
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  async getCurrentSession(): Promise<SessionInfo | null> {
    const sessionStr = await AsyncStorage.getItem(this.SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  }

  // Data encryption
  encryptData(data: string, key?: string): string {
    const encryptionKey = key || this.getEncryptionKey();
    return CryptoJS.AES.encrypt(data, encryptionKey).toString();
  }

  decryptData(encryptedData: string, key?: string): string {
    try {
      const encryptionKey = key || this.getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  private getEncryptionKey(): string {
    // In production, this should be generated and stored securely
    return 'training-management-encryption-key-2024';
  }

  // Security settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const settingsStr = await AsyncStorage.getItem(this.SECURITY_SETTINGS_KEY);
      if (settingsStr) {
        return JSON.parse(settingsStr);
      }
    } catch (error) {
      console.error('Error getting security settings:', error);
    }

    // Return default settings
    return {
      biometricEnabled: false,
      pinEnabled: false,
      autoLockEnabled: true,
      autoLockTimeout: 5, // 5 minutes
      sessionTimeout: 30, // 30 minutes
      encryptionEnabled: true,
      auditLogging: true
    };
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
    try {
      const currentSettings = await this.getSecuritySettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(
        this.SECURITY_SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );

      // Apply new settings
      await this.applySecuritySettings(updatedSettings);
    } catch (error) {
      console.error('Error updating security settings:', error);
    }
  }

  private async applySecuritySettings(settings: SecuritySettings): Promise<void> {
    // Restart session timer with new timeout
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    await this.startSessionTimer();

    // Restart auto-lock timer with new timeout
    if (settings.autoLockEnabled) {
      await this.resetAutoLockTimer();
    } else if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  // Security event logging
  async logSecurityEvent(
    type: SecurityEvent['type'],
    details: any = {},
    userId?: string
  ): Promise<void> {
    const settings = await this.getSecuritySettings();
    if (!settings.auditLogging) return;

    try {
      const event: SecurityEvent = {
        id: `${Date.now()}_${Math.random()}`,
        type,
        timestamp: Date.now(),
        userId,
        details,
        deviceInfo: await this.getDeviceInfo()
      };

      const eventsStr = await AsyncStorage.getItem(this.SECURITY_EVENTS_KEY);
      const events: SecurityEvent[] = eventsStr ? JSON.parse(eventsStr) : [];
      
      events.push(event);
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      await AsyncStorage.setItem(this.SECURITY_EVENTS_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  async getSecurityEvents(limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const eventsStr = await AsyncStorage.getItem(this.SECURITY_EVENTS_KEY);
      const events: SecurityEvent[] = eventsStr ? JSON.parse(eventsStr) : [];
      
      return events
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  async clearSecurityEvents(): Promise<void> {
    await AsyncStorage.removeItem(this.SECURITY_EVENTS_KEY);
  }

  // Private helper methods
  private async loadSecuritySettings(): Promise<void> {
    const settings = await this.getSecuritySettings();
    await this.applySecuritySettings(settings);
  }

  private async startSessionMonitoring(): Promise<void> {
    await this.startSessionTimer();
  }

  private async startSessionTimer(): Promise<void> {
    const settings = await this.getSecuritySettings();
    const timeout = settings.sessionTimeout * 60 * 1000; // Convert to milliseconds

    this.sessionTimer = setTimeout(async () => {
      await this.endSession();
      // Trigger app logout
    }, timeout);
  }

  private async resetAutoLockTimer(): Promise<void> {
    const settings = await this.getSecuritySettings();
    
    if (!settings.autoLockEnabled) return;

    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
    }

    const timeout = settings.autoLockTimeout * 60 * 1000; // Convert to milliseconds

    this.autoLockTimer = setTimeout(async () => {
      // Trigger app lock screen
      await this.logSecurityEvent('security_violation', { reason: 'auto_lock_timeout' });
    }, timeout);
  }

  private async checkBiometricAvailability(): Promise<void> {
    const isAvailable = await this.isBiometricAvailable();
    if (!isAvailable) {
      const settings = await this.getSecuritySettings();
      if (settings.biometricEnabled) {
        settings.biometricEnabled = false;
        await this.updateSecuritySettings(settings);
      }
    }
  }

  private hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  private async getDeviceId(): Promise<string> {
    // Generate or retrieve device ID
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random()}`;
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private async getDeviceInfo(): Promise<any> {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      deviceId: await this.getDeviceId()
    };
  }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();
