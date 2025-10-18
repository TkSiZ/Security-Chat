import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserContext } from '../../types/userContext';

@Injectable({
  providedIn: 'root'
})

export class UserContextService {
  // TO DO CHANGE THIS TO GET DATA FROM THE API
  private _state = new BehaviorSubject<UserContext>({
    name: "Matheus Takashi",
    chats: [{id:1, name:"Grupo do zap"}, {id:2, name:"Grupo do zap"}],
    currentChat: null
  })

  state$ = this._state.asObservable();

  updateState(partial: Partial<UserContext>){
    this._state.next({...this._state.value, ...partial})
  }

  getState(){
    return this._state.value
  }
}
