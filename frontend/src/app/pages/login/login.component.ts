import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {UserContextService} from '../../services/context/context';
import {DataService} from '../../db.service';
import {RsaService} from '../../services/rsa/rsa-service';
import * as bcrypt from 'bcryptjs';
import { error } from 'console';

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
	otpCode: string = '';          // <--- NEW
    twoFactorStep: boolean = false; // <--- NEW
    userIdFromServer!: number;     // <--- NEW
	publicKey !: string;
	privateKey !: string;


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

		this.publicKey = publicPem
		this.privateKey = privatePem
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
                    this.twoFactorStep = true;
                    this.userIdFromServer = userData.user_id;
                    this.isButtonDisabled = false;
                }
			}
		});
	}

	async verifyOTP() {
        this.isButtonDisabled = true;

        this.api.verify2FA(this.userIdFromServer, this.otpCode).subscribe({
            next: async (verifyData: any) => {
                // Update user context
                this.userContext.updateState({
                    id: this.userIdFromServer,
                    name: this.username,
                    chats: verifyData.user_rooms
                });

				console.log("Salas do usuário")
				console.log(verifyData.user_rooms)
				console.log("Chave pública")
				console.log(this.publicKey)
				console.log(this.privateKey)
				console.log("Chave privada")

                this.router.navigate([`/home/${this.username}`]);
            },
			error: (err) => {
				this.isButtonDisabled = false;

				if (err.status === 401) {
					alert("Código inválido ou expirado!");
					return;
				}

				alert("Erro inesperado!");
				console.error(err);
			}
        });
    }

	async create_account(){
        this.router.navigate([`/register`])
	}
}
