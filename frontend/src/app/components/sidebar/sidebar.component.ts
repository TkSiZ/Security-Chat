import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatsComponent } from './chats/chats.component';
import { UserContextService } from '../../services/context/context';
import { Chat, CreateChat } from '../../types/chats';
import { User } from '../../types/user';
import { DataService } from '../../db.service';
import {catchError, firstValueFrom, switchMap, tap, throwError, timer} from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatsComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  chats: Chat[] = [];
  currentChat: Chat | null = null;
  showCreatePopup = false;
  showConnectPopup = false;
  userId: number| null = null;
  room_id : number| null = null;
  users: User[] = [];

  pollInterval: number = 5000; // tempo em ms entre chamadas para atualizar as salas

  constructor(
    private userContext: UserContextService,
    private router: Router,
    private api: DataService,
  ) {
    this.userContext.state$.subscribe(state => {
      this.chats = state.chats;
      this.currentChat = state.currentChat;
      this.userId = state.id
    });
    this.api.getAllUsers().subscribe({
      next: (response: any) => {
        this.users = response.users;
        console.log("Users:", this.users);
        },
      error: (err) => console.error("Failed to get all users in sidebar.component.ts", err)
    });
  }

  async createChat(chatNameInput: HTMLInputElement, chatCodeInput: HTMLInputElement ) {
    const roomNameInput = chatNameInput.value.trim();
    const chatCode = Number(chatCodeInput.value.trim())

    const selectedUsers = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')).map(el => JSON.stringify({
      username: el.name,
      user_id: Number(el.value)
    }));

    if (isNaN(chatCode) ) {
      alert("Chat code inválido ")
    } else if (!roomNameInput){
      alert("Nome do chat Vazio")
    } else if (!selectedUsers.length){
      alert("Nenhum usuário selecionado!")
    } else {
      console.log("Chat code is:", chatCode);
      // create Chat
      const payload : CreateChat = {
        user_id: this.userId!,
        room_id: chatCode,
        room_name: roomNameInput
      }

      console.log(payload)
      console.log(roomNameInput)

      const roomData = await firstValueFrom(this.api.createChat(payload))
      if (roomData.msg == -1){
          alert("Sala " + chatCode + " já existe!")
          return
      }
      console.log(roomData)
      this.userContext.addChat(roomData.room_id, roomData.room_name, this.userId!)

      chatNameInput.value = ''
      chatCodeInput.value = ''
      this.showCreatePopup = false;

      // add users in room
      console.log("Adding selected users to chat", chatCode);
      console.log(selectedUsers);

      const _ = await firstValueFrom(this.api.updateUserInRoom(selectedUsers, chatCode))
    }
  }

  connectChat(chatConnectInput: HTMLInputElement) {
    const id = Number(chatConnectInput.value.trim());
    this.room_id = id
    if (!id){
      alert("Insira um identificador")
      return
    }
    this.api.findChat(id).subscribe({
      next: (roomData: any) => {
        if(roomData.room_name === "Error: no room"){
          alert("Sua sala não existe, tente novamente")
          return
        }
        this.userContext.addChat(id, roomData.room_name, roomData.room_admin)

        chatConnectInput.value = '';
        this.showConnectPopup = false;
      }
    })

    this.api.updateUserChat(this.userId!, this.room_id).subscribe({
      next: (roomMessage: any) => {
        alert("Chat do usuário atualizado no banco")
      }
    })

  }

  logout(): void {
    this.userContext.delState();
    this.router.navigateByUrl('/', { replaceUrl: true });
  }

  async ngOnInit(){
    // Updates user's rooms every interval defined by pollInterval
    return timer(0, this.pollInterval).pipe(
      switchMap(() => this.api.getUserRooms(this.userId!)),

      // tap((response : any) => {
      //   console.log("User rooms: ", response)
      // }),

      catchError((err) => {
        console.error('Erro ao obter user rooms:', err);
        return throwError(() => err);
      }),

    ).subscribe({
      next: (rooms:any) => {
        const room_ids: number[] = Object.keys(rooms).map(Number)
        let existing_room_ids: number[] = []

        for (let chat of this.userContext.state.chats){
          existing_room_ids.push(chat.id)
        }

        let already_exists = false
        for (let room_id of room_ids){
          already_exists = false

          for (let existing_id of existing_room_ids){
            if (room_id == existing_id){
              already_exists = true;
              break
            }
          }

          if (!already_exists){
            console.log("Room", room_id, "not in existing rooms")
            console.log("Adding room_id", room_id, " with name", rooms.room_id, " to user", this.userId!)
            this.userContext.addChat(room_id, rooms[room_id], this.userId!)
          }
        }
      }
    })

  }
}
