import Database from './database.js';

const ActivityLogPage = {
    getLogs() {
        return (Database.data?.userActionLogs || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    },

    getActionLabel(action) {
        const map = {
            login: 'Вхід в систему',
            user_add: 'Додано користувача',
            user_update: 'Оновлено користувача',
            user_delete: 'Видалено користувача',
            order_status_add: 'Додано статус замовлення',
            order_status_update: 'Оновлено статус замовлення',
            order_status_delete: 'Видалено статус замовлення',
            order_create: 'Створено замовлення',
            admin_config_update: 'Оновлено адмін-конфігурацію'
        };
        return map[action] || action;
    },

    render() {
        const logs = this.getLogs();
        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Журнал дій користувачів</h2>
                        <p class="text-sm text-gray-500 mt-1">Останні дії в системі</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden border-l-4 border-indigo-500 p-4 md:p-6">
                    <div class="space-y-2 max-h-[70vh] overflow-y-auto">
                        ${logs.map(l => `
                            <div class="bg-gray-900 rounded-lg border border-gray-700 p-3">
                                <div class="flex justify-between gap-3 items-start">
                                    <div>
                                        <div class="font-medium text-sm">${this.getActionLabel(l.action)}</div>
                                        <div class="text-xs text-gray-400">${l.userName || 'Система'} (${l.userRole || 'system'})</div>
                                        ${l.details ? `<div class="text-xs text-gray-500 mt-1">${Object.entries(l.details).map(([k,v]) => `${k}: ${v}`).join(' · ')}</div>` : ''}
                                    </div>
                                    <div class="text-xs text-gray-500 whitespace-nowrap">${new Date(l.at).toLocaleString('uk-UA')}</div>
                                </div>
                            </div>
                        `).join('') || '<div class="text-gray-500">Лог порожній</div>'}
                    </div>
                </div>
            </div>
        `;
    }
};

export default ActivityLogPage;
