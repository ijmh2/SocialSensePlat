import 'dotenv/config';
import { createDemoApp } from './demoApp.js';

const app = createDemoApp();
const port = Number(process.env.PORT) || 3001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`CommentIQ LLM API running on port ${port}`);
  });
}

export default app;
