import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserContextService } from '../../services/context/context';
import { DataService } from '../../db.service';
import { RsaService } from '../../services/rsa/rsa-service';
import {generate3DESKey, encrypt3DES, decrypt3DES} from '../../utils/encryption'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  isButtonDisabled = false;

  constructor(
    private router: Router,
    private userContext: UserContextService,
    private api: DataService,
    private rsa: RsaService
  ) {

  }

 async login() {
  this.isButtonDisabled = true;
  const trimmedUsername = this.username.trim();
  if (!trimmedUsername) return;
  console.log("Generating PUBLIC AND PRIVATE KEY")
  const { publicKey, privateKey } = await this.rsa.generateRSAKeyPair();

  const publicPem = await this.rsa.exportPublicKey(publicKey);
  console.log("PUBLIC_KEY:\n", publicPem)
  const privatePem = await this.rsa.exportPrivateKey(privateKey);
  console.log("PRIVATE_KEY:\n", privatePem)
  console.log("Terminou de gerar as keys")

  // Se tiver persistencia de login tem q ver essa parada aqui
  localStorage.setItem(`private_key_${trimmedUsername}`, privatePem);

  this.api.login(trimmedUsername, publicPem).subscribe({
    next: (userData: any) => {
      this.userContext.updateState({
        id: userData.user_id,
        name: trimmedUsername,
        chats: userData.user_rooms,
      });

      this.router.navigate([`/home/${trimmedUsername}`]);
    }
  });
}
}
