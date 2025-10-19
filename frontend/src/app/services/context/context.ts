import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Chat } from '../../types/chats';

export interface UserState {
  name: string;
  chats: Chat[];
  currentChat: Chat | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  private readonly _state = new BehaviorSubject<UserState>({
    name: '',
    chats: [],
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
  addChat(name: string) {
    const state = this._state.value;
    const nextId =
      state.chats.length > 0
        ? Math.max(...state.chats.map((c) => c.id)) + 1
        : 1;

    const newChat: Chat = { id: nextId, name };
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
      name: '',
      chats: [],
      currentChat: null,
    });
  }
}
