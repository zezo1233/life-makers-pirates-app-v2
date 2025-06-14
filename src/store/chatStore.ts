import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { ChatRoom, ChatMessage, User } from '../types';
import { useAuthStore } from './authStore';

interface ChatState {
  chatRooms: ChatRoom[];
  messages: { [roomId: string]: ChatMessage[] };
  activeUsers: { [userId: string]: boolean };
  isLoading: boolean;
  error: string | null;
  
  // Chat room methods
  fetchChatRooms: () => Promise<void>;
  createChatRoom: (name: string, type: 'direct' | 'group', participants: string[]) => Promise<ChatRoom>;
  deleteChatRoom: (roomId: string) => Promise<void>;
  
  // Message methods
  fetchMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string, messageType?: 'text' | 'image' | 'file', fileUrl?: string) => Promise<void>;
  markMessagesAsRead: (roomId: string) => Promise<void>;
  
  // Real-time subscriptions
  subscribeToRooms: () => () => void;
  subscribeToMessages: (roomId: string) => () => void;
  subscribeToUserStatus: () => () => void;
  
  // Utility methods
  getOrCreateDirectChat: (participantId: string) => Promise<ChatRoom>;
  getUnreadCount: (roomId: string) => number;
  getTotalUnreadCount: () => number;
  
  // Clear methods
  clearError: () => void;
  clearMessages: (roomId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  chatRooms: [],
  messages: {},
  activeUsers: {},
  isLoading: false,
  error: null,

  fetchChatRooms: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // Fetch chat rooms where user is a participant
      const { data: rooms, error } = await supabase
        .from(TABLES.CHAT_ROOMS)
        .select(`
          *,
          last_message:chat_messages(
            id,
            content,
            message_type,
            created_at,
            sender:users!chat_messages_sender_id_fkey(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process rooms to get the latest message for each
      const processedRooms = rooms?.map(room => ({
        ...room,
        last_message: room.last_message?.[0] || null
      })) || [];

      set({ chatRooms: processedRooms, isLoading: false });
    } catch (error) {
      console.error('Fetch chat rooms error:', error);
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  createChatRoom: async (name, type, participants) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // Add current user to participants if not already included
      const allParticipants = participants.includes(user.id) 
        ? participants 
        : [...participants, user.id];

      const roomData = {
        name,
        type,
        participants: allParticipants,
        created_by: user.id,
      };

      const newRoom = await insertRecord(TABLES.CHAT_ROOMS, roomData);

      set(state => ({
        chatRooms: [newRoom, ...state.chatRooms],
        isLoading: false
      }));

      return newRoom;
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      throw error;
    }
  },

  deleteChatRoom: async (roomId) => {
    try {
      set({ isLoading: true, error: null });
      
      await deleteRecord(TABLES.CHAT_ROOMS, roomId);

      set(state => ({
        chatRooms: state.chatRooms.filter(room => room.id !== roomId),
        messages: { ...state.messages, [roomId]: undefined },
        isLoading: false
      }));
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      throw error;
    }
  },

  fetchMessages: async (roomId) => {
    try {
      set({ isLoading: true, error: null });

      const { data: messages, error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Deduplicate messages by ID to prevent duplicate key errors
      const uniqueMessages = messages ?
        messages.filter((message, index, self) =>
          index === self.findIndex(m => m.id === message.id)
        ) : [];

      set(state => ({
        messages: {
          ...state.messages,
          [roomId]: uniqueMessages
        },
        isLoading: false
      }));
    } catch (error) {
      console.error('Fetch messages error:', error);
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  sendMessage: async (roomId, content, messageType = 'text', fileUrl) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const messageData = {
        sender_id: user.id,
        chat_room_id: roomId,
        content,
        message_type: messageType,
        file_url: fileUrl,
      };

      await insertRecord(TABLES.CHAT_MESSAGES, messageData);

      // Update room's updated_at timestamp
      await updateRecord(TABLES.CHAT_ROOMS, roomId, {
        updated_at: new Date().toISOString()
      });

      // Don't add message to local state here - let the real-time subscription handle it
      // This prevents duplicate messages when the subscription triggers

    } catch (error) {
      console.error('Send message error:', error);
      set({ error: handleSupabaseError(error) });
      throw error;
    }
  },

  markMessagesAsRead: async (roomId) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      const { error } = await supabase
        .from(TABLES.CHAT_MESSAGES)
        .update({ is_read: true })
        .eq('chat_room_id', roomId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      set(state => ({
        messages: {
          ...state.messages,
          [roomId]: state.messages[roomId]?.map(msg => 
            msg.sender_id !== user.id ? { ...msg, is_read: true } : msg
          ) || []
        }
      }));
    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  },

  getOrCreateDirectChat: async (participantId) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      // Check if direct chat already exists
      const existingRoom = get().chatRooms.find(room => 
        room.type === 'direct' && 
        room.participants.includes(participantId) && 
        room.participants.includes(user.id) &&
        room.participants.length === 2
      );

      if (existingRoom) {
        return existingRoom;
      }

      // Get participant info for room name
      const { data: participants, error: participantError } = await supabase
        .from(TABLES.USERS)
        .select('full_name')
        .eq('id', participantId);

      if (participantError) {
        console.error('Error fetching participant:', participantError);
      }

      const participant = participants?.[0];
      const roomName = participant?.full_name || 'Direct Chat';

      // Create new direct chat
      return await get().createChatRoom(roomName, 'direct', [participantId]);
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  getUnreadCount: (roomId) => {
    const { user } = useAuthStore.getState();
    if (!user) return 0;

    const messages = get().messages[roomId] || [];
    return messages.filter(msg => 
      msg.sender_id !== user.id && !msg.is_read
    ).length;
  },

  getTotalUnreadCount: () => {
    const { chatRooms } = get();
    return chatRooms.reduce((total, room) => 
      total + get().getUnreadCount(room.id), 0
    );
  },

  subscribeToRooms: () => {
    const { user } = useAuthStore.getState();
    if (!user) return () => {};

    const subscription = supabase
      .channel('chat_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.CHAT_ROOMS,
        },
        (payload) => {
          console.log('Chat room change:', payload);
          get().fetchChatRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  subscribeToMessages: (roomId) => {
    const subscription = supabase
      .channel(`messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.CHAT_MESSAGES,
          filter: `chat_room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('New message:', payload);

          // Get the new message with sender information
          const { data: messages, error } = await supabase
            .from(TABLES.CHAT_MESSAGES)
            .select(`
              *,
              sender:users!chat_messages_sender_id_fkey(
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id);

          if (error) {
            console.error('Error fetching new message:', error);
            return;
          }

          const newMessage = messages?.[0];
          if (!newMessage) {
            console.error('New message not found');
            return;
          }

          // Add the new message to local state, avoiding duplicates
          set(state => {
            const currentMessages = state.messages[roomId] || [];
            const messageExists = currentMessages.some(msg => msg.id === newMessage.id);

            if (messageExists) {
              return state; // Don't add duplicate
            }

            return {
              messages: {
                ...state.messages,
                [roomId]: [...currentMessages, newMessage]
              }
            };
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },

  subscribeToUserStatus: () => {
    // This would typically connect to a presence system
    // For now, we'll implement a basic version
    return () => {};
  },

  clearError: () => {
    set({ error: null });
  },

  clearMessages: (roomId) => {
    set(state => ({
      messages: { ...state.messages, [roomId]: [] }
    }));
  },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        chatRooms: state.chatRooms,
        messages: state.messages,
      }),
    }
  )
);
