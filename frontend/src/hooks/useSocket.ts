import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = (namespace: string = '') => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}${namespace}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log(`Socket connected: ${namespace}`);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log(`Socket disconnected: ${namespace}`);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      message.error('实时连接失败');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [namespace]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected');
    }
  }, [socket]);

  return { socket, connected, emit };
};
