import Database from './database.js';
import Auth from './auth.js';
import ActivityLog from './activityLog.js';
import { Toast } from './ui.js';

const NotificationsModule = {
    getTemplates() {
        return Array.isArray(Database.data?.messageTemplates) ? Database.data.messageTemplates : [];
    },

    saveTemplates(list) {
        Database.data.messageTemplates = list;
        Database.save();
        ActivityLog.add('message_templates_update', { count: list.length });
    },

    getAutomationConfig() {
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
            remoteSyncEnabled: !!cfg.remoteSyncEnabled,
            remoteSyncUrl: String(cfg.remoteSyncUrl || '').trim(),
            remoteSyncApiKey: String(cfg.remoteSyncApiKey || '').trim(),
            remoteSyncIntervalSec: Math.max(10, Number(cfg.remoteSyncIntervalSec || 30)),
            apiEnabled: cfg.apiEnabled !== false,
            backupEnabled: cfg.backupEnabled !== false,
            backupIntervalMin: Math.max(5, Number(cfg.backupIntervalMin || 60))
        };
    },

    saveAutomationConfig(cfg) {
        Database.data.automationConfig = cfg;
        Database.save();
        ActivityLog.add('automation_config_update', {
            autoAssignMaster: cfg.autoAssignMaster,
            clientReminders: cfg.clientReminders,
            statusSmsEnabled: cfg.statusSmsEnabled,
            statusTelegramEnabled: cfg.statusTelegramEnabled,
            autoCloseOverdue: cfg.autoCloseOverdue,
            autoCloseDays: cfg.autoCloseDays,
            telegramWebhook: cfg.telegramWebhook ? '[set]' : '',
            telegramBotToken: cfg.telegramBotToken ? '[set]' : '',
            telegramChatId: cfg.telegramChatId ? '[set]' : ''
        });
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
        }

        const automation = this.getAutomationConfig();
        const templates = this.getTemplates();

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">SMS / Telegram повідомлення</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Окрема сторінка налаштувань сповіщень та автоматизації</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden border-l-4 border-cyan-500">
                    <div class="bg-cyan-900/20 px-4 md:px-6 py-4 border-b border-gray-700">
                        <h3 class="font-semibold text-lg text-cyan-400 flex items-center gap-2">
                            <i class="fas fa-bell"></i> Налаштування сповіщень
                        </h3>
                    </div>
                    <div class="p-4 md:p-6 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center gap-2 text-sm"><input id="cfgAutoAssignMaster" type="checkbox" ${automation.autoAssignMaster ? 'checked' : ''}> Автопризначення майстра</label>
                            <label class="flex items-center gap-2 text-sm"><input id="cfgClientReminders" type="checkbox" ${automation.clientReminders ? 'checked' : ''}> Нагадування клієнтам</label>
                            <label class="flex items-center gap-2 text-sm"><input id="cfgStatusSmsEnabled" type="checkbox" ${automation.statusSmsEnabled ? 'checked' : ''}> SMS-лог про зміну статусу</label>
                            <label class="flex items-center gap-2 text-sm"><input id="cfgStatusTelegramEnabled" type="checkbox" ${automation.statusTelegramEnabled ? 'checked' : ''}> Telegram про зміну статусу</label>
                            <label class="flex items-center gap-2 text-sm"><input id="cfgAutoCloseOverdue" type="checkbox" ${automation.autoCloseOverdue ? 'checked' : ''}> Автозакриття прострочених</label>
                            <input id="cfgAutoCloseDays" type="number" min="1" step="1" value="${automation.autoCloseDays}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Днів до автозакриття">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input id="cfgTelegramWebhook" type="text" value="${automation.telegramWebhook.replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Telegram webhook URL">
                            <input id="cfgTelegramBotToken" type="text" value="${automation.telegramBotToken.replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Telegram bot token (123:ABC...)">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input id="cfgTelegramChatId" type="text" value="${automation.telegramChatId.replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Telegram chat_id (наприклад: -100...)" >
                            <input id="cfgBackupIntervalMin" type="number" min="5" step="1" value="${automation.backupIntervalMin}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Інтервал backup, хв">
                        </div>
                        <div class="border-t border-gray-700 pt-4 mt-2">
                            <h4 class="text-sm font-semibold text-cyan-300 mb-3"><i class="fas fa-database mr-2"></i>Синхронізація сховища між пристроями</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label class="flex items-center gap-2 text-sm"><input id="cfgRemoteSyncEnabled" type="checkbox" ${automation.remoteSyncEnabled ? 'checked' : ''}> Увімкнути віддалену синхронізацію</label>
                                <input id="cfgRemoteSyncIntervalSec" type="number" min="10" step="1" value="${automation.remoteSyncIntervalSec}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Інтервал sync, сек">
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                <input id="cfgRemoteSyncUrl" type="text" value="${automation.remoteSyncUrl.replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="URL API стану (напр. https://server/api/state)">
                                <input id="cfgRemoteSyncApiKey" type="text" value="${automation.remoteSyncApiKey.replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="API Key (опціонально)">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label class="flex items-center gap-2 text-sm"><input id="cfgApiEnabled" type="checkbox" ${automation.apiEnabled ? 'checked' : ''}> Увімкнути API</label>
                            <label class="flex items-center gap-2 text-sm"><input id="cfgBackupEnabled" type="checkbox" ${automation.backupEnabled ? 'checked' : ''}> Увімкнути авторезервні копії</label>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="window.saveAutomationConfig()" class="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-semibold">Зберегти налаштування</button>
                            <button onclick="window.sendTelegramTestMessage()" class="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold">Тест Telegram</button>
                            <button onclick="window.syncRemoteNow()" class="bg-sky-600 hover:bg-sky-700 px-4 py-2 rounded-lg font-semibold">Sync зараз</button>
                            <button onclick="window.runAutomationNow()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold">Запустити зараз</button>
                            <button onclick="window.createManualBackup()" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold">Створити backup</button>
                        </div>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden border-l-4 border-violet-500 mt-6">
                    <div class="bg-violet-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 class="font-semibold text-lg text-violet-400 flex items-center gap-2">
                            <i class="fas fa-envelope-open-text"></i> Макети повідомлень
                        </h3>
                        <button onclick="window.addMessageTemplate()" class="bg-violet-600 hover:bg-violet-700 px-3 py-2 rounded-lg text-sm font-semibold">
                            <i class="fas fa-plus"></i> Додати макет
                        </button>
                    </div>
                    <div class="p-4 md:p-6 space-y-3">
                        <div class="text-xs text-gray-500">Доступні змінні: {{orderNumber}}, {{clientName}}, {{device}}, {{status}}, {{toPay}}</div>
                        ${templates.map((t, i) => `
                            <div class="bg-gray-900 border border-gray-700 rounded-lg p-3">
                                <div class="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                                    <input id="tplName_${i}" value="${String(t.name || '').replace(/"/g, '&quot;')}" class="md:col-span-2 bg-gray-800 border border-gray-700 rounded px-3 py-2" placeholder="Назва макету">
                                    <input id="tplId_${i}" value="${String(t.id || '').replace(/"/g, '&quot;')}" class="md:col-span-2 bg-gray-800 border border-gray-700 rounded px-3 py-2" placeholder="ID (латиниця)">
                                    <button onclick="window.saveMessageTemplates()" class="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">Зберегти</button>
                                    <button onclick="window.removeMessageTemplate(${i})" class="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm">Видалити</button>
                                </div>
                                <textarea id="tplText_${i}" rows="3" class="mt-2 w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" placeholder="Текст повідомлення">${String(t.text || '')}</textarea>
                            </div>
                        `).join('') || '<div class="text-gray-500">Ще немає макетів</div>'}
                    </div>
                </div>
            </div>
        `;
    },

    saveFromUI() {
        const cfg = {
            autoAssignMaster: !!document.getElementById('cfgAutoAssignMaster')?.checked,
            clientReminders: !!document.getElementById('cfgClientReminders')?.checked,
            statusSmsEnabled: !!document.getElementById('cfgStatusSmsEnabled')?.checked,
            statusTelegramEnabled: !!document.getElementById('cfgStatusTelegramEnabled')?.checked,
            autoCloseOverdue: !!document.getElementById('cfgAutoCloseOverdue')?.checked,
            autoCloseDays: Math.max(1, Number(document.getElementById('cfgAutoCloseDays')?.value || 14)),
            telegramWebhook: String(document.getElementById('cfgTelegramWebhook')?.value || '').trim(),
            telegramBotToken: String(document.getElementById('cfgTelegramBotToken')?.value || '').trim(),
            telegramChatId: String(document.getElementById('cfgTelegramChatId')?.value || '').trim(),
            remoteSyncEnabled: !!document.getElementById('cfgRemoteSyncEnabled')?.checked,
            remoteSyncUrl: String(document.getElementById('cfgRemoteSyncUrl')?.value || '').trim(),
            remoteSyncApiKey: String(document.getElementById('cfgRemoteSyncApiKey')?.value || '').trim(),
            remoteSyncIntervalSec: Math.max(10, Number(document.getElementById('cfgRemoteSyncIntervalSec')?.value || 30)),
            apiEnabled: !!document.getElementById('cfgApiEnabled')?.checked,
            backupEnabled: !!document.getElementById('cfgBackupEnabled')?.checked,
            backupIntervalMin: Math.max(5, Number(document.getElementById('cfgBackupIntervalMin')?.value || 60))
        };
        this.saveAutomationConfig(cfg);
        Toast.show('Налаштування сповіщень збережено', 'success');
        import('./router.js').then(m => m.default.navigate('notifications'));
    },

    addTemplate() {
        const list = this.getTemplates();
        list.push({ id: `template_${Date.now()}`, name: 'Новий макет', text: 'Замовлення {{orderNumber}}: статус {{status}}' });
        this.saveTemplates(list);
        import('./router.js').then(m => m.default.navigate('notifications'));
    },

    removeTemplate(index) {
        const list = this.getTemplates();
        list.splice(index, 1);
        this.saveTemplates(list);
        import('./router.js').then(m => m.default.navigate('notifications'));
    },

    saveTemplatesFromUI() {
        const old = this.getTemplates();
        const next = old.map((t, i) => ({
            id: String(document.getElementById(`tplId_${i}`)?.value || t.id || `template_${i}`).trim(),
            name: String(document.getElementById(`tplName_${i}`)?.value || t.name || `Макет ${i + 1}`).trim(),
            text: String(document.getElementById(`tplText_${i}`)?.value || t.text || '').trim()
        })).filter(t => t.id && t.name && t.text);
        this.saveTemplates(next);
        Toast.show('Макети повідомлень збережено', 'success');
        import('./router.js').then(m => m.default.navigate('notifications'));
    }
};

window.saveAutomationConfig = () => NotificationsModule.saveFromUI();
window.addMessageTemplate = () => NotificationsModule.addTemplate();
window.removeMessageTemplate = (i) => NotificationsModule.removeTemplate(i);
window.saveMessageTemplates = () => NotificationsModule.saveTemplatesFromUI();

export default NotificationsModule;
