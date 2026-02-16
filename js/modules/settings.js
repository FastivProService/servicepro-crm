import Database from './database.js';
import Auth from './auth.js';
import { Modal, Toast } from './ui.js';

const AVAILABLE_PERMISSIONS = [
    { id: 'all', label: 'Повний доступ' },
    { id: 'orders', label: 'Замовлення' },
    { id: 'clients', label: 'Клієнти' },
    { id: 'inventory', label: 'Склад' },
    { id: 'services', label: 'Послуги' },
    { id: 'finance', label: 'Фінанси' },
    { id: 'view', label: 'Перегляд' },
    { id: 'settings', label: 'Налаштування' }
];

const AVAILABLE_MENU_ITEMS = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'orders', label: 'Замовлення' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'inventory', label: 'Склад' },
    { id: 'services', label: 'Послуги' },
    { id: 'clients', label: 'Клієнти' },
    { id: 'finance', label: 'Фінанси' },
    { id: 'settings', label: 'Налаштування' }
];

const DEFAULT_ROLE_CONFIG = {
    admin: { name: 'Адміністратор', permissions: ['all'], menu: ['dashboard', 'orders', 'kanban', 'inventory', 'services', 'clients', 'finance', 'settings'] },
    manager: { name: 'Менеджер', permissions: ['orders', 'clients', 'view'], menu: ['dashboard', 'orders', 'kanban', 'clients', 'finance'] },
    technician: { name: 'Майстер', permissions: ['orders', 'view'], menu: ['dashboard', 'orders', 'kanban', 'inventory'] }
};

const ROLE_LABELS = {
    admin: 'Адміністратор',
    manager: 'Менеджер',
    technician: 'Майстер'
};

const SettingsModule = {
    getRoleConfig() {
        const config = Database.data.roleConfig;
        return config ? { ...DEFAULT_ROLE_CONFIG, ...config } : { ...DEFAULT_ROLE_CONFIG };
    },

    saveRoleConfig(config) {
        Database.data.roleConfig = config;
        Database.save();
        Auth.loadRoleConfig();
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу до налаштувань</div>`;
        }

        const roleConfig = this.getRoleConfig();
        const users = Database.query('users') || [];
        const isMobile = window.innerWidth < 768;

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <h2 class="text-2xl md:text-3xl font-bold mb-6">Налаштування</h2>
                
                <div class="space-y-8">
                    <!-- Ролі та права -->
                    <div class="glass rounded-xl overflow-hidden">
                        <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700">
                            <h3 class="font-semibold text-lg text-amber-400 flex items-center gap-2">
                                <i class="fas fa-user-shield"></i> Налаштування ролей
                            </h3>
                            <p class="text-sm text-gray-500 mt-1">Налаштуйте права доступу для кожної ролі</p>
                        </div>
                        <div class="p-4 md:p-6 space-y-6">
                            ${['admin', 'manager', 'technician'].map(roleKey => this.renderRoleSection(roleKey, roleConfig[roleKey])).join('')}
                        </div>
                    </div>

                    <!-- Користувачі -->
                    <div class="glass rounded-xl overflow-hidden">
                        <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-cyan-400 flex items-center gap-2">
                                    <i class="fas fa-users-cog"></i> Користувачі
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Майстри, менеджери та адміністратори</p>
                            </div>
                            <button onclick="window.openAddUserModal()" class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-user-plus"></i> Додати користувача
                            </button>
                        </div>
                        <div class="p-4 md:p-6">
                            ${users.length === 0 
                                ? '<div class="text-center py-12 text-gray-500">Немає користувачів. Додайте майстрів або адміністраторів.</div>'
                                : isMobile 
                                    ? `<div class="space-y-3">${users.map(u => this.renderUserCard(u)).join('')}</div>`
                                    : `
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead class="bg-gray-800/50 border-b border-gray-700">
                                        <tr>
                                            <th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">ПІБ</th>
                                            <th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">Логін</th>
                                            <th class="px-4 md:px-6 py-3 text-left text-sm font-medium text-gray-400">Роль</th>
                                            <th class="px-4 md:px-6 py-3 text-right text-sm font-medium text-gray-400">Дії</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-800">
                                        ${users.map(u => this.renderUserRow(u)).join('')}
                                    </tbody>
                                </table>
                            </div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderRoleSection(roleKey, role) {
        const permItems = AVAILABLE_PERMISSIONS.filter(p => p.id !== 'all' || roleKey === 'admin');
        const menuItems = AVAILABLE_MENU_ITEMS.filter(m => m.id !== 'settings' || roleKey === 'admin');
        
        const permsHtml = permItems.map(p => {
            const checked = role.permissions?.includes(p.id) || role.permissions?.includes('all');
            return `
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                    <input type="checkbox" data-role="${roleKey}" data-perm="${p.id}" 
                        ${checked ? 'checked' : ''} 
                        class="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900">
                    <span class="text-sm">${p.label}</span>
                </label>
            `;
        }).join('');

        const menuHtml = menuItems.map(m => {
            const checked = role.menu?.includes(m.id);
            return `
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 cursor-pointer">
                    <input type="checkbox" data-role="${roleKey}" data-menu="${m.id}" 
                        ${checked ? 'checked' : ''} 
                        class="rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900">
                    <span class="text-sm">${m.label}</span>
                </label>
            `;
        }).join('');

        return `
            <div class="border border-gray-700 rounded-xl p-4 md:p-5 bg-gray-900/50">
                <h4 class="font-semibold text-lg mb-4 text-white flex items-center gap-2">
                    <i class="fas fa-user-tag text-blue-400"></i> ${ROLE_LABELS[roleKey]}
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div class="text-xs text-gray-400 mb-2 uppercase tracking-wide">Права доступу</div>
                        <div class="flex flex-wrap gap-1">
                            ${permsHtml}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 mb-2 uppercase tracking-wide">Пункти меню</div>
                        <div class="flex flex-wrap gap-1">
                            ${menuHtml}
                        </div>
                    </div>
                </div>
                <button onclick="window.saveRoleConfig('${roleKey}')" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                    Зберегти зміни
                </button>
            </div>
        `;
    },

    renderUserRow(user) {
        return `
            <tr class="hover:bg-gray-800/30 transition-colors">
                <td class="px-4 md:px-6 py-4 font-medium">${user.name}</td>
                <td class="px-4 md:px-6 py-4 text-gray-400 font-mono text-sm">${user.login}</td>
                <td class="px-4 md:px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span>
                </td>
                <td class="px-4 md:px-6 py-4 text-right">
                    <button onclick="window.editUser(${user.id})" class="text-blue-400 hover:text-blue-300 p-2 mr-1">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')" class="text-red-400 hover:text-red-300 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    },

    renderUserCard(user) {
        return `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                <div>
                    <div class="font-semibold">${user.name}</div>
                    <div class="text-sm text-gray-400 font-mono">${user.login}</div>
                    <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.editUser(${user.id})" class="p-2 text-blue-400 rounded-lg hover:bg-blue-500/20">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteUser(${user.id}, '${user.name.replace(/'/g, "\\'")}')" class="p-2 text-red-400 rounded-lg hover:bg-red-500/20">
                        <i class="fas fa-trash"></i>
                    </button>
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

    collectRoleConfigFromDOM(roleKey) {
        const config = this.getRoleConfig();
        const role = { ...config[roleKey] };

        const permCheckboxes = document.querySelectorAll(`input[data-role="${roleKey}"][data-perm]`);
        role.permissions = [];
        permCheckboxes.forEach(cb => {
            if (cb.checked) role.permissions.push(cb.dataset.perm);
        });
        if (role.permissions.includes('all')) {
            role.permissions = ['all'];
        }

        const menuCheckboxes = document.querySelectorAll(`input[data-role="${roleKey}"][data-menu]`);
        role.menu = [];
        menuCheckboxes.forEach(cb => {
            if (cb.checked) role.menu.push(cb.dataset.menu);
        });

        return role;
    },

    saveRole(roleKey) {
        const config = this.getRoleConfig();
        config[roleKey] = this.collectRoleConfigFromDOM(roleKey);
        this.saveRoleConfig(config);
        Toast.show('Налаштування ролі збережено', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    },

    showAddUserModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати користувача</h3>
                <form onsubmit="window.saveNewUser(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">ПІБ *</label>
                        <input type="text" id="userName" required placeholder="Іван Петренко"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Логін *</label>
                        <input type="text" id="userLogin" required placeholder="ivan"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none font-mono">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Роль *</label>
                        <select id="userRole" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                            <option value="technician">Майстер</option>
                            <option value="manager">Менеджер</option>
                            <option value="admin">Адміністратор</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Пароль <span class="text-gray-500">(необов'язково)</span></label>
                        <input type="password" id="userPassword" placeholder="Встановити пароль для входу"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg text-white font-semibold">Додати</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    showEditUserModal(id) {
        const user = Database.find('users', id);
        if (!user) return;

        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати користувача</h3>
                <form onsubmit="window.saveEditedUser(event, ${id})" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">ПІБ *</label>
                        <input type="text" id="editUserName" required value="${user.name}"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Логін *</label>
                        <input type="text" id="editUserLogin" required value="${user.login}"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none font-mono">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Роль *</label>
                        <select id="editUserRole" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                            <option value="technician" ${user.role === 'technician' ? 'selected' : ''}>Майстер</option>
                            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Менеджер</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адміністратор</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Пароль <span class="text-gray-500">(залиште порожнім, щоб не змінювати)</span></label>
                        <input type="password" id="editUserPassword" placeholder="Новий пароль"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                        ${(user.password && user.password.length > 0) ? '<div class="text-xs text-green-500 mt-1">Пароль встановлено</div>' : '<div class="text-xs text-gray-500 mt-1">Пароль не встановлено</div>'}
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-semibold">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    addUser(data) {
        const users = Database.query('users') || [];
        if (users.some(u => u.login === data.login)) {
            Toast.show('Користувач з таким логіном вже існує', 'error');
            return false;
        }
        Database.create('users', {
            name: data.name,
            login: data.login,
            role: data.role,
            password: (data.password || '').trim(),
            createdAt: new Date().toISOString()
        });
        return true;
    },

    updateUser(id, data) {
        const users = Database.query('users') || [];
        const existing = users.find(u => u.login === data.login && u.id !== id);
        if (existing) {
            Toast.show('Користувач з таким логіном вже існує', 'error');
            return false;
        }
        const updates = { name: data.name, login: data.login, role: data.role };
        if (data.password !== undefined && data.password !== null && data.password !== '') {
            updates.password = data.password.trim();
        }
        Database.update('users', id, updates);
        return true;
    },

    removeUser(id) {
        Database.delete('users', id);
    }
};

// Глобальні функції
window.openAddUserModal = () => SettingsModule.showAddUserModal();
window.editUser = (id) => SettingsModule.showEditUserModal(id);
window.deleteUser = (id, name) => {
    if (!confirm(`Видалити користувача "${name}"?`)) return;
    SettingsModule.removeUser(id);
    Toast.show('Користувача видалено', 'info');
    import('./router.js').then(m => m.default.navigate('settings'));
};
window.saveRoleConfig = (roleKey) => SettingsModule.saveRole(roleKey);

window.saveNewUser = (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('userName').value.trim(),
        login: document.getElementById('userLogin').value.trim().toLowerCase(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword')?.value || ''
    };
    if (SettingsModule.addUser(data)) {
        Modal.close();
        Toast.show('Користувача додано', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};

window.saveEditedUser = (e, id) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('editUserName').value.trim(),
        login: document.getElementById('editUserLogin').value.trim().toLowerCase(),
        role: document.getElementById('editUserRole').value,
        password: document.getElementById('editUserPassword')?.value || ''
    };
    if (SettingsModule.updateUser(id, data)) {
        Modal.close();
        Toast.show('Зміни збережено', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};

export default SettingsModule;
