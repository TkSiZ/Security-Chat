import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ChatsComponent } from "./chats/chats.component";
import { UserContextService } from "../../services/context/context";
import { Chat } from "../../types/chats";

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatsComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  chats : Chat[] = []
  currentChat: Chat | null = null

  constructor(private userContext: UserContextService){
    this.userContext.state$.subscribe(state => {
      this.chats = state.chats
      this.currentChat = state.currentChat
    })
    console.log(this.chats)
    console.log(this.currentChat)
  }
}
