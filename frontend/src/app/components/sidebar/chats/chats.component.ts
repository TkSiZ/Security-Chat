import { Component, Input } from '@angular/core';
import { UserContextService } from '../../../services/context/context';
import { Chat } from '../../../types/chats';

@Component({
  selector: 'app-chats',
  templateUrl: './chats.component.html',
  styleUrls: ['./chats.component.css']
})
export class ChatsComponent {
  @Input() chatName!: string;
  @Input() chatId!: number;
  @Input() currentChat!: Chat | null // TO DO VERIFY IF THIS IS THE TYPE THAT WILL BE USED IN THE FINAL VERSION


  constructor(private userContext: UserContextService){
    this.userContext.state$.subscribe()
  }
  toggleChat(_chatId: number) {
    if(this.chatId === this.currentChat?.id){
      this.userContext.updateState({currentChat: null})
    }
    else{
      this.userContext.updateState({currentChat: {id: this.chatId, name: this.chatName}})
    }
    
  }
}
