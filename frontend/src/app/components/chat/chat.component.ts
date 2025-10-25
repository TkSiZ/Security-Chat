import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../types/message';
import { ChatService } from '../../services/chat/chat';
import { UserContextService } from '../../services/context/context';
import { Chat } from '../../types/chats';
import { TextBoxComponent } from './text-box/text-box.component';
import { generate, Subscription } from 'rxjs';
import { generate3DESKey } from '../../utils/encryption';
import { send } from 'process';
import { DataService } from '../../db.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  imports: [TextBoxComponent],
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnChanges, OnDestroy {
  @Input() chatId!: number;
  @Input() userId!: number;

  messages: Message[] = [];
  author: string = '';
  tripleDES_key = ''
  currentChat: Chat | null = null;
  author_is_server = 'server'
  type_is_message = 'MSG'
  type_is_join = "JOIN"
  type_is_exit = "EXIT"
  type_is_key = 'KEY'


  private stateSub!: Subscription;
  private isBrowser: boolean;

  constructor(
    private chatService: ChatService,
    private userContext: UserContextService,
    private api: DataService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Subscribe to user context
    this.stateSub = this.userContext.state$.subscribe((state) => {
      this.author = state.name;
      this.currentChat = state.currentChat;
    });
  }

 ngOnChanges(changes: SimpleChanges): void {
  if (!this.isBrowser) return;

  if ((changes['chatId'] || changes['userId']) && this.chatId && this.userId) {
    // Disconnect previous socket if exists
    this.chatService.disconnect(this.chatId);

    // Clear messages for the new chat
    this.messages = [];

    // Connect to the new chat
    this.connectToChat();
  }
}

private connectToChat(): void {
    // receber a chave 3des do admin criptografado
    // descriptografar usando a publica do admin e a privada minha
    // esse 3des vai ser adicionado ao contexto
  if (!this.isBrowser || !this.chatId || !this.userId) return;

  this.chatService.connect(this.chatId, this.userId, this.userContext.state.name!)
    .then(() => {
      this.chatService.onMessage(this.chatId, (msg: Message) => {
        this.messages.push(msg);
        
        // CHECK IF SOMEONE DISCONNECTED 
        if (msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_exit && msg.user_id === this.userId){
          this.api.getUpdatedChats(this.userContext.state.name).subscribe(
            {
            next: (userData: any) => {
              this.userContext.updateState({
                chats: userData.user_rooms,
              })
            }
           }
          )
          this.tripleDES_key = generate3DESKey()
          
        }

        // ADMIN GENERATE THE 3DES
        if (msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_join && msg.user_id === this.userId){
          this.tripleDES_key = generate3DESKey()
        }

        // ADMIN SENDS THE 3DES KEY TO SOMEONE WHO JUST JOINED
        if(msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_join && msg.user_id !== this.userId){
          this.send3DESKey(this.tripleDES_key, msg.user_id)
        }

        // USER RECEIVE THE 3DES
        if(msg.author !== this.author_is_server && msg.destination === this.userId && msg.type === this.type_is_key && msg.destination === this.userId){
          this.tripleDES_key = msg.text
        }
      });
    })
    .catch(err => {
      console.error(`[ChatComponent] Failed to connect socket:`, err);
    });
}

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    // Disconnect safely using the updated service
    if (this.chatId) {
      this.chatService.disconnect(this.chatId);
    }

  // Unsubscribe from user context
  this.stateSub?.unsubscribe();
}

  sendMessage(text: string): void {
    // TODO: criptografar a mensagem usando a chave 3des
    if (!this.chatId || !this.userId || !text.trim()) return;

    const message: Message = { text: text.trim(), user_id: this.userId ,author: this.author, type: "MSG", destination: null };
    this.chatService.sendMessage(this.chatId, message);
  }

  copyChatId(): void {
    if (!this.currentChat) {
      console.warn('Nenhum chat selecionado para copiar o ID.');
      return;
    }

    navigator.clipboard.writeText(String(this.currentChat.id))
      .then(() => console.log('ID do chat copiado:', this.currentChat?.id))
      .catch(err => console.error('Erro ao copiar ID:', err));
  }

  send3DESKey(key: string, user_id: number): void {
    if (!this.chatId || !this.userId || !key.trim()) return;

    const message: Message = { text: key.trim(), user_id: this.userId ,author: this.author, type: "KEY", destination: user_id };
    this.chatService.sendMessage(this.chatId, message);
  }
}
