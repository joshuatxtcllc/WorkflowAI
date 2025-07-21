import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data?: any;
}

export const useWebSocket = () => {
  // WebSocket functionality disabled for simplified operation
  return { 
    lastMessage: null, 
    sendMessage: () => {}, 
    connectionStatus: 'disconnected' as const 
  };
}