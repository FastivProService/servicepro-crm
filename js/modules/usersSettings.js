import Database from './database.js';
import Auth from './auth.js';
import ActivityLog from './activityLog.js';
import { Modal, Toast } from './ui.js';
import { ROLE_LABELS } from './roleSettings.js';

const UsersSettingsModule = {
    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
        }

        const users = Database.query('users') || [];
        const isMobile = window.innerWidth < 768;

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Користувачі</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Майстри, менеджери та адміністратори</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 class="font-semibold text-lg text-cyan-400 flex items-center gap-2"><i class="fas fa-users-cog"></i> Список користувачів</h3>
                        <button onclick="window.usersOpenAddUserModal()" class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                            <i class="fas fa-user-plus"></i> Додати користувача
                        </button>
                    </div>
                    <div class="p-4 md:p-6">
                        ${users.length === 0
                            ? '<div class="text-center py-12 text-gray-500">Немає користувачів</div>'
                            : isMobile
                                ? `<div class="space-y-3">${users.map(u => this.renderUserCard(u)).join('')}</div>`
                                : `<div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-800/50 border-b border-gray-700"><tr><th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">ПІБ</th><th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">Логін</th><th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">Роль</th><th class="px-4 md:px-6 py-3 text-right text-sm font-medium text-gray-400">Дії</th></tr></thead><tbody class="divide-y divide-gray-800">${users.map(u => this.renderUserRow(u)).join('')}</tbody></table></div>`}
                    </div>
                </div>
            </div>
        `;
    },

    getRoleBadgeClass(role) {
        const classes = {
            admin: 'bg-red-500/20 text-red-400',
            manager: 'bg-yellow-500/20 text-yellow-400',
            technician: 'bg-green-500/20 text-green-400'
        };
        return classes[role] || 'bg-gray-600 text-gray-400';
    },

    renderUserRow(user) {
        return `<tr class="hover:bg-gray-800/30 transition-colors"><td class="px-4 md:px-6 py-4 font-medium">${user.name}</td><td class="px-4 md:px-6 py-4 text-gray-400 font-mono text-sm">${user.login}</td><td class="px-4 md:px-6 py-4"><span class="px-2 py-1 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span></td><td class="px-4 md:px-6 py-4 text-right"><button onclick="window.usersEditUser(${user.id})" class="text-blue-400 hover:text-blue-300 p-2 mr-1"><i class="fas fa-edit"></i></button><button onclick="window.usersDeleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 p-2"><i class="fas fa-trash"></i></button></td></tr>`;
    },

    renderUserCard(user) {
        return `<div class="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center"><div><div class="font-semibold">${user.name}</div><div class="text-sm text-gray-400 font-mono">${user.login}</div><span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span></div><div class="flex gap-2"><button onclick="window.usersEditUser(${user.id})" class="p-2 text-blue-400 rounded-lg hover:bg-blue-500/20"><i class="fas fa-edit"></i></button><button onclick="window.usersDeleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')" class="p-2 text-red-400 rounded-lg hover:bg-red-500/20"><i class="fas fa-trash"></i></button></div></div>`;
    },

    showAddUserModal() {
        Modal.open(`<div class="p-6"><h3 class="text-xl font-bold mb-4">Додати користувача</h3><form onsubmit="window.usersSaveNewUser(event)" class="space-y-4"><input id="userName" required placeholder="ПІБ" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><input id="userLogin" required placeholder="Логін" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><select id="userRole" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><option value="technician">Майстер</option><option value="manager">Менеджер</option><option value="admin">Адміністратор</option></select><input id="userPassword" type="password" placeholder="Пароль (необов'язково)" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><div class="flex gap-3 mt-6"><button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg text-white font-semibold">Додати</button><button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button></div></form></div>`);
    },

    showEditUserModal(id) {
        const user = Database.find('users', id);
        if (!user) return;
        Modal.open(`<div class="p-6"><h3 class="text-xl font-bold mb-4">Редагувати користувача</h3><form onsubmit="window.usersSaveEditedUser(event, ${id})" class="space-y-4"><input id="editUserName" required value="${user.name}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><input id="editUserLogin" required value="${user.login}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><select id="editUserRole" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><option value="technician" ${user.role === 'technician' ? 'selected' : ''}>Майстер</option><option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Менеджер</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адміністратор</option></select><input id="editUserPassword" type="password" placeholder="Новий пароль (необов'язково)" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3"><div class="flex gap-3 mt-6"><button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-semibold">Зберегти</button><button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button></div></form></div>`);
    },

    addUser(data) {
        const users = Database.query('users') || [];
        if (users.some(u => u.login === data.login)) return false;
        Database.create('users', { name: data.name, login: data.login, role: data.role, password: data.password || '', createdAt: new Date().toISOString() });
        ActivityLog.add('user_add', { login: data.login, role: data.role });
        return true;
    },

    updateUser(id, data) {
        const users = Database.query('users') || [];
        if (users.some(u => u.login === data.login && u.id !== id)) return false;
        const updates = { name: data.name, login: data.login, role: data.role };
        if (data.password) updates.password = data.password;
        Database.update('users', id, updates);
        ActivityLog.add('user_update', { userId: id, login: data.login, role: data.role });
        return true;
    },

    removeUser(id) {
        const user = Database.find('users', id);
        Database.delete('users', id);
        ActivityLog.add('user_delete', { userId: id, login: user?.login || '' });
    }
};

window.usersOpenAddUserModal = () => UsersSettingsModule.showAddUserModal();
window.usersEditUser = (id) => UsersSettingsModule.showEditUserModal(id);
window.usersDeleteUser = (id, name) => {
    if (!confirm(`Видалити користувача "${name}"?`)) return;
    UsersSettingsModule.removeUser(id);
    Toast.show('Користувача видалено', 'info');
    import('./router.js').then(m => m.default.navigate('usersSettings'));
};
window.usersSaveNewUser = (e) => {
    e.preventDefault();
    const data = { name: document.getElementById('userName').value.trim(), login: document.getElementById('userLogin').value.trim().toLowerCase(), role: document.getElementById('userRole').value, password: document.getElementById('userPassword')?.value || '' };
    if (!UsersSettingsModule.addUser(data)) return Toast.show('Логін вже існує', 'error');
    Modal.close();
    Toast.show('Користувача додано', 'success');
    import('./router.js').then(m => m.default.navigate('usersSettings'));
};
window.usersSaveEditedUser = (e, id) => {
    e.preventDefault();
    const data = { name: document.getElementById('editUserName').value.trim(), login: document.getElementById('editUserLogin').value.trim().toLowerCase(), role: document.getElementById('editUserRole').value, password: document.getElementById('editUserPassword')?.value || '' };
    if (!UsersSettingsModule.updateUser(id, data)) return Toast.show('Логін вже існує', 'error');
    Modal.close();
    Toast.show('Зміни збережено', 'success');
    import('./router.js').then(m => m.default.navigate('usersSettings'));
};

export default UsersSettingsModule;
