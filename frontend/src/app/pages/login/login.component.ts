import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserContextService } from '../../services/context/context';
import { DataService } from '../../db.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';

  constructor(private router: Router, private userContext: UserContextService, private api: DataService) {

  }

  login() {
    const trimmedUsername = this.username.trim();
    if (trimmedUsername) {
      this.api.login(trimmedUsername).subscribe({
        next : (userData: any) => {
          this.userContext.updateState({id: userData.user_id, name: trimmedUsername, chats: userData.user_rooms, public_key: userData.user_public_key})
          console.log(userData.user_id)
          console.log(trimmedUsername)
          console.log(userData.user_rooms)
          console.log(userData.user_public_key)
          this.router.navigate([`/home/${trimmedUsername}`]);
        }
      })
    }
  }
}
