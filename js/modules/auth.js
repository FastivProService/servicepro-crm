// Модуль авторизації та прав доступу
const Auth = {
    currentUser: null,
    
    roles: {
        admin: { 
            name: 'Адміністратор', 
            permissions: ['all'],
            menu: ['dashboard', 'orders', 'kanban', 'inventory', 'services', 'clients', 'finance']
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
    },

    login(role) {
        this.currentUser = { role, ...this.roles[role] };
        return this.currentUser;
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