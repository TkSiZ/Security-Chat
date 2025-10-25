import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Chat } from '../../types/chats';

export interface UserState {
  id: number | null;
  name: string;
  chats: Chat[];
  currentChat: Chat | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  private readonly _state = new BehaviorSubject<UserState>({
    id: null,
    name: '',
    chats: [],
    currentChat: null,
  });

  state$ = this._state.asObservable();

  get state(): UserState {
    return this._state.value;
  }
  updateState(newState: Partial<UserState>) {
    const current = this._state.value;
    this._state.next({
      ...current,
      ...newState,
    });
  }

  addChat(idInput: number, nameInput: string, adminInput: number) {
    const state = this._state.value;
    const newChat: Chat = { id: idInput, name:nameInput, admin: adminInput };
    this._state.next({
      ...state,
      chats: [...state.chats, newChat],
    });
  }

  delState() {
    this._state.next({
      id: null,
      name: '',
      chats: [],
      currentChat: null,
    });
  }
}
