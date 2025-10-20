import { Injectable, input } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserBackendResponse } from './types/userContext';
import { Chat, CreateChat } from './types/chats';
import { generatePrivateKey, generatePublicKey } from './utils/encryption';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'http://localhost:8000'; 

  constructor(private http: HttpClient) { }

  login(inputUserName: string): Observable<UserBackendResponse> {
    const url = `${this.baseUrl}/login`;

    return this.http.post<UserBackendResponse>(url, null, 
        {
            params: {username: inputUserName}
        }
    );
  }

  createChat(chat: CreateChat): Observable<any> {
    const url = `${this.baseUrl}/create_room`;

    return this.http.post<Chat>(url, null, {
      params: {
        room_id: chat.room_id,
        room_name: chat.room_name,
        user_id: chat.user_id
      }
    });
  }

}