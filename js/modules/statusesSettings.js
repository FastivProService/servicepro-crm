import Database from './database.js';
import Auth from './auth.js';
import ActivityLog from './activityLog.js';
import { Modal, Toast } from './ui.js';

const StatusesSettingsModule = {
    getOrderStatuses() {
        return Array.isArray(Database.data?.orderStatuses) ? Database.data.orderStatuses : [];
    },

    saveOrderStatuses(statuses) {
        Database.data.orderStatuses = statuses;
        Database.save();
    },

    slugifyStatusId(name) {
        return (name || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-zа-яіїєґ0-9]+/gi, '_')
            .replace(/^_+|_+$/g, '') || `status_${Date.now()}`;
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
        }

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Статуси замовлень</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Керування статусами для замовлень</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 class="font-semibold text-lg text-violet-400 flex items-center gap-2"><i class="fas fa-tasks"></i> Список статусів</h3>
                        <button onclick="window.statusesOpenAddModal()" class="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                            <i class="fas fa-plus"></i> Додати статус
                        </button>
                    </div>
                    <div class="p-4 md:p-6 space-y-2">
                        ${this.getOrderStatuses().map(s => `
                            <div class="flex items-center justify-between gap-3 bg-gray-900 p-3 rounded-lg border border-gray-700">
                                <div class="flex items-center gap-3">
                                    <span class="px-2 py-1 rounded-full text-xs ${s.colorClass || 'bg-gray-700 text-gray-300'}">${s.name}</span>
                                    <span class="text-xs text-gray-500 font-mono">${s.id}</span>
                                    ${s.isFinal ? '<span class="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300">Фінальний</span>' : ''}
                                    ${s.isReady ? '<span class="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-300">Готовий</span>' : ''}
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="window.statusesEdit('${s.id}')" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg">Змінити</button>
                                    <button onclick="window.statusesDelete('${s.id}')" class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-lg">Видалити</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    openAddModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати статус</h3>
                <form onsubmit="window.statusesSaveNew(event)" class="space-y-4">
                    <input id="statusName" required placeholder="Назва статусу" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="statusFinal"> Фінальний статус</label>
                        <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="statusReady"> Статус готовності</label>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-violet-600 hover:bg-violet-700 py-3 rounded-lg text-white font-semibold">Додати</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    addStatus(data) {
        const statuses = this.getOrderStatuses();
        const id = this.slugifyStatusId(data.name);
        if (statuses.some(s => s.id === id || s.name.toLowerCase() === data.name.toLowerCase())) return false;
        statuses.push({
            id,
            name: data.name,
            colorClass: data.isFinal ? 'bg-red-500/20 text-red-400' : (data.isReady ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'),
            borderClass: data.isFinal ? 'border-red-500' : (data.isReady ? 'border-green-500' : 'border-gray-600'),
            isFinal: !!data.isFinal,
            isReady: !!data.isReady
        });
        this.saveOrderStatuses(statuses);
        ActivityLog.add('order_status_add', { id, name: data.name });
        return true;
    },

    openEditModal(id) {
        const status = this.getOrderStatuses().find(s => s.id === id);
        if (!status) return;
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати статус</h3>
                <form onsubmit="window.statusesSaveEdited(event, '${status.id}')" class="space-y-4">
                    <input id="editStatusName" required value="${status.name.replace(/"/g, '&quot;')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="editStatusFinal" ${status.isFinal ? 'checked' : ''}> Фінальний статус</label>
                        <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="editStatusReady" ${status.isReady ? 'checked' : ''}> Статус готовності</label>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-semibold">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    updateStatus(id, data) {
        const statuses = this.getOrderStatuses();
        const st = statuses.find(s => s.id === id);
        if (!st) return false;
        st.name = data.name;
        st.isFinal = !!data.isFinal;
        st.isReady = !!data.isReady;
        st.colorClass = st.isFinal ? 'bg-red-500/20 text-red-400' : (st.isReady ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300');
        st.borderClass = st.isFinal ? 'border-red-500' : (st.isReady ? 'border-green-500' : 'border-gray-600');
        this.saveOrderStatuses(statuses);
        ActivityLog.add('order_status_update', { id, name: data.name });
        return true;
    },

    deleteStatus(id) {
        const statuses = this.getOrderStatuses();
        if (statuses.length <= 1) return false;
        const deleted = statuses.find(s => s.id === id);
        const nextStatuses = statuses.filter(s => s.id !== id);
        this.saveOrderStatuses(nextStatuses);
        const fallback = nextStatuses[0]?.id;
        (Database.query('orders') || []).forEach(o => {
            if (o.status === id) o.status = fallback;
        });
        Database.save();
        ActivityLog.add('order_status_delete', { id, name: deleted?.name || '' });
        return true;
    }
};

window.statusesOpenAddModal = () => StatusesSettingsModule.openAddModal();
window.statusesSaveNew = (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('statusName').value.trim(),
        isFinal: document.getElementById('statusFinal').checked,
        isReady: document.getElementById('statusReady').checked
    };
    if (!StatusesSettingsModule.addStatus(data)) return Toast.show('Такий статус вже існує', 'warning');
    Modal.close();
    Toast.show('Статус додано', 'success');
    import('./router.js').then(m => m.default.navigate('statusesSettings'));
};
window.statusesEdit = (id) => StatusesSettingsModule.openEditModal(id);
window.statusesSaveEdited = (e, id) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('editStatusName').value.trim(),
        isFinal: document.getElementById('editStatusFinal').checked,
        isReady: document.getElementById('editStatusReady').checked
    };
    if (!StatusesSettingsModule.updateStatus(id, data)) return Toast.show('Не вдалося оновити', 'error');
    Modal.close();
    Toast.show('Статус оновлено', 'success');
    import('./router.js').then(m => m.default.navigate('statusesSettings'));
};
window.statusesDelete = (id) => {
    if (!confirm('Видалити цей статус?')) return;
    if (!StatusesSettingsModule.deleteStatus(id)) return Toast.show('Має залишитись хоча б один статус', 'warning');
    Toast.show('Статус видалено', 'info');
    import('./router.js').then(m => m.default.navigate('statusesSettings'));
};

export default StatusesSettingsModule;
