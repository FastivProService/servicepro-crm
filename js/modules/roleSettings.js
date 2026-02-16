import Database from './database.js';
import Auth from './auth.js';
import { Toast } from './ui.js';

export const AVAILABLE_PERMISSIONS = [
    { id: 'all', label: 'Повний доступ' },
    { id: 'orders', label: 'Замовлення' },
    { id: 'clients', label: 'Клієнти' },
    { id: 'inventory', label: 'Склад' },
    { id: 'services', label: 'Послуги' },
    { id: 'finance', label: 'Фінанси' },
    { id: 'view', label: 'Перегляд' },
    { id: 'settings', label: 'Налаштування' }
];

export const AVAILABLE_MENU_ITEMS = [
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

export const ROLE_LABELS = {
    admin: 'Адміністратор',
    manager: 'Менеджер',
    technician: 'Майстер'
};

const RoleSettingsModule = {
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

        return `
            <div class="max-w-4xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Налаштування ролей</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Права доступу та пункти меню для кожної ролі</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="p-4 md:p-6 space-y-6">
                        ${['admin', 'manager', 'technician'].map(roleKey => this.renderRoleSection(roleKey, roleConfig[roleKey])).join('')}
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
    }
};

window.saveRoleConfig = (roleKey) => RoleSettingsModule.saveRole(roleKey);

export default RoleSettingsModule;
