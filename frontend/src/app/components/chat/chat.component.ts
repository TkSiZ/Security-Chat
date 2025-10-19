import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TextBoxComponent } from "./text-box/text-box.component";
import { Message } from "../../types/message";
import { ChatService } from "../../services/chat/chat";
import { UserContextService } from "../../services/context/context";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, TextBoxComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})

export class ChatComponent {
  messageText: string = ''
  messages : Message[] = []
  author: string = 'me' // TO DO: Change this to use the user context
  currentChat : number | null = null

  // TO DO GET THE CONTEXT INFO CORRECTLY
  constructor(private chatService: ChatService, private userContext: UserContextService) {
    this.userContext.state$.subscribe(state => {
      this.currentChat = state.currentChat
    })
  }

  ngOnInit() : void {
    this.chatService.connect()
    this.chatService.onMessage((msg: Message) => {
      this.messages.push(msg)
    })
  }

  sendMessage(message: string): void {
    let messagePayload : Message= {
      text: this.messageText.trim(),
      author: this.author
    }
    this.chatService.sendMessage(messagePayload)
    this.messageText = ''
  }
}

