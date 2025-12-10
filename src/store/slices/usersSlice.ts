import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface IUserProfile {
    uid: string;
    displayName: string; // "name" in Firestore
    email: string;
    photoURL: string;
    isOnline: boolean;
    lastSeen: number;
}

interface UsersState {
    users: IUserProfile[];
    loadingUsers: boolean;
}

const initialState: UsersState = {
    users: [],
    loadingUsers: false,
};

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        setUsers: (state, action: PayloadAction<IUserProfile[]>) => {
            state.users = action.payload;
            state.loadingUsers = false;
        },
        updateUserPresence: (state, action: PayloadAction<{ uid: string, isOnline: boolean, lastSeen?: number }>) => {
            const user = state.users.find(u => u.uid === action.payload.uid);
            if (user) {
                user.isOnline = action.payload.isOnline;
                if (action.payload.lastSeen) user.lastSeen = action.payload.lastSeen;
            }
        },
        setLoadingUsers: (state, action: PayloadAction<boolean>) => {
            state.loadingUsers = action.payload;
        },
        clearUsers: (state) => {
            state.users = [];
            state.loadingUsers = false;
        }
    },
});

export const { setUsers, updateUserPresence, setLoadingUsers, clearUsers } = usersSlice.actions;
export default usersSlice.reducer;
