import Database from './database.js';

const ActivityLog = {
    add(action, details = {}) {
        const auditCfg = Database.data?.adminConfig?.audit || {};
        if (auditCfg.enabled === false) {
            return;
        }

        if (!Array.isArray(Database.data.userActionLogs)) {
            Database.data.userActionLogs = [];
        }

        const user = Database.data.user || null;
        Database.data.userActionLogs.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            at: new Date().toISOString(),
            action: String(action || '').trim() || 'unknown_action',
            userId: user?.id || null,
            userName: user?.name || 'Система',
            userRole: user?.role || 'system',
            details
        });

        const retentionDays = Math.max(1, Number(auditCfg.retentionDays || 365));
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        Database.data.userActionLogs = Database.data.userActionLogs.filter(l => {
            const ts = new Date(l.at).getTime();
            return Number.isFinite(ts) && (now - ts) <= retentionMs;
        });

        if (Database.data.userActionLogs.length > 5000) {
            Database.data.userActionLogs = Database.data.userActionLogs.slice(-5000);
        }

        Database.save();
    }
};

export default ActivityLog;
