import {
    Component,
    Input,
    SimpleChanges,
    OnChanges,
    OnDestroy,
    Inject,
    PLATFORM_ID,
    ViewChild,
    ElementRef,
    AfterViewChecked
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {Message} from '../../types/message';
import {Chat} from '../../types/chats';
import {ChatService} from '../../services/chat/chat';
import {UserContextService} from '../../services/context/context';
import {TextBoxComponent} from './text-box/text-box.component';
import {Subscription, firstValueFrom, timer, switchMap, catchError, throwError, of} from 'rxjs'; // Import firstValueFrom
import {decrypt3DES, encrypt3DES, generate3DESKey} from '../../utils/encryption';
import {DataService} from '../../db.service';
import {RsaService} from '../../services/rsa/rsa-service';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
    standalone: true, // Assuming this is needed for 'imports' array
    imports: [TextBoxComponent],
    styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnChanges, OnDestroy, AfterViewChecked {
    @Input() chatId!: number;
    @Input() userId!: number;

    active_users_id: number[] = [];
    active_users_str: string[] = [];

    total_users_str: string[] = [];

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

    pollInterval: number = 5000


    private stateSub!: Subscription;
    private activeUsersSub!: Subscription;
    private isBrowser: boolean;
    private privateKeyPromise!: Promise<CryptoKey | null>;
    @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
    private shouldScroll = true


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

    ngOnInit() {
        this.privateKeyPromise = this.loadPrivateKey();

        this.activeUsersSub = timer(0, this.pollInterval)
            .pipe(
                switchMap(() => this.api.getActiveUsersInChat(this.chatId)),
                catchError((err) => {
                    console.error('Erro ao obter usuarios ativos na sala:', err);
                    return of({ users: [] });
                })
            )
            .subscribe((response: any) => {
                this.active_users_id = response.users;

                this.api.getUsernames(this.active_users_id).subscribe({
                    next: (names) => (this.active_users_str = names)
                });
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

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
        }
    }

    private scrollToBottom() {
        const container = this.messagesContainer?.nativeElement;
        if (!container) return;
        container.scrollTop = container.scrollHeight;
    }

    private isAtBottom(): boolean {
        const container = this.messagesContainer?.nativeElement;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 40;
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
                if (this.currentChat?.admin === this.userId) {
                    console.log("Generating 3DES for admin:", this.author);
                    this.tripleDES_key = generate3DESKey();
                    this.is_able_to_send = true
                    console.log("3DES key generated:", this.tripleDES_key);
                }
                this.sendMessage(`${this.author} has joined the chat.`, true)

                // update total_users
                this.api.getAllUsersInChat(this.chatId).subscribe({
                    next: (response: any) => {
                        this.total_users_str = response;
                        console.log("consegui")
                    }
                })

                // 3. Setup the message listener
                this.chatService.onMessage(this.chatId, async (msg: Message) => {
                    this.shouldScroll = this.isAtBottom();
                    if (msg.type === this.type_is_message) {
                        console.log("Message text encrypted", msg)
                        const decryptedText = decrypt3DES(msg.text, this.tripleDES_key);
                        msg.text = decrypt3DES(msg.text, this.tripleDES_key)
                        console.log("Message Decrypted", msg)

                        if (msg.hash) {
                            console.log("Verificando Integridade da Mensagem")
                            const calculatedHash = await this.rsa.hashSHA256(decryptedText);
                            console.log("Hash recebido pela mensagem:", msg.hash)
                            console.log(`Mensagem recebida pelo texto ${decryptedText} ||| Mesmo texto, porém em hash: ${calculatedHash}`)

                            if (calculatedHash !== msg.hash) {
                                console.error("❌ MESSAGE TAMPERED! HASH DOES NOT MATCH!");
                                msg.text += "  ⚠️ (Integrity Check Failed)";
                            } else {
                                console.log("✔ Integrity OK — hash matches");
                            }
                        }

                        this.messages.push(msg);
                    } else {
                        this.messages.push(msg);
                    }
                    // CHECK IF SOMEONE DISCONNECTED
                    if (msg.author === this.author_is_server && msg.destination === null && msg.type === this.type_is_exit) {
                        console.log("A User has disconnected from the chat");
                        this.is_able_to_send = false
                        const previous_adm = this.currentChat?.admin;

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

                                    // printing logs for debug
                                    if (previous_adm !== now_adm) {
                                        console.log("ADMIN HAS CHANGED");
                                        if (this.userId === now_adm) {
                                            console.log("YOU ARE NOW THE NEW ADM:");
                                        }
                                        console.log("The previous admin was:", previous_adm, ". New admin is:", now_adm);
                                    } else {
                                        console.log("ADMIN HAS NOT CHANGED");
                                    }
                                    console.log("RE-GENERATING THE 3DES KEY");

                                    if (this.userId == now_adm) {
                                        this.tripleDES_key = generate3DESKey()
                                        console.log("THE NEW 3DES KEY IS:", this.tripleDES_key)

                                        this.api.getActiveUsersInChat(updatedCurrentChatOnExit.id).subscribe({
                                            next: (response: any) => {
                                                const all_users = response.users;
                                                this.active_users_id = response.users; // não quis mexer em all_users pq n quero bo, mas dava pra juntar os dois
                                                console.log("Alguem saiu do chat")
                                                for (let user of all_users!) {
                                                    if (user !== this.userId) {
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
                        console.log("RECEIVED 3DES KEY");
                        console.log("3DES ENCRYPTED key:", msg.text);
                        console.log("Getting the private key")
                        const private_key = await this.privateKeyPromise
                        console.log("My private key:\n", localStorage.getItem(`private_key_${this.userContext.state.name.trim()}`))
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
         if (this.chatId) {
        this.chatService.disconnect(this.chatId);
        }
        this.activeUsersSub?.unsubscribe();
        this.stateSub?.unsubscribe();
    }

    async sendMessage(text: string, is_log: boolean): Promise<void> {
        if (!this.chatId || !this.userId || !text.trim()) return;
        let authorInMessage
        let messageType
        let messageToSend
        let hash_sig
        if (is_log) {
            authorInMessage = 'server'
            messageType = 'JOIN'
            messageToSend = text.trim()
        } else {
            authorInMessage = this.author
            messageType = 'MSG'
            messageToSend = encrypt3DES(text.trim(), this.tripleDES_key)
            const originalText = text.trim();
            hash_sig = await this.rsa.hashSHA256(originalText);
            console.log("Mensagem enviada com HASH:", hash_sig);
        }


        // 2️⃣ MONTAR A MENSAGEM COM O HASH
        const message: Message = {
            text: messageToSend,
            user_id: this.userId,
            author: authorInMessage,
            type: messageType,
            destination: null,
            hash: hash_sig ? hash_sig : null
        };

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
            console.log("Public key of user " + user_id + ":\n" + destiny_public_key)
            let public_key_object = await this.rsa.importPublicKey(destiny_public_key);

            console.log("Encrypting 3DES key to send to user:", user_id);
            const tripleDESEncrypted = await this.rsa.encryptMessage(public_key_object, key);

            const message: Message = {
                text: tripleDESEncrypted,
                user_id: this.userId,
                author: this.author,
                type: this.type_is_key,
                destination: user_id,
                hash: null
            };
            console.log("Sent 3DES KEY ENCRYPTED:\n" + tripleDESEncrypted);
            this.chatService.sendMessage(this.chatId, message);

        } catch (error) {
            console.error(`Error in send3DESKey for user ${user_id}:`, error);
        }
    }
}
