import Database from './database.js';

const AutomationModule = {
    intervalId: null,

    getConfig() {
        const cfg = Database.data?.automationConfig || {};
        return {
            autoAssignMaster: cfg.autoAssignMaster !== false,
            clientReminders: cfg.clientReminders !== false,
            statusSmsEnabled: cfg.statusSmsEnabled !== false,
            statusTelegramEnabled: cfg.statusTelegramEnabled !== false,
            autoCloseOverdue: !!cfg.autoCloseOverdue,
            autoCloseDays: Math.max(1, Number(cfg.autoCloseDays || 14)),
            telegramWebhook: String(cfg.telegramWebhook || '').trim(),
            telegramBotToken: String(cfg.telegramBotToken || '').trim(),
            telegramChatId: String(cfg.telegramChatId || '').trim(),
            apiEnabled: cfg.apiEnabled !== false,
            backupEnabled: cfg.backupEnabled !== false,
            backupIntervalMin: Math.max(5, Number(cfg.backupIntervalMin || 60))
        };
    },

    logIntegration(type, payload = {}) {
        const list = Database.data.integrationLogs || (Database.data.integrationLogs = []);
        list.push({ id: Date.now() + Math.random(), at: new Date().toISOString(), type, payload });
        if (list.length > 500) list.splice(0, list.length - 500);
        Database.save();
    },

    autoAssignMasters() {
        const cfg = this.getConfig();
        if (!cfg.autoAssignMaster) return;
        const techs = (Database.query('users') || []).filter(u => u.role === 'technician');
        if (!techs.length) return;

        const statuses = Database.data?.orderStatuses || [];
        const finalIds = statuses.filter(s => s.isFinal).map(s => s.id);
        const orders = Database.query('orders') || [];
        const active = orders.filter(o => !finalIds.includes(o.status));

        active.forEach(order => {
            if (order.assignedMasterId) return;
            const load = techs.map(t => ({
                id: t.id,
                count: active.filter(o => Number(o.assignedMasterId) === Number(t.id)).length
            })).sort((a, b) => a.count - b.count);
            if (load[0]) {
                order.assignedMasterId = Number(load[0].id);
                this.logIntegration('auto_assign_master', { orderId: order.id, masterId: order.assignedMasterId });
            }
        });
        Database.save();
    },

    remindClients() {
        const cfg = this.getConfig();
        if (!cfg.clientReminders) return;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        (Database.query('orders') || []).forEach(order => {
            if (!order.dueAt) return;
            const dueTs = new Date(order.dueAt).getTime();
            if (!Number.isFinite(dueTs)) return;
            const diff = dueTs - now;
            if (diff < 0 || diff > oneDay) return;
            const last = new Date(order.lastReminderAt || 0).getTime();
            if (now - last < oneDay / 2) return;
            order.lastReminderAt = new Date().toISOString();
            const text = `Нагадування клієнту: замовлення ${order.number} заплановано до видачі ${new Date(order.dueAt).toLocaleString('uk-UA')}`;
            this.logIntegration('client_reminder', { orderId: order.id, text });
            this.sendTelegram(text);
        });
        Database.save();
    },

    autoCloseOverdue() {
        const cfg = this.getConfig();
        if (!cfg.autoCloseOverdue) return;
        const statuses = Database.data?.orderStatuses || [];
        const closedId = statuses.find(s => s.id === 'closed')?.id || statuses.find(s => s.isFinal)?.id || 'closed';
        const now = Date.now();
        const threshold = cfg.autoCloseDays * 24 * 60 * 60 * 1000;

        (Database.query('orders') || []).forEach(order => {
            if (order.status === closedId) return;
            const baseTs = new Date(order.dueAt || order.issuedAt || order.createdAt || Date.now()).getTime();
            if (!Number.isFinite(baseTs)) return;
            if (now - baseTs < threshold) return;
            order.status = closedId;
            order.closedAt = new Date().toISOString();
            this.logIntegration('auto_close_overdue', { orderId: order.id, status: closedId });
        });
        Database.save();
    },

    createBackup(reason = 'auto') {
        const cfg = this.getConfig();
        if (!cfg.backupEnabled) return null;
        const backups = Database.data.backups || (Database.data.backups = []);
        const snapshot = {
            id: Date.now(),
            at: new Date().toISOString(),
            reason,
            payload: JSON.parse(JSON.stringify(Database.data))
        };
        backups.push(snapshot);
        if (backups.length > 20) backups.splice(0, backups.length - 20);
        Database.save();
        this.logIntegration('backup_created', { id: snapshot.id, reason });
        return snapshot;
    },

    runTick() {
        this.autoAssignMasters();
        this.remindClients();
        this.autoCloseOverdue();
    },

    sendTelegram(text) {
        const cfg = this.getConfig();
        const webhook = cfg.telegramWebhook;
        const botToken = cfg.telegramBotToken;
        const chatId = cfg.telegramChatId;
        if (typeof fetch !== 'function') return;

        // Пріоритет: Telegram Bot API (token + chatId), fallback: webhook
        if (botToken && chatId) {
            const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text })
            }).then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok || data?.ok === false) {
                    throw new Error(data?.description || `HTTP ${r.status}`);
                }
                this.logIntegration('telegram_sent', { via: 'bot_api', text });
            }).catch((e) => {
                this.logIntegration('telegram_error', { via: 'bot_api', error: String(e) });
            });
            return;
        }

        if (webhook) {
            fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            }).then(() => {
                this.logIntegration('telegram_sent', { via: 'webhook', text });
            }).catch((e) => {
                this.logIntegration('telegram_error', { via: 'webhook', error: String(e) });
            });
        }
    },

    sendTelegramTestMessage() {
        const now = new Date().toLocaleString('uk-UA');
        this.sendTelegram(`✅ Тест Telegram інтеграції CRM (${now})`);
        this.logIntegration('telegram_test_sent', { at: new Date().toISOString() });
    },

    notifyOrderStatus(order, payload = {}) {
        if (!order) return;
        const cfg = this.getConfig();
        const prevStatus = payload.prevStatus || '—';
        const newStatus = payload.newStatus || order.status || '—';
        const clientName = payload.clientName || 'Клієнт';
        const phones = Array.isArray(payload.phones) ? payload.phones.filter(Boolean) : [];

        const text = `Замовлення ${order.number}: статус змінено ${prevStatus} → ${newStatus}. ${clientName}${phones.length ? ` (${phones.join(', ')})` : ''}`;

        if (cfg.statusSmsEnabled) {
            this.logIntegration('sms_status', {
                orderId: order.id,
                phones,
                text
            });
        }

        if (cfg.statusTelegramEnabled) {
            this.sendTelegram(text);
        }
    },

    applyTemplate(templateText, vars = {}) {
        let out = String(templateText || '');
        Object.entries(vars).forEach(([k, v]) => {
            out = out.split(`{{${k}}}`).join(String(v ?? ''));
        });
        return out;
    },

    sendOrderTemplateMessage(order, template, context = {}) {
        if (!order || !template) return;
        const cfg = this.getConfig();
        const text = this.applyTemplate(template.text, {
            orderNumber: context.orderNumber || order.number || '',
            clientName: context.clientName || '',
            device: context.device || '',
            status: context.status || order.status || '',
            toPay: context.toPay ?? ''
        });
        const phones = Array.isArray(context.phones) ? context.phones.filter(Boolean) : [];

        if (cfg.statusSmsEnabled) {
            this.logIntegration('sms_template', {
                orderId: order.id,
                templateId: template.id,
                phones,
                text
            });
        }
        if (cfg.statusTelegramEnabled) {
            this.sendTelegram(text);
        }
        this.logIntegration('template_message_sent', {
            orderId: order.id,
            templateId: template.id,
            viaSms: cfg.statusSmsEnabled,
            viaTelegram: cfg.statusTelegramEnabled
        });
    },

    registerApi() {
        const cfg = this.getConfig();
        if (!cfg.apiEnabled) return;
        window.ServiceProAPI = {
            getOrders: () => JSON.parse(JSON.stringify(Database.query('orders') || [])),
            getClients: () => JSON.parse(JSON.stringify(Database.query('clients') || [])),
            runAutomationTick: () => this.runTick(),
            createBackup: (reason = 'api') => this.createBackup(reason),
            getBackups: () => JSON.parse(JSON.stringify(Database.data.backups || []))
        };
    },

    start() {
        this.stop();
        this.registerApi();
        this.runTick();
        const ms = this.getConfig().backupIntervalMin * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.runTick();
            this.createBackup('scheduled');
        }, ms);
    },

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
    }
};

window.runAutomationNow = () => AutomationModule.runTick();
window.createManualBackup = () => AutomationModule.createBackup('manual');
window.sendTelegramTestMessage = () => AutomationModule.sendTelegramTestMessage();

export default AutomationModule;
