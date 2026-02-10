import { create } from 'zustand';

interface Message {
  id: string;
  roomId: string;
  senderType: 'human' | 'ai';
  senderUserId?: string;
  senderAiModelId?: string;
  content: string;
  contentType: 'text' | 'image' | 'file';
  replyToId?: string;
  mentions: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface RoomMember {
  id: string;
  roomId: string;
  userId?: string;
  aiModelId?: string;
  memberType: 'human' | 'ai';
  role: 'owner' | 'admin' | 'member';
  aiPrompt?: string;
  joinedAt: Date;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  aiModel?: {
    id: string;
    displayName: string;
    provider: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  maxMembers: number;
  isPrivate: boolean;
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  members?: RoomMember[];
}

// 流式生成状态
interface StreamingState {
  messageId: string;
  aiModelId: string;
  aiModelName?: string;
  content: string;
  isStreaming: boolean;
  startTime: number;
}

interface RoomState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: Message[];
  members: RoomMember[];
  isLoading: boolean;
  streamingStates: Map<string, StreamingState>; // messageId -> StreamingState
  
  // Actions
  setRooms: (rooms: ChatRoom[]) => void;
  setCurrentRoom: (room: ChatRoom | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  setMembers: (members: RoomMember[]) => void;
  addMember: (member: RoomMember) => void;
  removeMember: (memberId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Streaming Actions
  startStreaming: (messageId: string, aiModelId: string, aiModelName?: string) => void;
  updateStreamingContent: (messageId: string, chunk: string) => void;
  stopStreaming: (messageId: string) => void;
  getStreamingState: (messageId: string) => StreamingState | undefined;
  getActiveStreamingMessages: () => string[];
  clearStreamingState: (messageId: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  messages: [],
  members: [],
  isLoading: false,
  streamingStates: new Map(),
  
  setRooms: (rooms) => set({ rooms }),
  
  setCurrentRoom: (room) => set({ currentRoom: room }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => {
    // 检查是否已存在相同ID的消息，防止重复
    const exists = state.messages.some((m) => m.id === message.id);
    if (exists) {
      return { messages: state.messages };
    }
    return { messages: [...state.messages, message] };
  }),
  
  updateMessage: (messageId, content) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, content, updatedAt: new Date() } : m
    ),
  })),
  
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === messageId ? { ...m, isDeleted: true } : m
    ),
  })),
  
  setMembers: (members) => set({ members }),
  
  addMember: (member) => set((state) => ({
    members: [...state.members, member],
  })),
  
  removeMember: (memberId) => set((state) => ({
    members: state.members.filter((m) => m.id !== memberId),
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Streaming Actions Implementation
  startStreaming: (messageId, aiModelId, aiModelName) => set((state) => {
    const newStreamingStates = new Map(state.streamingStates);
    newStreamingStates.set(messageId, {
      messageId,
      aiModelId,
      aiModelName,
      content: '',
      isStreaming: true,
      startTime: Date.now(),
    });
    return { streamingStates: newStreamingStates };
  }),
  
  updateStreamingContent: (messageId, chunk) => set((state) => {
    const newStreamingStates = new Map(state.streamingStates);
    const existingState = newStreamingStates.get(messageId);
    if (existingState) {
      newStreamingStates.set(messageId, {
        ...existingState,
        content: existingState.content + chunk,
      });
    }
    return { streamingStates: newStreamingStates };
  }),
  
  stopStreaming: (messageId) => set((state) => {
    const newStreamingStates = new Map(state.streamingStates);
    const existingState = newStreamingStates.get(messageId);
    if (existingState) {
      newStreamingStates.set(messageId, {
        ...existingState,
        isStreaming: false,
      });
    }
    return { streamingStates: newStreamingStates };
  }),
  
  getStreamingState: (messageId): StreamingState | undefined => {
    return useRoomStore.getState().streamingStates.get(messageId);
  },
  
  getActiveStreamingMessages: (): string[] => {
    const states = useRoomStore.getState().streamingStates;
    return Array.from(states.entries())
      .filter(([, state]) => state.isStreaming)
      .map(([messageId]) => messageId);
  },
  
  clearStreamingState: (messageId) => set((state) => {
    const newStreamingStates = new Map(state.streamingStates);
    newStreamingStates.delete(messageId);
    return { streamingStates: newStreamingStates };
  }),
}));
