import { create } from 'zustand';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { 
  supabase,
  fetchRecords,
  insertRecord,
  updateRecord,
  deleteRecord,
  subscribeToTable,
  TABLES,
  handleSupabaseError 
} from '../config/supabase';
import { CalendarEvent, CalendarState, TrainerAvailability, UserRole } from '../types';
import { useAuthStore } from './authStore';

interface ExtendedCalendarState extends CalendarState {
  trainerAvailability: TrainerAvailability[];
  selectedEvent: CalendarEvent | null;
  viewMode: 'month' | 'week' | 'day';
  
  // Trainer availability methods
  fetchTrainerAvailability: (trainerId?: string, startDate?: string, endDate?: string) => Promise<void>;
  setTrainerAvailability: (availability: Omit<TrainerAvailability, 'id'>) => Promise<void>;
  updateTrainerAvailability: (id: string, availability: Partial<TrainerAvailability>) => Promise<void>;
  
  // Event management
  setSelectedEvent: (event: CalendarEvent | null) => void;
  setViewMode: (mode: 'month' | 'week' | 'day') => void;
  setSelectedDate: (date: string) => void;
  
  // Real-time subscriptions
  subscribeToEvents: () => () => void;
  subscribeToAvailability: () => () => void;
  
  // Utility methods
  getEventsForDate: (date: string) => CalendarEvent[];
  getAvailableTrainers: (date: string, startTime: string, endTime: string) => Promise<string[]>;
  checkTrainerConflict: (trainerId: string, startDate: string, endDate: string) => Promise<boolean>;
}

export const useCalendarStore = create<ExtendedCalendarState>((set, get) => ({
  events: [],
  trainerAvailability: [],
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  selectedEvent: null,
  viewMode: 'month',
  isLoading: false,

  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  fetchEvents: async (startDate: string, endDate: string) => {
    try {
      set({ isLoading: true });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // Build query based on user role
      let query = supabase
        .from(TABLES.CALENDAR_EVENTS)
        .select(`
          *,
          training_request:training_requests(*)
        `)
        .gte('start_date', startDate)
        .lte('end_date', endDate);

      // Role-based filtering
      switch (user.role) {
        case UserRole.TRAINER:
          // Trainers see only their assigned events
          query = query.contains('attendees', [user.id]);
          break;
        case UserRole.PROGRAM_SUPERVISOR:
          // Supervisors see events in their specialization
          if (user.specialization) {
            query = query.or(`attendees.cs.{${user.id}},training_request.specialization.eq.${user.specialization}`);
          }
          break;
        case UserRole.PROVINCIAL_DEVELOPMENT_OFFICER:
        case UserRole.DEVELOPMENT_MANAGEMENT_OFFICER:
        case UserRole.TRAINER_PREPARATION_PROJECT_MANAGER:
        case UserRole.BOARD_MEMBER:
          // These roles can see all events
          break;
        default:
          // Default: see only events where user is attendee
          query = query.contains('attendees', [user.id]);
      }

      const { data: events, error } = await query.order('start_date', { ascending: true });

      if (error) throw error;

      set({ events: events || [], isLoading: false });
    } catch (error) {
      console.error('Fetch events error:', error);
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  createEvent: async (eventData) => {
    try {
      set({ isLoading: true });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const newEvent = await insertRecord(TABLES.CALENDAR_EVENTS, {
        ...eventData,
        created_by: user.id,
      });

      set(state => ({ 
        events: [...state.events, newEvent],
        isLoading: false 
      }));

    } catch (error) {
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      set({ isLoading: true });

      const updatedEvent = await updateRecord(TABLES.CALENDAR_EVENTS, id, eventData);

      set(state => ({
        events: state.events.map(event => 
          event.id === id ? { ...event, ...updatedEvent } : event
        ),
        selectedEvent: state.selectedEvent?.id === id 
          ? { ...state.selectedEvent, ...updatedEvent } 
          : state.selectedEvent,
        isLoading: false
      }));

    } catch (error) {
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  deleteEvent: async (id) => {
    try {
      set({ isLoading: true });

      await deleteRecord(TABLES.CALENDAR_EVENTS, id);

      set(state => ({
        events: state.events.filter(event => event.id !== id),
        selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
        isLoading: false
      }));

    } catch (error) {
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  fetchTrainerAvailability: async (trainerId, startDate, endDate) => {
    try {
      set({ isLoading: true });

      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // If no trainerId provided, fetch for current user (if trainer)
      const targetTrainerId = trainerId || (user.role === UserRole.TRAINER ? user.id : null);
      
      if (!targetTrainerId) {
        set({ trainerAvailability: [], isLoading: false });
        return;
      }

      let query = supabase
        .from(TABLES.TRAINER_AVAILABILITY)
        .select('*')
        .eq('trainer_id', targetTrainerId);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data: availability, error } = await query.order('date', { ascending: true });

      if (error) throw error;

      set({ trainerAvailability: availability || [], isLoading: false });
    } catch (error) {
      console.error('Fetch trainer availability error:', error);
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  setTrainerAvailability: async (availabilityData) => {
    try {
      set({ isLoading: true });

      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const newAvailability = await insertRecord(TABLES.TRAINER_AVAILABILITY, {
        ...availabilityData,
        trainer_id: availabilityData.trainer_id || user.id,
      });

      set(state => ({
        trainerAvailability: [...state.trainerAvailability, newAvailability],
        isLoading: false
      }));

    } catch (error) {
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  updateTrainerAvailability: async (id, availabilityData) => {
    try {
      set({ isLoading: true });

      const updatedAvailability = await updateRecord(TABLES.TRAINER_AVAILABILITY, id, availabilityData);

      set(state => ({
        trainerAvailability: state.trainerAvailability.map(availability =>
          availability.id === id ? { ...availability, ...updatedAvailability } : availability
        ),
        isLoading: false
      }));

    } catch (error) {
      set({ isLoading: false });
      throw new Error(handleSupabaseError(error));
    }
  },

  getEventsForDate: (date) => {
    const { events } = get();
    return events.filter(event => {
      const eventDate = format(parseISO(event.start_date), 'yyyy-MM-dd');
      return eventDate === date;
    });
  },

  getAvailableTrainers: async (date, startTime, endTime) => {
    try {
      // Fetch all trainers
      const { data: trainers, error: trainersError } = await supabase
        .from(TABLES.USERS)
        .select('id')
        .eq('role', UserRole.TRAINER)
        .eq('is_active', true);

      if (trainersError) throw trainersError;

      // Check availability for each trainer
      const availableTrainers: string[] = [];

      for (const trainer of trainers || []) {
        const isAvailable = await get().checkTrainerConflict(trainer.id, 
          `${date} ${startTime}`, `${date} ${endTime}`);
        
        if (!isAvailable) {
          availableTrainers.push(trainer.id);
        }
      }

      return availableTrainers;
    } catch (error) {
      console.error('Get available trainers error:', error);
      return [];
    }
  },

  checkTrainerConflict: async (trainerId, startDate, endDate) => {
    try {
      // Check for conflicting events
      const { data: conflicts, error } = await supabase
        .from(TABLES.CALENDAR_EVENTS)
        .select('id')
        .contains('attendees', [trainerId])
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
        .limit(1);

      if (error) throw error;

      return (conflicts?.length || 0) > 0;
    } catch (error) {
      console.error('Check trainer conflict error:', error);
      return true; // Assume conflict on error
    }
  },

  subscribeToEvents: () => {
    const subscription = subscribeToTable(TABLES.CALENDAR_EVENTS, (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      set(state => {
        switch (eventType) {
          case 'INSERT':
            return { events: [...state.events, newRecord] };
          case 'UPDATE':
            return {
              events: state.events.map(event =>
                event.id === newRecord.id ? newRecord : event
              )
            };
          case 'DELETE':
            return {
              events: state.events.filter(event => event.id !== oldRecord.id)
            };
          default:
            return state;
        }
      });
    });

    return () => subscription.unsubscribe();
  },

  subscribeToAvailability: () => {
    const { user } = useAuthStore.getState();
    if (!user) return () => {};

    const subscription = subscribeToTable(
      TABLES.TRAINER_AVAILABILITY, 
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        set(state => {
          switch (eventType) {
            case 'INSERT':
              return { trainerAvailability: [...state.trainerAvailability, newRecord] };
            case 'UPDATE':
              return {
                trainerAvailability: state.trainerAvailability.map(availability =>
                  availability.id === newRecord.id ? newRecord : availability
                )
              };
            case 'DELETE':
              return {
                trainerAvailability: state.trainerAvailability.filter(
                  availability => availability.id !== oldRecord.id
                )
              };
            default:
              return state;
          }
        });
      },
      user.role === UserRole.TRAINER ? `trainer_id=eq.${user.id}` : undefined
    );

    return () => subscription.unsubscribe();
  },
}));
