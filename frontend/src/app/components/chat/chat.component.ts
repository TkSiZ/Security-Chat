import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Message } from '../../types/message';
import { ChatService } from '../../services/chat/chat';
import { UserContextService } from '../../services/context/context';
import { Chat } from '../../types/chats';
import { TextBoxComponent } from './text-box/text-box.component';
import { generate, Subscription, firstValueFrom } from 'rxjs'; // Import firstValueFrom
import { decrypt3DES, encrypt3DES, generate3DESKey } from '../../utils/encryption';
import { DataService } from '../../db.service';
import { RsaService } from '../../services/rsa/rsa-service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true, // Assuming this is needed for 'imports' array
  imports: [TextBoxComponent],
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnChanges, OnDestroy {
  @Input() chatId!: number;
  @Input() userId!: number;

  messages: Message[] = [];
  author: string = '';
  tripleDES_key = '';
  currentChat: Chat | null = null;
  author_is_server = 'server';
  type_is_message = 'MSG';
  type_is_join = 'JOIN';
  type_is_exit = 'EXIT';
  type_is_key = 'KEY';
  is_able_to_send: boolean = false

  private stateSub!: Subscription;
  private isBrowser: boolean;
  private privateKeyPromise!: Promise<CryptoKey | null>;

  constructor(
    private chatService: ChatService,
    private userContext: UserContextService,
    private api: DataService,
    private rsa: RsaService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Subscribe to user context
    this.stateSub = this.userContext.state$.subscribe((state) => {
      this.author = state.name;
      // We rely on connectToChat to update currentChat on connection, 
      // but keep this to track context changes.
      if (state.currentChat?.id === this.chatId) {
         this.currentChat = state.currentChat;
      }
    });
  }

  ngOnInit(){
    this.privateKeyPromise = this.loadPrivateKey();
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

  private async loadPrivateKey(): Promise<CryptoKey | null> {
    const pem = localStorage.getItem(`private_key_${this.userContext.state.name.trim()}`);
    if (!pem) return null;
    return await this.rsa.importPrivateKey(pem);
  }
  // --- Start of Fixed connectToChat ---
  private connectToChat(): void {
    if (!this.isBrowser || !this.chatId || !this.userId) return;

    this.chatService.connect(this.chatId, this.userId, this.userContext.state.name!)
      .then(() => {
        // 1. New Logic: Get the latest chat data right after connecting
        return firstValueFrom(this.api.getUpdatedChats(this.userContext.state.name));
      })
      .then((userData: any) => {
        // 2. Update Context with the latest data
        const updatedChats = userData.user_rooms;
        const updatedCurrentChat = updatedChats.find((chat: any) => chat.id === this.chatId) || null;

        this.userContext.updateState({
          chats: updatedChats,
          currentChat: updatedCurrentChat
        });
        
        // Ensure the local currentChat property is also updated
        this.currentChat = updatedCurrentChat;
        if(this.currentChat?.admin === this.userId){
            console.log("Generating 3DES for user:", this.author);
            this.tripleDES_key = generate3DESKey();
            this.is_able_to_send = true
            console.log("3DES key generated:", this.tripleDES_key);
        }
        this.sendMessage(`${this.author} has joined the chat.`, true)

        // 3. Setup the message listener
        this.chatService.onMessage(this.chatId, async (msg: Message) => {
          if (msg.type === this.type_is_message){
            console.log("Message text encrypted", msg)
            msg.text = decrypt3DES(msg.text, this.tripleDES_key)
            console.log("Message Decrypted", msg)
            this.messages.push(msg);
          }
          else{
            this.messages.push(msg);
          }
          // CHECK IF SOMEONE DISCONNECTED 
          if (msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_exit) {
            console.log("User disconnected from chat, verifying if send 3des is needed");
            this.is_able_to_send = false
            const previous_adm = this.currentChat?.admin;
            console.log("The Previous adm is:", previous_adm)
            // Must use a subscription here to fetch the data after disconnection
            this.api.getUpdatedChats(this.userContext.state.name).subscribe({
              next: (userData: any) => {
                const updatedChats = userData.user_rooms;
                const updatedCurrentChatOnExit = updatedChats.find((chat: any) => chat.id === this.chatId) || null;

                // Update the context (and local property)
                this.userContext.updateState({
                  chats: updatedChats,
                  currentChat: updatedCurrentChatOnExit
                });
                
                if (updatedCurrentChatOnExit) {
                  const now_adm = updatedCurrentChatOnExit.admin;
                  console.log("The now adm is:", now_adm)

                  if (previous_adm !== now_adm && this.userId === now_adm) {
                    console.log("ADMIN AS CHANGED, RE-SENDING THE 3DES KEY, THE NEW ADM IS:", now_adm);
                    
                    this.api.getAllUsersInChat(updatedCurrentChatOnExit.id).subscribe({
                      next: (response: any) => {
                        const all_users = response.users;
                        for (let user of all_users!) {
                          if(user !== this.userId){
                            console.log("Sending the new 3DES to: ", user);
                            this.send3DESKey(this.tripleDES_key, user);
                          }

                        }
                      },
                      error: (err) => console.error("Failed to get users in chat:", err)
                    });
                  }
                }
              },
              error: (err) => console.error("Failed to get updated chats on exit:", err)
            });

            this.is_able_to_send = true
          }

          // ADMIN SENDS THE 3DES KEY TO SOMEONE WHO JUST JOINED
          if (msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_join && msg.user_id !== this.userId && this.currentChat?.admin === this.userId) {
            console.log("Sending 3DES KEY To a user that just joined:", msg.user_id);
            this.send3DESKey(this.tripleDES_key, msg.user_id);
          }

          // USER RECEIVE THE 3DES
          if (msg.author !== this.author_is_server && msg.destination === this.userId && msg.type === this.type_is_key) {
            console.log("RECIEVED 3DES KEY");
            console.log("3DES ENCRYPTED key:", msg.text);
            console.log("Getting the private key")
            const private_key = await this.privateKeyPromise
            console.log(msg.text)
            this.tripleDES_key = await this.rsa.decryptMessage(private_key!, msg.text);
            this.is_able_to_send = true 
            console.log("3DES KEY DECRYPTED:", this.tripleDES_key);
          }
        });
      })
      .catch(err => {
        console.error(`[ChatComponent] Failed to connect or update chat data:`, err);
      });
  }
  // --- End of Fixed connectToChat ---

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    if (this.chatId) {
      this.chatService.disconnect(this.chatId);
    }
    this.stateSub?.unsubscribe();
  }

  sendMessage(text: string, is_log: boolean): void {
    // TODO: criptografar a mensagem usando a chave 3des
    if (!this.chatId || !this.userId || !text.trim()) return;
    let authorInMessage
    let messageType
    let messageToSend
    if(is_log){
      authorInMessage = 'server'
      messageType = 'JOIN'
      messageToSend = text.trim()
    }else{
      authorInMessage = this.author
      messageType = 'MSG'
      messageToSend = encrypt3DES(text.trim(), this.tripleDES_key)
    }

    const message: Message = { text: messageToSend, user_id: this.userId, author: authorInMessage, type: messageType, destination: null };
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

  // Refactored to correctly handle async data fetching using firstValueFrom
  async send3DESKey(key: string, user_id: number): Promise<void> {
    if (!this.chatId || !this.userId || !key.trim()) return;

    try {
      console.log("Getting PUBLIC KEY FROM USER:", user_id);
      
      // Await the result of the Observable using firstValueFrom
      const response: any = await firstValueFrom(this.api.getUserPublicKey(user_id)); 
      const destiny_public_key = response.public_key;

      if (!destiny_public_key) {
        console.error(`Public key not found for user: ${user_id}`);
        return;
      }

      console.log("Importing public key from user:", user_id);
      let public_key_object = await this.rsa.importPublicKey(destiny_public_key);

      console.log("Encrypting 3DES key to send to user:", user_id);
      const tripleDESEncrypted = await this.rsa.encryptMessage(public_key_object, key);

      const message: Message = { text: tripleDESEncrypted, user_id: this.userId, author: this.author, type: this.type_is_key, destination: user_id };
      console.log("Sent 3DES KEY ENCRYPTED");
      this.chatService.sendMessage(this.chatId, message);

    } catch (error) {
      console.error(`Error in send3DESKey for user ${user_id}:`, error);
    }
  }
}