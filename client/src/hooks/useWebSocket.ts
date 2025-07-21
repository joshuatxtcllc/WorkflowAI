import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
}

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Reduced reconnection attempts
  const connectionDebounceRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    // Clear any pending connection attempts
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    // Debounce connection attempts
    connectionDebounceRef.current = setTimeout(() => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        setConnectionStatus('connecting');

        const newSocket = new WebSocket(wsUrl);

        newSocket.onopen = () => {
          setSocket(newSocket);
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
        };

        newSocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            setLastMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        newSocket.onclose = (event) => {
          setSocket(null);
          setConnectionStatus('disconnected');

          // Only reconnect if not a normal closure and under attempt limit
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 2000, 10000); // Max 10s delay

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts.current++;
              connect();
            }, delay);
          }
        };

        newSocket.onerror = () => {
          setConnectionStatus('disconnected');
        };

      } catch (error) {
        setConnectionStatus('disconnected');
      }
    }, 500); // 500ms debounce
  }, [socket]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionDebounceRef.current) {
        clearTimeout(connectionDebounceRef.current);
      }
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [socket]);

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, [socket]);

  return { lastMessage, sendMessage, connectionStatus };
}