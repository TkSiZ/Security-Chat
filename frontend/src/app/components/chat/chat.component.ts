import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TextBoxComponent } from "./text-box/text-box.component";

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, TextBoxComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})

export class ChatComponent {
  mensagens = [
    { texto: "To ablubleble das ideias?", autor: "eu" }
  ];

  adicionarMensagem(novaMensagem: string) {
    this.mensagens.push({ texto: novaMensagem, autor: "eu" });
  }
}
