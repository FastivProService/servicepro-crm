import Database from './database.js';

const DEFAULT_ROLES = {
    admin: { 
        name: 'Адміністратор', 
        permissions: ['all'],
        menu: ['dashboard', 'orders', 'kanban', 'inventory', 'services', 'clients', 'finance', 'salaries', 'settings']
    },
    manager: { 
        name: 'Менеджер', 
        permissions: ['orders', 'clients', 'view', 'finance'],
        menu: ['dashboard', 'orders', 'kanban', 'clients', 'finance', 'salaries']
    },
    technician: { 
        name: 'Майстер', 
        permissions: ['orders', 'view'],
        menu: ['dashboard', 'orders', 'kanban', 'inventory']
    }
};

const Auth = {
    currentUser: null,
    roles: { ...DEFAULT_ROLES },

    loadRoleConfig() {
        const config = Database.data?.roleConfig;
        this.roles = {};
        for (const key of Object.keys(DEFAULT_ROLES)) {
            this.roles[key] = { ...DEFAULT_ROLES[key], ...(config?.[key] || {}) };
        }
        // Міграція: прибрати documentEditor з окремого пункту меню адміна
        // (редактор документів доступний через сторінку Налаштувань)
        const adminMenu = this.roles.admin?.menu || [];
        if (adminMenu.includes('documentEditor')) {
            const cleaned = adminMenu.filter(item => item !== 'documentEditor');
            // гарантуємо наявність settings
            if (!cleaned.includes('settings')) cleaned.push('settings');
            this.roles.admin = { ...this.roles.admin, menu: cleaned };
            if (Database.data?.roleConfig?.admin) {
                Database.data.roleConfig.admin = { ...Database.data.roleConfig.admin, menu: cleaned };
                Database.save();
            }
        } else if (adminMenu.length && !adminMenu.includes('settings')) {
            adminMenu.push('settings');
            this.roles.admin = { ...this.roles.admin, menu: adminMenu };
            if (Database.data?.roleConfig?.admin) {
                Database.data.roleConfig.admin = { ...Database.data.roleConfig.admin, menu: adminMenu };
                Database.save();
            }
        }
        // Журнал дій доступний зі сторінки Налаштувань,
        // тому прибираємо дубль з основного бокового меню для всіх ролей.
        for (const roleKey of Object.keys(this.roles)) {
            const role = this.roles[roleKey];
            if (!Array.isArray(role?.menu)) continue;
            const cleaned = role.menu.filter(item => item !== 'activityLog');
            this.roles[roleKey] = { ...role, menu: cleaned };
            if (Database.data?.roleConfig?.[roleKey]) {
                Database.data.roleConfig[roleKey] = { ...Database.data.roleConfig[roleKey], menu: cleaned };
            }
        }
        if (Database.data?.roleConfig) Database.save();
    },

    login(role) {
        this.loadRoleConfig();
        const roleData = this.roles[role] || DEFAULT_ROLES[role];
        this.currentUser = { role, ...roleData };
        return this.currentUser;
    },

    loginByRole(role) {
        this.login(role);
        return { success: true, user: this.currentUser };
    },

    loginByUser(userId, password) {
        const users = Database.query('users') || [];
        const user = users.find(u => u.id == userId);
        if (!user) {
            return { success: false, error: 'Користувача не знайдено' };
        }
        const hasPassword = user.password && user.password.length > 0;
        if (hasPassword && user.password !== password) {
            return { success: false, error: 'Невірний пароль' };
        }
        this.loadRoleConfig();
        const roleData = this.roles[user.role] || DEFAULT_ROLES[user.role];
        this.currentUser = { id: user.id, name: user.name, role: user.role, ...roleData };
        return { success: true, user: this.currentUser };
    },

    hasAccess(module) {
        if (!this.currentUser) return false;
        if (this.currentUser.permissions.includes('all')) return true;
        return this.currentUser.permissions.includes(module);
    },

    getMenu() {
        return this.currentUser ? this.currentUser.menu : [];
    }
};

export default Auth;