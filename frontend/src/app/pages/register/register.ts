import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {UserContextService} from '../../services/context/context';
import {DataService} from '../../db.service';
import {RsaService} from '../../services/rsa/rsa-service';
import * as bcrypt from 'bcryptjs';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  username: string = '';
	password: string = '';
  email: string = '';
	isButtonDisabled = false;

	constructor(
		private router: Router,
		private userContext: UserContextService,
		private api: DataService,
		private rsa: RsaService
	) {

	}


async create_account(){
    this.isButtonDisabled = true;
		const trimmedUsername = this.username.trim();
        const trimmedPassword = this.password.trim()

    const email = this.email
		if (!trimmedUsername || !trimmedPassword) return;
        console.log("Creating account...")

		const {publicKey, privateKey} = await this.rsa.generateRSAKeyPair();

		const publicPem = await this.rsa.exportPublicKey(publicKey);

		const privatePem = await this.rsa.exportPrivateKey(privateKey);

		// Se tiver persistencia de login tem q ver essa parada aqui
		localStorage.setItem(`private_key_${trimmedUsername}`, privatePem);

        const password_hash = await bcrypt.hash(trimmedPassword, 10)
        let utf8Encode = new TextEncoder();
        const password_hash_bytes_uint = utf8Encode.encode(password_hash);
        let password_hash_bytes = Array.from(password_hash_bytes_uint)


		this.api.create_account(trimmedUsername, publicPem, password_hash_bytes, email).subscribe({
			next: (userData: any) => {
				if (userData.user_id == -1){
                    alert("Usuário " + this.username + " já existe")
                    this.isButtonDisabled = false;
                }else{
                    this.userContext.updateState({
                        id: userData.user_id,
                        name: trimmedUsername,
                        chats: userData.user_rooms,
				    });

                    console.log("Hash da senha:", password_hash)
                    console.log("PUBLIC_KEY:\n", publicPem)
                    console.log("PRIVATE_KEY:\n", privatePem)

                    this.router.navigate([`/home/${trimmedUsername}`]);
                }
			}
	})
}
}
