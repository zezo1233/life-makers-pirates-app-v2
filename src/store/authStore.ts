import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  supabase, 
  signInWithEmail, 
  signUpWithEmail, 
  signOut, 
  getCurrentUser,
  insertRecord,
  updateRecord,
  TABLES,
  handleSupabaseError 
} from '../config/supabase';
import { User, AuthState, RegisterForm, UserRole } from '../types';
// Removed workflowReminderService - using perfect notification system now

interface AuthStore extends AuthState {
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      initialize: async () => {
        try {
          set({ isLoading: true });

          // Check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.log('No active session found, proceeding to login screen');
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }

          if (session?.user) {
            // Fetch user profile from database
            const { data: userProfile, error: profileError } = await supabase
              .from(TABLES.USERS)
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.log('No user profile found, proceeding to login screen');
              set({ user: null, isAuthenticated: false, isLoading: false });
              return;
            }

            set({
              user: userProfile,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }

          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              await get().refreshUser();
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, isAuthenticated: false });
            }
          });

        } catch (error) {
          console.log('Auth initialization completed, no active session');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      refreshUser: async () => {
        try {
          const currentUser = await getCurrentUser();
          if (!currentUser) {
            set({ user: null, isAuthenticated: false });
            return;
          }

          const { data: userProfiles, error } = await supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('id', currentUser.id);

          if (error) {
            throw error;
          }

          const userProfile = userProfiles?.[0];
          if (!userProfile) {
            throw new Error('User profile not found');
          }

          set({ user: userProfile, isAuthenticated: true });
        } catch (error) {
          console.error('Refresh user error:', error);
          set({ user: null, isAuthenticated: false });
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const { user: authUser } = await signInWithEmail(email, password);
          
          if (!authUser) {
            throw new Error('Login failed');
          }

          // Fetch user profile
          const { data: userProfiles, error: profileError } = await supabase
            .from(TABLES.USERS)
            .select('*')
            .eq('id', authUser.id);

          if (profileError) {
            throw profileError;
          }

          const userProfile = userProfiles?.[0];
          if (!userProfile) {
            throw new Error('User profile not found');
          }

          set({
            user: userProfile,
            isAuthenticated: true,
            isLoading: false
          });

          // Perfect notification system handles all notifications automatically

        } catch (error) {
          set({ isLoading: false });
          throw new Error(handleSupabaseError(error));
        }
      },

      register: async (data: RegisterForm) => {
        try {
          set({ isLoading: true });

          // Create auth user
          const { user: authUser } = await signUpWithEmail(
            data.email, 
            data.password,
            {
              full_name: data.full_name,
              role: data.role,
              province: data.province,
            }
          );

          if (!authUser) {
            throw new Error('Registration failed');
          }

          // Create user profile in database
          const userProfile: Omit<User, 'id' | 'created_at' | 'updated_at'> = {
            email: data.email,
            full_name: data.full_name,
            role: data.role,
            province: data.province,
            phone: data.phone,
            specialization: data.specialization,
            is_active: true,
            rating: 0,
            total_training_hours: 0,
          };

          const createdUser = await insertRecord(TABLES.USERS, {
            id: authUser.id,
            ...userProfile,
          });

          set({ 
            user: createdUser, 
            isAuthenticated: true, 
            isLoading: false 
          });

        } catch (error) {
          set({ isLoading: false });
          throw new Error(handleSupabaseError(error));
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });

          // Perfect notification system cleanup is handled automatically

          await signOut();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw new Error(handleSupabaseError(error));
        }
      },

      updateProfile: async (profileData: Partial<User>) => {
        try {
          const { user } = get();
          if (!user) {
            throw new Error('No user logged in');
          }

          set({ isLoading: true });

          const updatedUser = await updateRecord(
            TABLES.USERS, 
            user.id, 
            profileData
          );

          set({ 
            user: { ...user, ...updatedUser }, 
            isLoading: false 
          });

        } catch (error) {
          set({ isLoading: false });
          throw new Error(handleSupabaseError(error));
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper functions for role-based access control
export const hasRole = (user: User | null, roles: UserRole[]): boolean => {
  return user ? roles.includes(user.role) : false;
};

export const canApproveTraining = (user: User | null): boolean => {
  return hasRole(user, [
    UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
    UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
    UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
    UserRole.PROGRAM_SUPERVISOR,
  ]);
};

export const canCreateTrainingRequest = (user: User | null): boolean => {
  return hasRole(user, [
    UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,    // DV - مسؤول تنمية المحافظة
    UserRole.TRAINER_PREPARATION_PROJECT_MANAGER, // PM - مسؤول مشروع إعداد المدربين
  ]);
};

export const canViewAllRequests = (user: User | null): boolean => {
  return hasRole(user, [
    UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
    UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
    UserRole.TRAINER_PREPARATION_PROJECT_MANAGER,
    UserRole.BOARD_MEMBER,
  ]);
};

export const getRoleDisplayName = (role: UserRole, language: 'ar' | 'en' = 'en'): string => {
  const roleNames = {
    [UserRole.PROVINCIAL_DEVELOPMENT_OFFICER]: {
      ar: 'مسؤول تنمية المحافظة',
      en: 'Provincial Development Officer'
    },
    [UserRole.DEVELOPMENT_MANAGEMENT_OFFICER]: {
      ar: 'مسؤول إدارة التنمية',
      en: 'Development Management Officer'
    },
    [UserRole.TRAINER_PREPARATION_PROJECT_MANAGER]: {
      ar: 'مسؤول مشروع إعداد المدربين',
      en: 'Trainer Preparation Project Manager'
    },
    [UserRole.PROGRAM_SUPERVISOR]: {
      ar: 'المتابع',
      en: 'Program Supervisor'
    },
    [UserRole.TRAINER]: {
      ar: 'المدرب',
      en: 'Trainer'
    },
    [UserRole.BOARD_MEMBER]: {
      ar: 'عضو مجلس الإدارة',
      en: 'Board Member'
    },
  };

  return roleNames[role][language];
};
