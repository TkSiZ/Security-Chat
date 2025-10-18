import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TextBoxComponent } from "./text-box/text-box.component";
import { Message } from "../../types/message";
import { ChatService } from "../../services/chat/chat";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, TextBoxComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})

export class ChatComponent {
  mensagem = ''
  sender= ''
  recipient = ''
  mensagens : Message[] = []

  constructor(private chatService: ChatService) {}

  ngOnInit() : void {
    this.chatService.onMessage((msg: Message) => {
      this.mensagens.push(msg)
    })
  }

  sendMessage(): void {
    if (this.mensagem.trim()) {
      this.chatService.sendMessage(this.)
    }
  }
}

