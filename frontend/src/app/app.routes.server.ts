import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'home/:username',
    renderMode: RenderMode.Server
  },
  {
    path: 'chat/:chatid',
    renderMode: RenderMode.Server
  }
];
