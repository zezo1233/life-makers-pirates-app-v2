import { InteractionManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Performance monitoring and optimization utilities
export class PerformanceManager {
  private static instance: PerformanceManager;
  private metrics: Map<string, number> = new Map();
  private memoryWarnings: number = 0;

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  // Measure operation performance
  startMeasure(operationName: string): void {
    this.metrics.set(operationName, Date.now());
  }

  endMeasure(operationName: string): number {
    const startTime = this.metrics.get(operationName);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.metrics.delete(operationName);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
    }
    
    return duration;
  }

  // Optimize heavy operations
  runAfterInteractions<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Memory management
  clearCache(): void {
    // Clear image cache
    if (Platform.OS === 'ios') {
      // iOS specific cache clearing
    } else {
      // Android specific cache clearing
    }
  }

  // Monitor memory usage
  onMemoryWarning(): void {
    this.memoryWarnings++;
    console.warn(`Memory warning #${this.memoryWarnings}`);
    
    // Clear caches when memory is low
    this.clearCache();
    
    // Clear old data from AsyncStorage
    this.clearOldStorageData();
  }

  private async clearOldStorageData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const oldKeys = keys.filter(key => 
        key.startsWith('cache_') && 
        this.isOldCacheKey(key)
      );
      
      if (oldKeys.length > 0) {
        await AsyncStorage.multiRemove(oldKeys);
        console.log(`Cleared ${oldKeys.length} old cache entries`);
      }
    } catch (error) {
      console.error('Error clearing old storage data:', error);
    }
  }

  private isOldCacheKey(key: string): boolean {
    // Check if cache key is older than 24 hours
    const timestamp = key.split('_').pop();
    if (!timestamp) return true;
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return (now - cacheTime) > twentyFourHours;
  }

  // Get performance metrics
  getMetrics(): Record<string, any> {
    return {
      memoryWarnings: this.memoryWarnings,
      activeOperations: this.metrics.size,
      platform: Platform.OS,
      version: Platform.Version,
    };
  }
}

// Image optimization utilities
export class ImageOptimizer {
  static getOptimizedImageUri(uri: string, width: number, height: number): string {
    if (!uri) return '';
    
    // For local images, return as-is
    if (uri.startsWith('file://') || uri.startsWith('asset://')) {
      return uri;
    }
    
    // For remote images, add optimization parameters
    if (uri.includes('supabase')) {
      return `${uri}?width=${width}&height=${height}&quality=80&format=webp`;
    }
    
    return uri;
  }

  static preloadImages(uris: string[]): Promise<void[]> {
    const promises = uris.map(uri => {
      return new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve(); // Don't fail on error
        image.src = uri;
      });
    });
    
    return Promise.all(promises);
  }
}

// Network optimization
export class NetworkOptimizer {
  private static requestQueue: Map<string, Promise<any>> = new Map();
  
  // Deduplicate identical requests
  static async deduplicateRequest<T>(
    key: string, 
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key) as Promise<T>;
    }
    
    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });
    
    this.requestQueue.set(key, promise);
    return promise;
  }

  // Batch multiple requests
  static batchRequests<T>(
    requests: Array<() => Promise<T>>,
    batchSize: number = 5
  ): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.reduce(async (acc, batch) => {
      const results = await acc;
      const batchResults = await Promise.all(batch.map(req => req()));
      return [...results, ...batchResults];
    }, Promise.resolve([] as T[]));
  }

  // Retry failed requests with exponential backoff
  static async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Storage optimization
export class StorageOptimizer {
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB
  
  static async optimizeStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      const items: Array<{key: string, size: number, timestamp: number}> = [];
      
      // Calculate storage usage
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          
          // Extract timestamp from key or use current time
          const timestamp = this.extractTimestamp(key) || Date.now();
          items.push({ key, size, timestamp });
        }
      }
      
      // If storage is over limit, remove oldest items
      if (totalSize > this.MAX_STORAGE_SIZE) {
        items.sort((a, b) => a.timestamp - b.timestamp);
        
        let removedSize = 0;
        const keysToRemove: string[] = [];
        
        for (const item of items) {
          keysToRemove.push(item.key);
          removedSize += item.size;
          
          if (totalSize - removedSize <= this.MAX_STORAGE_SIZE * 0.8) {
            break;
          }
        }
        
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`Removed ${keysToRemove.length} items (${removedSize} bytes) from storage`);
      }
    } catch (error) {
      console.error('Error optimizing storage:', error);
    }
  }
  
  private static extractTimestamp(key: string): number | null {
    const match = key.match(/_(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }
  
  // Store data with automatic expiration
  static async setWithExpiration(
    key: string, 
    value: any, 
    expirationMs: number = 24 * 60 * 60 * 1000 // 24 hours
  ): Promise<void> {
    const item = {
      value,
      timestamp: Date.now(),
      expiration: Date.now() + expirationMs
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(item));
  }
  
  static async getWithExpiration(key: string): Promise<any | null> {
    try {
      const itemStr = await AsyncStorage.getItem(key);
      if (!itemStr) return null;
      
      const item = JSON.parse(itemStr);
      
      // Check if expired
      if (Date.now() > item.expiration) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('Error getting item with expiration:', error);
      return null;
    }
  }
}

// Export performance manager instance
export const performanceManager = PerformanceManager.getInstance();
