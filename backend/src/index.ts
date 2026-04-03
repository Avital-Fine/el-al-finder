import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import alertsRouter from './api/alerts';
import { startScheduler } from './scheduler';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/alerts', alertsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  startScheduler();
});
