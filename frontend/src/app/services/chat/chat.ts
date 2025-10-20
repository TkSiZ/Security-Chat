import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../types/message';
import { environment } from '../../../environments/environment';

interface SocketInfo {
  roomId: number;
  socket: WebSocket;
  onMessageCallbacks: ((message: Message) => void)[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private sockets: SocketInfo[] = [];
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Connect to a chat room via WebSocket
   */
  connect(roomId: number, userId: number, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowser) return reject('Not running in browser');

      // Remove existing socket for the room
      this.disconnect(roomId);
      const API_SOCKET_URL= environment.apiWebsocket
      const WS_URL = `${API_SOCKET_URL}/${roomId}/${userId}?user_name=${userName}`;
      console.log(`[ChatService] Connecting to ${WS_URL}`);

      const socket = new WebSocket(WS_URL);
      const socketInfo: SocketInfo = {
        roomId,
        socket,
        onMessageCallbacks: []
      };

      this.sockets.push(socketInfo);

      socket.onopen = () => {
        console.log(`[ChatService] WebSocket connected to room ${roomId} (readyState=${socket.readyState})`);
        resolve();
      };

      socket.onerror = (err) => {
        console.error(`[ChatService] WebSocket error (room ${roomId}):`, err);
        reject(err);
      };

      socket.onclose = () => {
        console.log(`[ChatService] WebSocket closed (room ${roomId})`);
        this.sockets = this.sockets.filter(s => s.socket !== socket);
      };

      socket.onmessage = (event) => {
        try {
          const data: Message = JSON.parse(event.data);
          socketInfo.onMessageCallbacks.forEach(cb => cb(data));
        } catch (err) {
          console.error(`[ChatService] Failed to parse message (room ${roomId}):`, err);
        }
      };
    });
  }

  /**
   * Send a message to a room
   */
  sendMessage(roomId: number, message: Message): void {
    const socketInfo = this.sockets.find(s => s.roomId === roomId);

    if (!socketInfo) {
      console.warn(`[ChatService] No socket found for room ${roomId}`);
      return;
    }

    if (socketInfo.socket.readyState === WebSocket.OPEN) {
      socketInfo.socket.send(JSON.stringify(message));
    } else {
      console.warn(`[ChatService] Cannot send message — WebSocket for room ${roomId} not open.`);
    }
  }

  /**
   * Register a callback for incoming messages
   */
  onMessage(roomId: number, callback: (message: Message) => void): void {
    const socketInfo = this.sockets.find(s => s.roomId === roomId);
    if (!socketInfo) {
      console.warn(`[ChatService] WebSocket for room ${roomId} not connected yet.`);
      return;
    }
    socketInfo.onMessageCallbacks.push(callback);
  }

  /**
   * Disconnect a room socket
   */
  disconnect(roomId: number): void {
    const index = this.sockets.findIndex(s => s.roomId === roomId);
    if (index >= 0) {
      const socketInfo = this.sockets[index];
      if (socketInfo.socket.readyState === WebSocket.OPEN || socketInfo.socket.readyState === WebSocket.CONNECTING) {
        socketInfo.socket.close();
      }
      this.sockets.splice(index, 1);
      console.log(`[ChatService] Disconnected socket for room ${roomId}`);
    }
  }

  /**
   * Disconnect all sockets (useful on app destroy)
   */
  disconnectAll(): void {
    this.sockets.forEach(s => {
      if (s.socket.readyState === WebSocket.OPEN || s.socket.readyState === WebSocket.CONNECTING) {
        s.socket.close();
      }
    });
    this.sockets = [];
    console.log('[ChatService] All sockets disconnected');
  }
}
