import Database from './database.js';
import Auth from './auth.js';
import ActivityLog from './activityLog.js';
import { Modal, Toast } from './ui.js';
import { ROLE_LABELS } from './roleSettings.js';

const SettingsModule = {
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
            order_status_delete: 'Видалено статус замовлення'
        };
        return map[action] || action;
    },

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
            return `<div class="text-center py-20 text-gray-500">Немає доступу до налаштувань</div>`;
        }

        const users = Database.query('users') || [];
        const isMobile = window.innerWidth < 768;

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <h2 class="text-2xl md:text-3xl font-bold mb-6">Налаштування</h2>
                
                <div class="space-y-8">
                    <div class="glass rounded-xl overflow-hidden border-l-4 border-emerald-500">
                        <div class="bg-emerald-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-emerald-400 flex items-center gap-2">
                                    <i class="fas fa-sliders-h"></i> Адмін-конфігурація
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Винесено на окрему сторінку</p>
                            </div>
                            <button onclick="window.navigateTo('adminConfig')" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-external-link-alt"></i> Відкрити адмін-конфіг
                            </button>
                        </div>
                    </div>

                    <!-- Редактор документів - WYSIWYG -->
                    <div class="glass rounded-xl overflow-hidden border-l-4 border-blue-500">
                        <div class="bg-blue-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-blue-400 flex items-center gap-2">
                                    <i class="fas fa-file-alt"></i> Редактор документів
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">WYSIWYG-редактор шаблонів актів, чеків (як у HelloClient)</p>
                            </div>
                            <button onclick="window.navigateTo('documentEditor')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold">
                                <i class="fas fa-edit"></i> Відкрити редактор
                            </button>
                        </div>
                        <div class="p-4 md:p-6">
                            <div class="text-sm text-gray-400">
                                Створюйте та редагуйте шаблони документів з підтримкою змінних.
                            </div>
                        </div>
                    </div>

                    <!-- Ролі та права -->
                    <div class="glass rounded-xl overflow-hidden">
                        <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-amber-400 flex items-center gap-2">
                                    <i class="fas fa-user-shield"></i> Налаштування ролей
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Права доступу та пункти меню для кожної ролі</p>
                            </div>
                            <button onclick="window.navigateTo('roleSettings')" class="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-cog"></i> Відкрити налаштування ролей
                            </button>
                        </div>
                        <div class="p-4 md:p-6">
                            <div class="text-sm text-gray-400">
                                Налаштуйте права для ролей: Адміністратор, Менеджер, Майстер
                            </div>
                        </div>
                    </div>

                    <!-- Печатні документи -->
                    <div class="glass rounded-xl overflow-hidden">
                        <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-orange-400 flex items-center gap-2">
                                    <i class="fas fa-print"></i> Печатні документи
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Редагування полів для друку актів та чеків</p>
                            </div>
                            <button onclick="window.navigateTo('printEditor')" class="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-edit"></i> Редактор полів для друку
                            </button>
                        </div>
                        <div class="p-4 md:p-6">
                            <div class="text-sm text-gray-400">
                                Формат: <strong class="text-orange-400">${Database.data.printConfig?.format === '58mm' ? '58 мм' : 'А4'}</strong> —
                                ${(Database.data.printConfig?.companyName || 'ТОВ "ServicePro"')}.
                                Квітанції: ${(Database.data.printConfig?.templates || []).map(t => t.name).join(', ') || 'Приймальна, Гарантійна, Видаткова'}
                            </div>
                        </div>
                    </div>

                    <div class="glass rounded-xl overflow-hidden border-l-4 border-violet-500">
                        <div class="bg-violet-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-violet-400 flex items-center gap-2">
                                    <i class="fas fa-tasks"></i> Статуси замовлень
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Винесено на окрему сторінку</p>
                            </div>
                            <button onclick="window.navigateTo('statusesSettings')" class="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-external-link-alt"></i> Відкрити статуси
                            </button>
                        </div>
                    </div>

                    <div class="glass rounded-xl overflow-hidden border-l-4 border-cyan-500">
                        <div class="bg-cyan-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-cyan-400 flex items-center gap-2">
                                    <i class="fas fa-users-cog"></i> Користувачі
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Винесено на окрему сторінку</p>
                            </div>
                            <button onclick="window.navigateTo('usersSettings')" class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-external-link-alt"></i> Відкрити користувачів
                            </button>
                        </div>
                    </div>

                    <!-- Лог дій -->
                    <div class="glass rounded-xl overflow-hidden border-l-4 border-indigo-500">
                        <div class="bg-indigo-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-indigo-400 flex items-center gap-2"><i class="fas fa-history"></i> Лог дій користувачів</h3>
                                <p class="text-sm text-gray-500 mt-1">Перегляд повного журналу на окремій сторінці</p>
                            </div>
                            <button onclick="window.navigateTo('activityLog')" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-external-link-alt"></i> Відкрити журнал
                            </button>
                        </div>
                    </div>

                    <div class="glass rounded-xl overflow-hidden border-l-4 border-cyan-500">
                        <div class="bg-cyan-900/20 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 class="font-semibold text-lg text-cyan-400 flex items-center gap-2">
                                    <i class="fas fa-bell"></i> SMS / Telegram повідомлення
                                </h3>
                                <p class="text-sm text-gray-500 mt-1">Винесено на окрему сторінку</p>
                            </div>
                            <button onclick="window.navigateTo('notifications')" class="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors">
                                <i class="fas fa-external-link-alt"></i> Відкрити сторінку сповіщень
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderUserRow(user) {
        const payTypeLabel = user.payType === 'rate' ? 'Ставка/год' : (user.payType === 'piece' ? 'Відрядна' : 'Відсоток (посл./запч.)');
        const payDetails = user.payType === 'percent'
            ? `Послуги: ${Number(user.payRateServices ?? user.payRate ?? 0)}% · Запчастини: ${Number(user.payRateParts ?? user.payRate ?? 0)}%`
            : `${payTypeLabel}: ${user.payRate || 0}`;
        return `
            <tr class="hover:bg-gray-800/30 transition-colors">
                <td class="px-4 md:px-6 py-4 font-medium">${user.name}</td>
                <td class="px-4 md:px-6 py-4 text-gray-400 font-mono text-sm">${user.login}</td>
                <td class="px-4 md:px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span>
                    ${user.role === 'technician' ? `<div class="text-xs text-gray-500 mt-1">${payDetails}</div>` : ''}
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
        const payTypeLabel = user.payType === 'rate' ? 'Ставка/год' : (user.payType === 'piece' ? 'Відрядна' : 'Відсоток (посл./запч.)');
        const payDetails = user.payType === 'percent'
            ? `Послуги: ${Number(user.payRateServices ?? user.payRate ?? 0)}% · Запчастини: ${Number(user.payRateParts ?? user.payRate ?? 0)}%`
            : `${payTypeLabel}: ${user.payRate || 0}`;
        return `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                <div>
                    <div class="font-semibold">${user.name}</div>
                    <div class="text-sm text-gray-400 font-mono">${user.login}</div>
                    <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${this.getRoleBadgeClass(user.role)}">${ROLE_LABELS[user.role] || user.role}</span>
                    ${user.role === 'technician' ? `<div class="text-xs text-gray-500 mt-1">${payDetails}</div>` : ''}
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
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Схема зарплати</label>
                            <select id="userPayType" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                                <option value="percent">Відсоток (посл./запч.)</option>
                                <option value="rate">Ставка за годину</option>
                                <option value="piece">Відрядна (за роботу)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">% за послуги</label>
                            <input type="number" id="userPayRateServices" value="20" step="0.01" min="0"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">% за запчастини</label>
                            <input type="number" id="userPayRateParts" value="20" step="0.01" min="0"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Ставка/резервне значення</label>
                            <input type="number" id="userPayRate" value="20" step="0.01" min="0"
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
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Схема зарплати</label>
                            <select id="editUserPayType" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                                <option value="percent" ${(user.payType || 'percent') === 'percent' ? 'selected' : ''}>Відсоток (посл./запч.)</option>
                                <option value="rate" ${user.payType === 'rate' ? 'selected' : ''}>Ставка за годину</option>
                                <option value="piece" ${user.payType === 'piece' ? 'selected' : ''}>Відрядна (за роботу)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">% за послуги</label>
                            <input type="number" id="editUserPayRateServices" value="${user.payRateServices ?? user.payRate ?? 20}" step="0.01" min="0"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">% за запчастини</label>
                            <input type="number" id="editUserPayRateParts" value="${user.payRateParts ?? user.payRate ?? 20}" step="0.01" min="0"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Ставка/резервне значення</label>
                            <input type="number" id="editUserPayRate" value="${user.payRate ?? 20}" step="0.01" min="0"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
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
            payType: data.payType || 'percent',
            payRate: Number(data.payRate || 0),
            payRateServices: Number(data.payRateServices || data.payRate || 0),
            payRateParts: Number(data.payRateParts || data.payRate || 0),
            createdAt: new Date().toISOString()
        });
        ActivityLog.add('user_add', { login: data.login, role: data.role });
        return true;
    },

    updateUser(id, data) {
        const users = Database.query('users') || [];
        const existing = users.find(u => u.login === data.login && u.id !== id);
        if (existing) {
            Toast.show('Користувач з таким логіном вже існує', 'error');
            return false;
        }
        const updates = {
            name: data.name,
            login: data.login,
            role: data.role,
            payType: data.payType || 'percent',
            payRate: Number(data.payRate || 0),
            payRateServices: Number(data.payRateServices || data.payRate || 0),
            payRateParts: Number(data.payRateParts || data.payRate || 0)
        };
        if (data.password !== undefined && data.password !== null && data.password !== '') {
            updates.password = data.password.trim();
        }
        Database.update('users', id, updates);
        ActivityLog.add('user_update', { userId: id, login: data.login, role: data.role });
        return true;
    },

    removeUser(id) {
        const user = Database.find('users', id);
        Database.delete('users', id);
        ActivityLog.add('user_delete', { userId: id, login: user?.login || '' });
    },

    openAddStatusModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати статус</h3>
                <form onsubmit="window.saveNewOrderStatus(event)" class="space-y-4">
                    <input id="statusName" required placeholder="Назва статусу" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-violet-500 focus:outline-none">
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
        if (statuses.some(s => s.id === id || s.name.toLowerCase() === data.name.toLowerCase())) {
            Toast.show('Такий статус вже існує', 'warning');
            return false;
        }
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

    openEditStatusModal(id) {
        const status = this.getOrderStatuses().find(s => s.id === id);
        if (!status) return;
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати статус</h3>
                <form onsubmit="window.saveEditedOrderStatus(event, '${status.id}')" class="space-y-4">
                    <input id="editStatusName" required value="${status.name.replace(/"/g, '&quot;')}" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
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
        if (statuses.length <= 1) {
            Toast.show('Має залишитись хоча б один статус', 'warning');
            return false;
        }
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
    },

    saveAdminConfigFromUI() {}

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
window.saveNewUser = (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('userName').value.trim(),
        login: document.getElementById('userLogin').value.trim().toLowerCase(),
        role: document.getElementById('userRole').value,
        password: document.getElementById('userPassword')?.value || '',
        payType: document.getElementById('userPayType')?.value || 'percent',
        payRate: parseFloat(document.getElementById('userPayRate')?.value || '0') || 0,
        payRateServices: parseFloat(document.getElementById('userPayRateServices')?.value || '0') || 0,
        payRateParts: parseFloat(document.getElementById('userPayRateParts')?.value || '0') || 0
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
        password: document.getElementById('editUserPassword')?.value || '',
        payType: document.getElementById('editUserPayType')?.value || 'percent',
        payRate: parseFloat(document.getElementById('editUserPayRate')?.value || '0') || 0,
        payRateServices: parseFloat(document.getElementById('editUserPayRateServices')?.value || '0') || 0,
        payRateParts: parseFloat(document.getElementById('editUserPayRateParts')?.value || '0') || 0
    };
    if (SettingsModule.updateUser(id, data)) {
        Modal.close();
        Toast.show('Зміни збережено', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};

window.openAddOrderStatusModal = () => SettingsModule.openAddStatusModal();
window.saveNewOrderStatus = (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('statusName').value.trim(),
        isFinal: document.getElementById('statusFinal').checked,
        isReady: document.getElementById('statusReady').checked
    };
    if (SettingsModule.addStatus(data)) {
        Modal.close();
        Toast.show('Статус додано', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};
window.editOrderStatus = (id) => SettingsModule.openEditStatusModal(id);
window.saveEditedOrderStatus = (e, id) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('editStatusName').value.trim(),
        isFinal: document.getElementById('editStatusFinal').checked,
        isReady: document.getElementById('editStatusReady').checked
    };
    if (SettingsModule.updateStatus(id, data)) {
        Modal.close();
        Toast.show('Статус оновлено', 'success');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};
window.deleteOrderStatus = (id) => {
    if (!confirm('Видалити цей статус?')) return;
    if (SettingsModule.deleteStatus(id)) {
        Toast.show('Статус видалено', 'info');
        import('./router.js').then(m => m.default.navigate('settings'));
    }
};

window.saveAdminConfig = () => SettingsModule.saveAdminConfigFromUI();

export default SettingsModule;
