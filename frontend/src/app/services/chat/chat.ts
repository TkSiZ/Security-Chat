import { Injectable } from '@angular/core';
import {io, Socket} from 'socket.io-client';
import {Message} from '../../types/message'

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket!: Socket;

  constructor() {
  }
  
  // TO DO: CHANGE TO THE REAL SOCKET IP
  connect(): void {
    this.socket = io('http://localhost:3000/', {
      autoConnect: true,
      reconnectionAttempts: 3,
      timeout: 5000
    });

    this.socket.on('connect_error', (err) => console.error('Socket connect error', err));
  }

  // TO DO: Verify if it should return something
  sendMessage(message: Message): void{
    this.socket.emit('message', message)
  }

  // TO DO: Verify if it should return something
  onMessage(callback: (message: Message) => void) : void {
    this.socket.on('message', callback)
  }
}
