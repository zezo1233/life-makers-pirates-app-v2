import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dkijutqfdhaviyymulvs.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraWp1dHFmZGhhdml5eW11bHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTI5MTIsImV4cCI6MjA2NTAyODkxMn0.822_M3TXP6RZWBf0YtZHh9jtFhlUojSj5UozM2ty2Kc';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  TRAINING_REQUESTS: 'training_requests',
  TRAINER_APPLICATIONS: 'trainer_applications',
  APPROVAL_STEPS: 'approval_steps',
  TRAINER_AVAILABILITY: 'trainer_availability',
  CALENDAR_EVENTS: 'calendar_events',
  CHAT_ROOMS: 'chat_rooms',
  CHAT_MESSAGES: 'chat_messages',
  NOTIFICATIONS: 'notifications',
  USER_PROFILES: 'user_profiles',
} as const;

// Real-time subscriptions
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const subscription = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      callback
    )
    .subscribe();

  return subscription;
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error);
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error_description) {
    return error.error_description;
  }
  
  return 'An unexpected error occurred';
};

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, metadata?: any) => {
  try {
    // Step 1: Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw error;

    // Step 2: If auth user created successfully, create profile manually
    if (data.user && !data.user.email_confirmed_at) {
      // For development, we'll create the profile manually
      try {
        await createUserProfile(data.user.id, email, metadata);
      } catch (profileError) {
        console.warn('Profile creation failed, but auth user created:', profileError);
      }
    }

    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

// Helper function to create user profile manually
export const createUserProfile = async (userId: string, email: string, metadata?: any) => {
  const { data: results, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email,
      full_name: metadata?.full_name || 'مستخدم جديد',
      role: metadata?.role || 'TR',
      province: metadata?.province || 'cairo',
      specialization: metadata?.specialization || null,
      phone: metadata?.phone || null,
    })
    .select();

  if (error) {
    console.error('Profile creation error:', error);
    throw error;
  }

  const data = results?.[0];
  if (!data) {
    throw new Error('Failed to create user profile');
  }

  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

// Database helpers
export const insertRecord = async (table: string, data: any) => {
  const { data: results, error } = await supabase
    .from(table)
    .insert(data)
    .select();

  if (error) throw error;

  const result = results?.[0];
  if (!result) {
    throw new Error('Failed to insert record');
  }

  return result;
};

export const updateRecord = async (table: string, id: string, data: any) => {
  const { data: results, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select();

  if (error) throw error;

  const result = results?.[0];
  if (!result) {
    throw new Error(`No record found with id: ${id}`);
  }

  return result;
};

export const deleteRecord = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const fetchRecords = async (
  table: string,
  options?: {
    select?: string;
    filter?: any;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
) => {
  let query = supabase.from(table).select(options?.select || '*');

  if (options?.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  if (options?.order) {
    query = query.order(options.order.column, {
      ascending: options.order.ascending ?? true
    });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// File upload helpers
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { cacheControl?: string; upsert?: boolean }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);
  
  if (error) throw error;
  return data;
};

export const getFileUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
};

// Realtime helpers
export const subscribeToUserChanges = (userId: string, callback: (payload: any) => void) => {
  return subscribeToTable('users', callback, `id=eq.${userId}`);
};

export const subscribeToTrainingRequests = (callback: (payload: any) => void) => {
  return subscribeToTable('training_requests', callback);
};

export const subscribeToChatMessages = (roomId: string, callback: (payload: any) => void) => {
  return subscribeToTable('chat_messages', callback, `chat_room_id=eq.${roomId}`);
};

export default supabase;


