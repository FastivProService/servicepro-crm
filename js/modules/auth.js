import Database from './database.js';

const DEFAULT_ROLES = {
    admin: { 
        name: 'Адміністратор', 
        permissions: ['all'],
        menu: ['dashboard', 'orders', 'kanban', 'inventory', 'services', 'clients', 'finance', 'settings']
    },
    manager: { 
        name: 'Менеджер', 
        permissions: ['orders', 'clients', 'view'],
        menu: ['dashboard', 'orders', 'kanban', 'clients', 'finance']
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
        if (config) {
            this.roles = {};
            for (const key of Object.keys(DEFAULT_ROLES)) {
                this.roles[key] = { ...DEFAULT_ROLES[key], ...(config[key] || {}) };
            }
        }
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