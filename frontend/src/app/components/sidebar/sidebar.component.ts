import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatsComponent } from './chats/chats.component';
import { UserContextService } from '../../services/context/context';
import { Chat, CreateChat } from '../../types/chats';
import { DataService } from '../../db.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatsComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  chats: Chat[] = [];
  currentChat: Chat | null = null;
  showCreatePopup = false;
  showConnectPopup = false;
  userId: number| null= null 
  constructor(
    private userContext: UserContextService,
    private router: Router,
    private api: DataService
  ) {
    this.userContext.state$.subscribe(state => {
      this.chats = state.chats;
      this.currentChat = state.currentChat;
      this.userId = state.id
    });
  }

  createChat(chatNameInput: HTMLInputElement, chatCodeInput: HTMLInputElement ) {
    const roomNameInput = chatNameInput.value.trim();
    const chatCode = Number(chatCodeInput.value.trim())

    if (isNaN(chatCode) || !roomNameInput ) {
      alert("Chat code inválido ou Nome do chat Vazio")
    } else {
      console.log("Chat code is:", chatCode);
       const payload : CreateChat = {
        user_id: this.userId!,
        room_id: chatCode,
        room_name: roomNameInput
      }

      console.log(roomNameInput)
      this.api.createChat(payload).subscribe({
        next: (roomData: any) => {
        this.userContext.addChat(roomData.room_id, roomData.room_name, roomData.room)
        }
      })
      chatNameInput.value = ''
      chatCodeInput.value = ''
      this.showCreatePopup = false;
      }
  }

  connectChat(chatConnectInput: HTMLInputElement) {
    const idOrName = chatConnectInput.value.trim();
    if (!idOrName) return;
    this.userContext.connectChat(idOrName);
    chatConnectInput.value = '';
    this.showConnectPopup = false;
  }

  logout(): void {
    this.userContext.delState();
    this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
