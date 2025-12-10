import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IMessage {
    _id: string;
    text: string;
    createdAt: number;
    user: {
        _id: string;
        name: string;
        avatar?: string;
    };
    image?: string;
    sent: boolean;
    received: boolean;
}

interface ChatState {
    activeChatId: string | null;
    messages: IMessage[]; // Current active chat messages
    loadingMessages: boolean;
}

const initialState: ChatState = {
    activeChatId: null,
    messages: [],
    loadingMessages: false,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveChat: (state, action: PayloadAction<string | null>) => {
            state.activeChatId = action.payload;
            state.messages = [];
        },
        setMessages: (state, action: PayloadAction<IMessage[]>) => {
            state.messages = action.payload;
        },
        addMessage: (state, action: PayloadAction<IMessage>) => {
            state.messages.unshift(action.payload);
        },
        updateMessageStatus: (state, action: PayloadAction<{ _id: string, sent?: boolean, received?: boolean }>) => {
            const msg = state.messages.find(m => m._id === action.payload._id);
            if (msg) {
                if (action.payload.sent !== undefined) msg.sent = action.payload.sent;
                if (action.payload.received !== undefined) msg.received = action.payload.received;
            }
        }
    },
});

export const { setActiveChat, setMessages, addMessage, updateMessageStatus } = chatSlice.actions;
export default chatSlice.reducer;
