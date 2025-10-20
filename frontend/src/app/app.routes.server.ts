import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
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
