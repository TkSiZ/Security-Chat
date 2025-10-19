import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatsComponent } from './chats/chats.component';
import { UserContextService } from '../../services/context/context';
import { Chat } from '../../types/chats';

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

  constructor(
    private userContext: UserContextService,
    private router: Router
  ) {
    this.userContext.state$.subscribe(state => {
      this.chats = state.chats;
      this.currentChat = state.currentChat;
    });
  }

  createChat(chatNameInput: HTMLInputElement) {
    const name = chatNameInput.value.trim();
    if (!name) return;
    this.userContext.addChat(name);
    chatNameInput.value = '';
    this.showCreatePopup = false;
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
