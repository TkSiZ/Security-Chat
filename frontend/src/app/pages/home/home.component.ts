import { Component } from "@angular/core";
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { ChatComponent } from "../../components/chat/chat.component";

@Component({
  selector: 'home-page',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [SidebarComponent]
})
export class HomeComponent {}
