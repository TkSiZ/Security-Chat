import { Component } from "@angular/core";
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { ChatComponent } from "../../components/chat/chat.component";
import { UserContextService } from '../../services/context/context';

@Component({
  selector: 'home-page',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [SidebarComponent, ChatComponent]
})
export class HomeComponent {
  userId : number | null = null
  currentChatId : number | null = null
  sidebarOpen = false
  constructor(public userContext: UserContextService) {
    this.userContext.state$.subscribe(state => {
      this.userId = state.id
      this.currentChatId = state.currentChat?.id!
    })
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Fechar sidebar quando clicar no chat (mobile)
  closeSidebar() {
    if (window.innerWidth < 768) { 
      this.sidebarOpen = false;
    }
  }
}
