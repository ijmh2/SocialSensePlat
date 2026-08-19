import 'dotenv/config';

// Load .env before evaluating route/config modules that read process.env.
await import('./server.js');
