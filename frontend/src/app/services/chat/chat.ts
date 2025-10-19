import { Injectable } from '@angular/core';
import {io, Socket} from 'socket.io-client';
import {Message} from '../../types/message'

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket;

  constructor() {
    // TO DO: CHANGE TO THE REAL SOCKET IP
    this.socket = io('http://localhost:3000')
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
