"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const alerts_1 = __importDefault(require("./api/alerts"));
const scheduler_1 = require("./scheduler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/alerts', alerts_1.default);
app.get('/health', (_req, res) => res.json({ ok: true }));
const PORT = parseInt(process.env.PORT ?? '3001', 10);
app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
    (0, scheduler_1.startScheduler)();
});
