import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { ChatComponent } from './components/chat/chat.component';
import { Register } from './pages/register/register';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {path: 'register', component: Register},
  { path: 'home/:username', component: HomeComponent },
  { path: 'chat/:chatid', component:ChatComponent}
];
