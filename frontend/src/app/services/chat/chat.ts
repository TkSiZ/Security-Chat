import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../types/message';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket?: WebSocket;
  private readonly WS_URL = 'ws://localhost:3000';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  connect(): void {
    if (!this.isBrowser) {
      console.log('[ChatService] Running on server — WebSocket not initialized.');
      return;
    }

    this.socket = new WebSocket(this.WS_URL);

    this.socket.onopen = () => console.log('[ChatService] WebSocket connected.');
    this.socket.onerror = (err) => console.error('[ChatService] WebSocket error:', err);
    this.socket.onclose = () => console.log('[ChatService] WebSocket closed.');
  }

  sendMessage(message: Message): void {
    if (!this.isBrowser) return;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('[ChatService] Cannot send message — WebSocket not open.');
    }
  }

  onMessage(callback: (message: Message) => void): void {
    if (!this.isBrowser) return;

    if (!this.socket) {
      console.warn('[ChatService] WebSocket not connected yet.');
      return;
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (err) {
        console.error('[ChatService] Failed to parse message:', err);
      }
    };
  }
}
