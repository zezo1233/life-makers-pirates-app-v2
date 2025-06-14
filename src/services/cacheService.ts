import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiration: number;
  version: string;
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  version?: string;
  compress?: boolean;
  encrypt?: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_VERSION = '1.0.0';

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Store data in cache
  async set<T>(
    key: string, 
    data: T, 
    config: CacheConfig = {}
  ): Promise<void> {
    try {
      const {
        ttl = this.DEFAULT_TTL,
        version = this.CACHE_VERSION,
        compress = false,
        encrypt = false
      } = config;

      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiration: Date.now() + ttl,
        version
      };

      let serializedData = JSON.stringify(cacheItem);

      // Compress if requested
      if (compress) {
        serializedData = await this.compress(serializedData);
      }

      // Encrypt if requested
      if (encrypt) {
        serializedData = await this.encrypt(serializedData);
      }

      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.setItem(cacheKey, serializedData);

    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const serializedData = await AsyncStorage.getItem(cacheKey);

      if (!serializedData) {
        return null;
      }

      // Decrypt if needed
      let decryptedData = serializedData;
      if (this.isEncrypted(serializedData)) {
        decryptedData = await this.decrypt(serializedData);
      }

      // Decompress if needed
      if (this.isCompressed(decryptedData)) {
        decryptedData = await this.decompress(decryptedData);
      }

      const cacheItem: CacheItem<T> = JSON.parse(decryptedData);

      // Check expiration
      if (Date.now() > cacheItem.expiration) {
        await this.remove(key);
        return null;
      }

      // Check version compatibility
      if (cacheItem.version !== this.CACHE_VERSION) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data;

    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Remove item from cache
  async remove(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    totalItems: number;
    totalSize: number;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      let totalSize = 0;
      let oldestItem = Date.now();
      let newestItem = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
          
          try {
            const cacheItem = JSON.parse(value);
            if (cacheItem.timestamp < oldestItem) {
              oldestItem = cacheItem.timestamp;
            }
            if (cacheItem.timestamp > newestItem) {
              newestItem = cacheItem.timestamp;
            }
          } catch {
            // Skip invalid cache items
          }
        }
      }

      return {
        totalItems: cacheKeys.length,
        totalSize,
        oldestItem,
        newestItem
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: 0,
        newestItem: 0
      };
    }
  }

  // Clean expired items
  async cleanExpired(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      const expiredKeys: string[] = [];

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const cacheItem = JSON.parse(value);
            if (Date.now() > cacheItem.expiration) {
              expiredKeys.push(key);
            }
          } catch {
            // Remove invalid cache items
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }

      return expiredKeys.length;
    } catch (error) {
      console.error('Cache clean error:', error);
      return 0;
    }
  }

  // Cache with fallback to network
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    // Try cache first
    const cachedData = await this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // Fetch from network
    const freshData = await fetchFn();
    
    // Store in cache
    await this.set(key, freshData, config);
    
    return freshData;
  }

  // Batch operations
  async setMultiple<T>(items: Array<{
    key: string;
    data: T;
    config?: CacheConfig;
  }>): Promise<void> {
    const operations = items.map(item => 
      this.set(item.key, item.data, item.config)
    );
    await Promise.all(operations);
  }

  async getMultiple<T>(keys: string[]): Promise<Array<T | null>> {
    const operations = keys.map(key => this.get<T>(key));
    return Promise.all(operations);
  }

  // Private helper methods
  private getCacheKey(key: string): string {
    return `cache_${key}_${Date.now()}`;
  }

  private async compress(data: string): Promise<string> {
    // Simple compression placeholder
    // In production, use a proper compression library
    return `compressed_${data}`;
  }

  private async decompress(data: string): Promise<string> {
    // Simple decompression placeholder
    if (data.startsWith('compressed_')) {
      return data.substring(11);
    }
    return data;
  }

  private isCompressed(data: string): boolean {
    return data.startsWith('compressed_');
  }

  private async encrypt(data: string): Promise<string> {
    // Simple encryption placeholder
    // In production, use proper encryption
    return `encrypted_${data}`;
  }

  private async decrypt(data: string): Promise<string> {
    // Simple decryption placeholder
    if (data.startsWith('encrypted_')) {
      return data.substring(10);
    }
    return data;
  }

  private isEncrypted(data: string): boolean {
    return data.startsWith('encrypted_');
  }
}

// Specialized cache services
export class TrainingRequestCache {
  private cache = CacheService.getInstance();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  async getRequests(userId: string): Promise<any[] | null> {
    return this.cache.get(`training_requests_${userId}`);
  }

  async setRequests(userId: string, requests: any[]): Promise<void> {
    await this.cache.set(`training_requests_${userId}`, requests, {
      ttl: this.CACHE_TTL
    });
  }

  async invalidateUserRequests(userId: string): Promise<void> {
    await this.cache.remove(`training_requests_${userId}`);
  }
}

export class UserCache {
  private cache = CacheService.getInstance();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  async getUser(userId: string): Promise<any | null> {
    return this.cache.get(`user_${userId}`);
  }

  async setUser(userId: string, user: any): Promise<void> {
    await this.cache.set(`user_${userId}`, user, {
      ttl: this.CACHE_TTL
    });
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.cache.remove(`user_${userId}`);
  }
}

export class NotificationCache {
  private cache = CacheService.getInstance();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getNotifications(userId: string): Promise<any[] | null> {
    return this.cache.get(`notifications_${userId}`);
  }

  async setNotifications(userId: string, notifications: any[]): Promise<void> {
    await this.cache.set(`notifications_${userId}`, notifications, {
      ttl: this.CACHE_TTL
    });
  }

  async invalidateNotifications(userId: string): Promise<void> {
    await this.cache.remove(`notifications_${userId}`);
  }
}

// Export instances
export const cacheService = CacheService.getInstance();
export const trainingRequestCache = new TrainingRequestCache();
export const userCache = new UserCache();
export const notificationCache = new NotificationCache();
