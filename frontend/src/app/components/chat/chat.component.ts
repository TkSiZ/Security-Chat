import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../types/message';
import { ChatService } from '../../services/chat/chat';
import { UserContextService } from '../../services/context/context';
import { Chat } from '../../types/chats';
import { TextBoxComponent } from './text-box/text-box.component';
import { Subscription } from 'rxjs';

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
  currentChat: Chat | null = null;

  private stateSub!: Subscription;
  private isBrowser: boolean;

  constructor(
    private chatService: ChatService,
    private userContext: UserContextService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

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
        console.log(msg)
        // verificar se é mensagem de texto ou chave?
        this.messages.push(msg);
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
    // criptografar a mensagem usando a chave 3des
    if (!this.chatId || !this.userId || !text.trim()) return;

    const message: Message = { text: text.trim(), author: this.author, is_key: false };
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
    // TODO
    // usar o user_id pra pegar a public key
    // gerar a DF key usando a public key
    // usar a DF key no Salsa20 pra criptografar o 3DES
    // mandar criptografado

    if (!this.chatId || !this.userId || !key.trim()) return;

    const message: Message = { text: key.trim(), author: this.author, is_key: true };
    this.chatService.sendMessage(this.chatId, message);
  }
}
