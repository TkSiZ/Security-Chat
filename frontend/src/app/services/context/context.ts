import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Chat } from '../../types/chats';

export interface UserState {
  id: number | null;
  name: string;
  chats: Chat[];
  public_key: string
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
    public_key: '',
    currentChat: null,
  });

  // estado observável
  state$ = this._state.asObservable();

  // retorna o estado atual (getter)
  get state(): UserState {
    return this._state.value;
  }

  // atualiza parte do estado (merge)
  updateState(newState: Partial<UserState>) {
    const current = this._state.value;
    this._state.next({
      ...current,
      ...newState,
    });
  }

  // ✅ Adiciona um novo chat
  addChat(idInput: number, nameInput: string, adminInput: number) {
    const state = this._state.value;
    const newChat: Chat = { id: idInput, name:nameInput, admin: adminInput };
    this._state.next({
      ...state,
      chats: [...state.chats, newChat],
    });
  }

  // ✅ Conecta a um chat existente (por nome ou id)
  connectChat(identifier: string | number) {
    const state = this._state.value;
    let found: Chat | undefined;

    if (typeof identifier === 'number' || /^\d+$/.test(String(identifier))) {
      const idNum = Number(identifier);
      found = state.chats.find((c) => c.id === idNum);
    } else {
      found = state.chats.find((c) => c.name === identifier);
    }

    // Atualiza apenas se encontrar
    if (found) {
      this._state.next({
        ...state,
        currentChat: found,
      });
    }
  }

  // 🔥 Reseta o contexto completamente (logout)
  delState() {
    this._state.next({
      id: null,
      name: '',
      public_key: '',
      chats: [],
      currentChat: null,
    });
  }
}
