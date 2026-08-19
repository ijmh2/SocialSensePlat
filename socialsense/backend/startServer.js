import 'dotenv/config';
import { resolveAppMode } from './config/appMode.js';

// Load .env before evaluating route/config modules that read process.env.
const appMode = resolveAppMode();
console.log(`[Startup] Launching CommentIQ in ${appMode} mode`);
await import(appMode === 'full' ? './server.js' : './demoServer.js');
