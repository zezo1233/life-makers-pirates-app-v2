import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from '../config/supabase';

interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'contains';
  value: any;
}

interface SearchOptions {
  query?: string;
  filters?: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  fuzzy?: boolean;
  includeArchived?: boolean;
}

interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  searchTime: number;
  suggestions?: string[];
}

interface SearchHistory {
  query: string;
  timestamp: number;
  resultCount: number;
}

export class SearchService {
  private static instance: SearchService;
  private readonly SEARCH_HISTORY_KEY = 'search_history';
  private readonly MAX_HISTORY_ITEMS = 50;
  private readonly SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private searchCache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Search training requests
  async searchTrainingRequests(options: SearchOptions): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('training_requests', options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        searchTime: Date.now() - startTime
      };
    }

    try {
      let query = supabase
        .from(TABLES.TRAINING_REQUESTS)
        .select(`
          *,
          requester:requester_id(id, full_name, email, role, province),
          assigned_trainer:assigned_trainer_id(id, full_name, email, specialization)
        `, { count: 'exact' });

      // Apply text search
      if (options.query) {
        const searchQuery = options.fuzzy 
          ? `%${options.query}%` 
          : options.query;
        
        query = query.or(`
          title.ilike.${searchQuery},
          description.ilike.${searchQuery},
          province.ilike.${searchQuery},
          specialization.ilike.${searchQuery}
        `);
      }

      // Apply filters
      if (options.filters) {
        for (const filter of options.filters) {
          query = this.applyFilter(query, filter);
        }
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: SearchResult<any> = {
        items: data || [],
        total: count || 0,
        hasMore: (options.offset || 0) + (data?.length || 0) < (count || 0),
        searchTime: Date.now() - startTime,
        suggestions: await this.generateSuggestions(options.query || '')
      };

      // Cache the result
      this.setCache(cacheKey, result);

      // Save to search history
      if (options.query) {
        await this.saveSearchHistory(options.query, data?.length || 0);
      }

      return result;
    } catch (error) {
      console.error('Error searching training requests:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(options: SearchOptions): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('users', options);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        searchTime: Date.now() - startTime
      };
    }

    try {
      let query = supabase
        .from(TABLES.USERS)
        .select('*', { count: 'exact' });

      // Apply text search
      if (options.query) {
        const searchQuery = options.fuzzy 
          ? `%${options.query}%` 
          : options.query;
        
        query = query.or(`
          full_name.ilike.${searchQuery},
          email.ilike.${searchQuery},
          role.ilike.${searchQuery},
          province.ilike.${searchQuery}
        `);
      }

      // Apply filters
      if (options.filters) {
        for (const filter of options.filters) {
          query = this.applyFilter(query, filter);
        }
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('full_name', { ascending: true });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: SearchResult<any> = {
        items: data || [],
        total: count || 0,
        hasMore: (options.offset || 0) + (data?.length || 0) < (count || 0),
        searchTime: Date.now() - startTime,
        suggestions: await this.generateSuggestions(options.query || '')
      };

      this.setCache(cacheKey, result);

      if (options.query) {
        await this.saveSearchHistory(options.query, data?.length || 0);
      }

      return result;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Search notifications
  async searchNotifications(options: SearchOptions): Promise<SearchResult<any>> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('notifications', options);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        searchTime: Date.now() - startTime
      };
    }

    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' });

      // Apply text search
      if (options.query) {
        const searchQuery = options.fuzzy 
          ? `%${options.query}%` 
          : options.query;
        
        query = query.or(`
          title.ilike.${searchQuery},
          message.ilike.${searchQuery},
          type.ilike.${searchQuery}
        `);
      }

      // Apply filters
      if (options.filters) {
        for (const filter of options.filters) {
          query = this.applyFilter(query, filter);
        }
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: SearchResult<any> = {
        items: data || [],
        total: count || 0,
        hasMore: (options.offset || 0) + (data?.length || 0) < (count || 0),
        searchTime: Date.now() - startTime
      };

      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error searching notifications:', error);
      throw error;
    }
  }

  // Global search across multiple tables
  async globalSearch(query: string, limit: number = 20): Promise<{
    trainingRequests: any[];
    users: any[];
    notifications: any[];
    total: number;
  }> {
    const searchOptions: SearchOptions = {
      query,
      limit: Math.ceil(limit / 3),
      fuzzy: true
    };

    const [trainingRequests, users, notifications] = await Promise.all([
      this.searchTrainingRequests(searchOptions),
      this.searchUsers(searchOptions),
      this.searchNotifications(searchOptions)
    ]);

    return {
      trainingRequests: trainingRequests.items,
      users: users.items,
      notifications: notifications.items,
      total: trainingRequests.total + users.total + notifications.total
    };
  }

  // Apply filter to query
  private applyFilter(query: any, filter: SearchFilter): any {
    switch (filter.operator) {
      case 'eq':
        return query.eq(filter.field, filter.value);
      case 'neq':
        return query.neq(filter.field, filter.value);
      case 'gt':
        return query.gt(filter.field, filter.value);
      case 'gte':
        return query.gte(filter.field, filter.value);
      case 'lt':
        return query.lt(filter.field, filter.value);
      case 'lte':
        return query.lte(filter.field, filter.value);
      case 'like':
        return query.like(filter.field, filter.value);
      case 'ilike':
        return query.ilike(filter.field, filter.value);
      case 'in':
        return query.in(filter.field, filter.value);
      case 'contains':
        return query.contains(filter.field, filter.value);
      default:
        return query;
    }
  }

  // Generate cache key
  private generateCacheKey(table: string, options: SearchOptions): string {
    return `search_${table}_${JSON.stringify(options)}`;
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.searchCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.SEARCH_CACHE_TTL) {
      this.searchCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (this.searchCache.size > 100) {
      const oldestKey = Array.from(this.searchCache.keys())[0];
      this.searchCache.delete(oldestKey);
    }
  }

  // Search history management
  async getSearchHistory(): Promise<SearchHistory[]> {
    try {
      const historyStr = await AsyncStorage.getItem(this.SEARCH_HISTORY_KEY);
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  async saveSearchHistory(query: string, resultCount: number): Promise<void> {
    try {
      const history = await this.getSearchHistory();
      
      // Remove duplicate
      const filtered = history.filter(item => item.query !== query);
      
      // Add new search
      filtered.unshift({
        query,
        timestamp: Date.now(),
        resultCount
      });
      
      // Limit history size
      const limited = filtered.slice(0, this.MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(this.SEARCH_HISTORY_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  // Generate search suggestions
  private async generateSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];
    
    const history = await this.getSearchHistory();
    const suggestions = history
      .filter(item => 
        item.query.toLowerCase().includes(query.toLowerCase()) &&
        item.query !== query
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(item => item.query);
    
    return suggestions;
  }

  // Get popular searches
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    const history = await this.getSearchHistory();
    const queryCount: Record<string, number> = {};
    
    history.forEach(item => {
      queryCount[item.query] = (queryCount[item.query] || 0) + 1;
    });
    
    return Object.entries(queryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([query]) => query);
  }

  // Clear cache
  clearCache(): void {
    this.searchCache.clear();
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
