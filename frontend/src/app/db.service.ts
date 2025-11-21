import {Injectable, input} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {UserBackendResponse} from './types/userContext';
import {Chat, CreateChat} from './types/chats';
import {environment} from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) {
    }

    login(inputUserName: string, publicKeyInput: any, password: string): Observable<UserBackendResponse> {
        const url = `${this.baseUrl}/login`;

        return this.http.post<UserBackendResponse>(url, null,
            {
                params: {
                    username: inputUserName,
                    public_key: publicKeyInput,
                    password: password
                }
            }
        );
    }

    create_account(inputUserName: string, publicKeyInput: any, password_hash_bytes: number[], email: string): Observable<UserBackendResponse> {
        const url = `${this.baseUrl}/create_account`;
        const payload = {username: inputUserName, public_key: publicKeyInput, password_hash_bytes: password_hash_bytes, email: email}
        console.log("Payload:", payload)

        return this.http.put<UserBackendResponse>(url, payload);
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

    getUsernames(user_ids: number[]): Observable<any> {
        const url = `${this.baseUrl}/usernames`;

        return this.http.post<Chat>(url, user_ids);
    }

    updateUserChat(userIdInput: number, room_id: number): Observable<any> {
        const url = `${this.baseUrl}/join_room/${room_id}`;

        return this.http.put<any>(url, null, {
            params: {
                user_id: userIdInput
            }
        });
    }

    updateUserInRoom(users: any, room_id: number): Observable<any> {
        const url = `${this.baseUrl}/update_user_in_room`
        const payload = {payload: users, room_id: room_id}

        // console.log("Print antes do return:", payload)

        return this.http.put<any>(url, payload)
    }

    findChat(id: number): Observable<any> {
        const url = `${this.baseUrl}/get_room`

        return this.http.get<any>(url, {
            params: {
                room_id: id
            }
        })
    }

    deleteChat(id: number): Observable<any> {
        // NOTA: isso não foi testado
        const url = `${this.baseUrl}/test/delete_room`

        return this.http.delete<any>(url, {
            params: {
                room_id: id
            }
        })
    }

    getUserPublicKey(user_id: number): Observable<any> {
        // NOTA: isso não foi testado
        const url = `${this.baseUrl}/public_key_by_id`

        return this.http.get<any>(url, {
            params: {
                user_id: user_id
            }
        })
    }

    getUpdatedChats(user_name: string): Observable<any> {

        const url = `${this.baseUrl}/updatedChat`

        return this.http.get<any>(url, {
            params: {
                user_name: user_name
            }
        })
    }

    getUserRooms(user_id: number): Observable<any> {
        const url = `${this.baseUrl}/user_rooms`

        return this.http.get<any>(url, {
            params: {
                user_id: user_id
            }
        })
    }

    getAllUsersInChat(chat_id: number): Observable<any> {
        const url = `${this.baseUrl}/usernames_in_room`

        return this.http.get<any>(url, {
            params: {
                room_id: chat_id
            }
        })
    }

    getActiveUsersInChat(chat_id: number): Observable<any> {
        const url = `${this.baseUrl}/users_in_room`

        return this.http.get<any>(url, {
            params: {
                room_id: chat_id
            }
        })
    }

    getAllUsers(): Observable<any> {
        const url = `${this.baseUrl}/all_users`

        return this.http.get<any>(url, {
            params: {}
        })
    }

    getPublicKeyByUserId(userIdInput: number): Observable<any> {
        const url = `${this.baseUrl}/public_key_by_id`

        return this.http.get<any>(url, {
            params: {
                user_id: userIdInput
            }
        })
    }

    verify2FA(user_id: number, otpCode: string){
        const url = `${this.baseUrl}/auth`

        return this.http.get<any>(url, {
            params: {
                user_id: user_id,
                otpCode: otpCode
            }
        }
        )
    }
}
