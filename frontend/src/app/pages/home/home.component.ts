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
  constructor(public userContext: UserContextService) {}
}
