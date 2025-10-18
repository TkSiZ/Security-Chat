import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChatsComponent } from "./chats/chats.component";

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatsComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  conversas = [
    { nome: "testeteste", ultima: "abrabsbdas?" },
  ];
}
