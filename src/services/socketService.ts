import { io, Socket } from 'socket.io-client';

// Replace with your computer's IP if running on device, or localhost for simulator
// For Android Emulator use 10.0.2.2
const SOCKET_URL = 'http://localhost:3000';

class SocketService {
    public socket: Socket | null = null;

    connect() {
        if (this.socket && this.socket.connected) {
            return;
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit(event: string, data: any) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    on(event: string, callback: (data: any) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

export default new SocketService();
