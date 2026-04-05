"use strict";
// PATH: C:\wsd-server\src\routes\index.ts
// Main Router - Registers all API routes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const project_routes_1 = __importDefault(require("./project.routes"));
const client_routes_1 = __importDefault(require("./client.routes"));
const task_routes_1 = __importDefault(require("./task.routes"));
const team_routes_1 = __importDefault(require("./team.routes"));
const invoice_routes_1 = __importDefault(require("./invoice.routes"));
const payment_routes_1 = __importDefault(require("./payment.routes"));
const message_routes_1 = __importDefault(require("./message.routes"));
const stats_routes_1 = __importDefault(require("./stats.routes"));
const ticket_routes_1 = __importDefault(require("./ticket.routes"));
const lead_routes_1 = __importDefault(require("./lead.routes"));
const service_routes_1 = __importDefault(require("./service.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/projects', project_routes_1.default);
router.use('/clients', client_routes_1.default);
router.use('/tasks', task_routes_1.default);
router.use('/team', team_routes_1.default);
router.use('/invoices', invoice_routes_1.default);
router.use('/payments', payment_routes_1.default);
router.use('/messages', message_routes_1.default);
router.use('/stats', stats_routes_1.default);
router.use('/tickets', ticket_routes_1.default);
router.use('/leads', lead_routes_1.default);
router.use('/services', service_routes_1.default);
exports.default = router;
