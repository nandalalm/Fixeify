import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; 

export const initializeSocket = (accessToken: string): Socket => {
  if (!accessToken) {
    console.error("No access token provided for socket initialization");
    throw new Error("Access token is required");
  }

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiry = payload.exp * 1000; 
    if (Date.now() >= expiry) {
      console.error("Access token is expired");
      throw new Error("Access token is expired");
    }
  } catch (err) {
    console.error("Invalid access token format:", err);
    throw new Error("Invalid access token");
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiBaseUrl) {
    console.error("VITE_API_BASE_URL is not defined in environment variables");
    throw new Error("API base URL is not configured");
  }

  const socketUrl = apiBaseUrl.replace('/api', ''); 

  socket = io(socketUrl, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 5000,
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
    reconnectAttempts = 0;
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message, { socketUrl, token: accessToken.substring(0, 10) + '...' });
    
    if (error.message === 'Invalid authentication token') {
      console.error('Authentication failed, please ensure valid token');
    } else if (error.message === 'Invalid namespace') {
      console.error('Invalid namespace error - check server configuration');
      console.error('Current socket URL:', socketUrl);
    } else if (error.message.includes('CORS')) {
      console.error('CORS error - verify backend CORS configuration');
      console.error('Expected origin:', 'http://localhost:5173');
    } else if (error.message.includes('timeout')) {
      console.error('Connection timeout - server might be down');
      console.error('Attempting to connect to:', socketUrl);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error);
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
    }
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  reconnectAttempts = 0;
};

export const getSocket = (): Socket | null => socket;

export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

export const reconnectSocket = (accessToken: string): Socket => {
  disconnectSocket();
  return initializeSocket(accessToken);
};

export const emitWithErrorHandling = (event: string, data: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit(event, data, (response: any) => {
      if (response?.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
};