import { create } from 'zustand';
import { supabase, TABLES, handleSupabaseError } from '../config/supabase';
import { User, UserRole } from '../types';

interface UserManagementState {
  users: User[];
  isLoading: boolean;
  error: string | null;
}

interface UserManagementActions {
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
  updateUserSpecialization: (userId: string, specializations: string[]) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  getUsersByRole: (role: UserRole) => User[];
  getUsersBySpecialization: (specialization: string) => User[];
  clearError: () => void;
}

interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  province: string;
  phone?: string;
}

interface UserFilters {
  role?: UserRole;
  specialization?: string;
  province?: string;
  isActive?: boolean;
  searchTerm?: string;
}

type UserManagementStore = UserManagementState & UserManagementActions;

export const useUserManagementStore = create<UserManagementStore>((set, get) => ({
  // State
  users: [],
  isLoading: false,
  error: null,

  // Actions
  fetchUsers: async (filters?: UserFilters) => {
    try {
      set({ isLoading: true, error: null });

      let query = supabase
        .from(TABLES.USERS)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.specialization) {
        query = query.eq('specialization', filters.specialization);
      }
      if (filters?.province) {
        query = query.eq('province', filters.province);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.searchTerm) {
        query = query.or(`full_name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set({ users: data || [], isLoading: false });
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateUser: async (userId: string, updates: Partial<User>) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      const currentUsers = get().users;
      const updatedUsers = currentUsers.map(user => 
        user.id === userId ? { ...user, ...data } : user
      );
      
      set({ users: updatedUsers, isLoading: false });
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deactivateUser: async (userId: string) => {
    try {
      await get().updateUser(userId, { is_active: false });
    } catch (error) {
      throw error;
    }
  },

  activateUser: async (userId: string) => {
    try {
      await get().updateUser(userId, { is_active: true });
    } catch (error) {
      throw error;
    }
  },

  updateUserSpecialization: async (userId: string, specializations: string[]) => {
    try {
      await get().updateUser(userId, { specialization: specializations });
    } catch (error) {
      throw error;
    }
  },

  updateUserRole: async (userId: string, role: UserRole) => {
    try {
      await get().updateUser(userId, { role });
    } catch (error) {
      throw error;
    }
  },

  createUser: async (userData: CreateUserData) => {
    try {
      set({ isLoading: true, error: null });

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Create user profile in database
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .insert({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          province: userData.province,

          phone: userData.phone,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      const currentUsers = get().users;
      set({ users: [data, ...currentUsers], isLoading: false });
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  deleteUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Delete user from database (this will cascade to auth via RLS policies)
      const { error } = await supabase
        .from(TABLES.USERS)
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Update local state
      const currentUsers = get().users;
      const updatedUsers = currentUsers.filter(user => user.id !== userId);

      set({ users: updatedUsers, isLoading: false });
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getUsersByRole: (role: UserRole) => {
    return get().users.filter(user => user.role === role);
  },

  getUsersBySpecialization: (specialization: string) => {
    return get().users.filter(user => user.specialization?.includes(specialization));
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Helper functions for role-based access
export const canManageUsers = (userRole: UserRole): boolean => {
  return userRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER;
};

export const canEditUserRole = (managerRole: UserRole): boolean => {
  // PM can manage all user roles
  return managerRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER;
};

export const getManageableRoles = (managerRole: UserRole): UserRole[] => {
  if (managerRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER) {
    return [
      UserRole.PROVINCIAL_DEVELOPMENT_OFFICER,
      UserRole.DEVELOPMENT_MANAGEMENT_OFFICER,
      UserRole.PROGRAM_SUPERVISOR,
      UserRole.TRAINER,
      UserRole.BOARD_MEMBER,
    ];
  }
  return [];
};

export const canCreateUsers = (userRole: UserRole): boolean => {
  return userRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER;
};

export const canDeleteUsers = (userRole: UserRole): boolean => {
  return userRole === UserRole.TRAINER_PREPARATION_PROJECT_MANAGER;
};
