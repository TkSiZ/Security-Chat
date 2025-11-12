import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {UserContextService} from '../../services/context/context';
import {DataService} from '../../db.service';
import {RsaService} from '../../services/rsa/rsa-service';
import * as bcrypt from 'bcryptjs';

@Component({
	selector: 'app-login',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.css']
})
export class LoginComponent {
	username: string = '';
	password: string = '';
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
        const trimmedPassword = this.password.trim();
		if (!trimmedUsername || !trimmedPassword) return;
		console.log("Logging in...")

		const {publicKey, privateKey} = await this.rsa.generateRSAKeyPair();

		const publicPem = await this.rsa.exportPublicKey(publicKey);

		const privatePem = await this.rsa.exportPrivateKey(privateKey);

		// Se tiver persistencia de login tem q ver essa parada aqui
		localStorage.setItem(`private_key_${trimmedUsername}`, privatePem);

		this.api.login(trimmedUsername, publicPem, this.password).subscribe({
			next: (userData: any) => {
                if (userData.user_id == -1){
                    alert("Usuário não existe")
                    this.isButtonDisabled = false;
                }else if(userData.user_id == -2){
                    alert("Senha inválida")
                    this.isButtonDisabled = false;
                }else{
                    this.userContext.updateState({
                        id: userData.user_id,
                        name: trimmedUsername,
                        chats: userData.user_rooms,
				    });

                    console.log("PUBLIC_KEY:\n", publicPem)
                    console.log("PRIVATE_KEY:\n", privatePem)

                    this.router.navigate([`/home/${trimmedUsername}`]);
                }
			}
		});
	}


	async create_account(){
        this.isButtonDisabled = true;
		const trimmedUsername = this.username.trim();
        const trimmedPassword = this.password.trim()

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


		this.api.create_account(trimmedUsername, publicPem, password_hash_bytes).subscribe({
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
		});
	}
}
