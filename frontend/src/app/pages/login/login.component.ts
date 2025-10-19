import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';

  constructor(private router: Router) {}

  login() {
    const trimmedUsername = this.username.trim();
    if (trimmedUsername) {
      // Redireciona para a rota pessoal do usuário
      this.router.navigate([`/home/${trimmedUsername}`]);
    }
  }
}
