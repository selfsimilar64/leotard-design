// The single App instance, shared by the UI and exposed as window.app.
import { App } from './app.js';

export const app = new App();
window.app = app;
