// Core Types for Life Makers Pirates Training Management App
import { NavigatorScreenParams } from '@react-navigation/native';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  province: string;
  specialization?: string;
  phone?: string;
  avatar_url?: string;
  rating?: number;
  total_training_hours?: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export enum UserRole {
  PROVINCIAL_DEVELOPMENT_OFFICER = 'DV', // مسؤول تنمية المحافظة
  DEVELOPMENT_MANAGEMENT_OFFICER = 'CC', // مسؤول إدارة التنمية
  TRAINER_PREPARATION_PROJECT_MANAGER = 'PM', // مسؤول مشروع إعداد المدربين
  PROGRAM_SUPERVISOR = 'SV', // المتابع
  TRAINER = 'TR', // المدرب
  BOARD_MEMBER = 'MB', // عضو مجلس الإدارة
}

export interface TrainingRequest {
  id: string;
  title: string;
  description: string;
  specialization: string;
  province: string;
  requested_date: string;
  duration_hours: number;
  max_participants: number;
  status: TrainingStatus;
  requester_id: string;
  assigned_trainer_id?: string;
  approval_history: ApprovalStep[];
  created_at: string;
  updated_at: string;
  // Relations from Supabase joins
  requester?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    province: string;
  };
  assigned_trainer?: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
    rating: number;
  };
  // Trainer applications
  trainer_applications?: TrainerApplication[];
}

export interface TrainerApplication {
  id: string;
  training_request_id: string;
  trainer_id: string;
  application_message?: string;
  status: 'pending' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  trainer?: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
    rating?: number;
    province: string;
  };
  reviewer?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export enum TrainingStatus {
  UNDER_REVIEW = 'under_review',
  CC_APPROVED = 'cc_approved',
  PM_APPROVED = 'pm_approved',
  TR_ASSIGNED = 'tr_assigned',
  SV_APPROVED = 'sv_approved',
  FINAL_APPROVED = 'final_approved',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export interface ApprovalStep {
  id: string;
  training_request_id: string;
  approver_id: string;
  approver_role: UserRole;
  status: 'approved' | 'rejected' | 'pending';
  comments?: string;
  created_at: string;
}

export interface TrainingFeedback {
  id: string;
  training_request_id: string;
  submitted_by: string;
  feedback_text: string;
  rating: number;
  drive_file_url?: string;
  attachments?: string[];
  created_at: string;
}

export interface TrainingCancellation {
  id: string;
  training_request_id: string;
  cancelled_by: string;
  cancellation_reason: string;
  created_at: string;
}

export interface TrainerAvailability {
  id: string;
  trainer_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location: string;
  training_request_id?: string;
  attendees?: string[];
  color?: string;
  type: 'training' | 'meeting' | 'availability' | 'other';
  max_attendees?: number;
  is_recurring?: boolean;
  recurring_pattern?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id?: string;
  chat_room_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  created_at: string;
  is_read: boolean;
  // Relations from Supabase joins
  sender?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group';
  participants: string[];
  last_message?: ChatMessage;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'training_request' | 'approval' | 'chat' | 'system';
  data?: any;
  is_read: boolean;
  created_at: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Requests: NavigatorScreenParams<RequestsStackParamList>;
  Chat: NavigatorScreenParams<ChatStackParamList>;
  Analytics: undefined;
  Profile: undefined;
};

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

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string };
  CreateChat: undefined;
  RestrictedChat: undefined;
  AIChat: undefined;
  FeedbackAnalysis: undefined;
};

export type CalendarStackParamList = {
  CalendarView: undefined;
  EventDetails: { eventId: string };
  CreateEvent: undefined;
  TrainerAvailability: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  role: UserRole;
  province: string;
  phone?: string;
}

export interface TrainingRequestForm {
  title: string;
  description: string;
  specialization: string;
  province: string;
  requested_date: string;
  duration_hours: number;
  max_participants: number;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    body: TextStyle;
    caption: TextStyle;
  };
}

interface TextStyle {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
}

// Store Types (Zustand)
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export interface CalendarState {
  events: CalendarEvent[];
  selectedDate: string;
  isLoading: boolean;
  fetchEvents: (startDate: string, endDate: string) => Promise<void>;
  createEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export interface TrainingState {
  requests: TrainingRequest[];
  isLoading: boolean;
  fetchRequests: () => Promise<void>;
  createRequest: (request: TrainingRequestForm) => Promise<void>;
  updateRequest: (id: string, request: Partial<TrainingRequest>) => Promise<void>;
  approveRequest: (id: string, comments?: string) => Promise<void>;
  rejectRequest: (id: string, comments: string) => Promise<void>;
}
