import { create } from 'zustand';

interface ConversationModeState {
  isConversationalMode: boolean;
  setIsConversationalMode: (mode: boolean) => void;
}

export const useConversationModeStore = create<ConversationModeState>((set) => ({
  isConversationalMode: true,
  setIsConversationalMode: (mode) => set({ isConversationalMode: mode }),
}));
