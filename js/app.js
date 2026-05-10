import Database from './modules/database.js';
import Auth from './modules/auth.js';
import ActivityLog from './modules/activityLog.js';
import AutomationModule from './modules/automation.js';
import RemoteSyncModule from './modules/remoteSync.js';
import { Modal, Toast, Sidebar } from './modules/ui.js';

const ROLE_LABELS = { admin: 'Адміністратор', manager: 'Менеджер', technician: 'Майстер' };

// Робимо доступними глобально
window.Database = Database;
window.Modal = Modal;
window.Toast = Toast;
window.Sidebar = Sidebar;

function populateAuthForm() {
    try {
        const select = document.getElementById('authUser');
        if (!select) return;

        Database.init();
        const users = Database.query('users') || [];
        const passwordGroup = document.getElementById('authPasswordGroup');
        const passwordInput = document.getElementById('authPassword');
        const errorEl = document.getElementById('authError');

        select.innerHTML = '';
        const hasAdmin = users.some(u => u && u.role === 'admin');

    // Якщо є хоча б один адміністратор — тільки вхід через користувачів (з паролем)
    if (hasAdmin) {
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} (${ROLE_LABELS[u.role] || u.role})`;
            opt.dataset.hasPassword = (u.password && u.password.length > 0) ? '1' : '0';
            select.appendChild(opt);
        });
        if (users.length === 0) {
            const o = document.createElement('option');
            o.value = '';
            o.textContent = 'Немає користувачів. Додайте в Налаштуваннях.';
            o.disabled = true;
            select.appendChild(o);
        }
    } else {
        // Поки немає адміністратора — вхід за ролями без пароля
        const roleOpt = (val, label) => {
            const o = document.createElement('option');
            o.value = val;
            o.textContent = label;
            o.dataset.hasPassword = '0';
            return o;
        };
        select.appendChild(roleOpt('role_admin', 'Адміністратор'));
        select.appendChild(roleOpt('role_manager', 'Менеджер'));
        select.appendChild(roleOpt('role_technician', 'Майстер'));
        if (users.length > 0) {
            const sep = document.createElement('option');
            sep.value = '';
            sep.textContent = '—— Користувачі ——';
            sep.disabled = true;
            select.appendChild(sep);
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = `${u.name} (${ROLE_LABELS[u.role] || u.role})`;
                opt.dataset.hasPassword = (u.password && u.password.length > 0) ? '1' : '0';
                select.appendChild(opt);
            });
        }
    }

    function updatePasswordVisibility() {
        const opt = select.options[select.selectedIndex];
        const hasPassword = opt?.dataset?.hasPassword === '1';
        if (hasPassword) {
            passwordGroup.classList.remove('hidden');
            passwordInput.required = true;
            passwordInput.value = '';
        } else {
            passwordGroup.classList.add('hidden');
            passwordInput.required = false;
            passwordInput.value = '';
        }
        if (errorEl) errorEl.classList.add('hidden');
    }

    select.addEventListener('change', updatePasswordVisibility);
    updatePasswordVisibility();
    } catch (e) {
        console.error('populateAuthForm:', e);
        const sel = document.getElementById('authUser');
        if (sel) {
            sel.innerHTML = '<option value="">Оберіть користувача</option>';
        }
    }
}

const App = {
    hotkeysBound: false,

    bindHotkeys() {
        if (this.hotkeysBound) return;
        this.hotkeysBound = true;
        document.addEventListener('keydown', (e) => {
            const tag = (e.target?.tagName || '').toLowerCase();
            const typing = ['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable;

            if (e.key === 'Escape') {
                if (!document.getElementById('modalOverlay')?.classList.contains('hidden')) {
                    Modal.close();
                    e.preventDefault();
                    return;
                }
                if (window.innerWidth < 768 && window.Sidebar && window.Sidebar.isOpen) {
                    window.Sidebar.close();
                    e.preventDefault();
                    return;
                }
            }

            if (typing) return;

            const meta = e.ctrlKey || e.metaKey;
            if (meta && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                window.navigateTo?.('newOrder');
                return;
            }

            if (meta && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const route = window.currentRoute;
                const searchId = route === 'clients' ? 'clientSearch' : 'orderSearch';
                const input = document.getElementById(searchId);
                if (input) input.focus();
                return;
            }

            if (meta && ['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const map = { '1': 'dashboard', '2': 'orders', '3': 'kanban', '4': 'clients' };
                window.navigateTo?.(map[e.key]);
            }

            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.showHotkeysHelp();
            }
        });
    },

    showHotkeysHelp() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Гарячі клавіші</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Нове замовлення</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + N</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Пошук на сторінці</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + K</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Dashboard</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + 1</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Замовлення</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + 2</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Kanban</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + 3</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Клієнти</span><kbd class="px-2 py-1 bg-gray-800 rounded">Ctrl/Cmd + 4</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Закрити модалку/сайдбар</span><kbd class="px-2 py-1 bg-gray-800 rounded">Esc</kbd></div>
                    <div class="flex justify-between bg-gray-900 border border-gray-700 rounded p-2"><span>Ця довідка</span><kbd class="px-2 py-1 bg-gray-800 rounded">?</kbd></div>
                </div>
                <button onclick="window.Modal.close()" class="mt-4 w-full border border-gray-600 rounded-lg py-2 hover:bg-gray-700">Закрити</button>
            </div>
        `);
    },

    doLogin() {
        const select = document.getElementById('authUser');
        const passwordInput = document.getElementById('authPassword');
        const errorEl = document.getElementById('authError');
        const value = select?.value;

        if (!value) {
            Toast.show('Оберіть користувача', 'error');
            return;
        }

        let result;
        if (value.startsWith('role_')) {
            const role = value.replace('role_', '');
            result = Auth.loginByRole(role);
        } else {
            const userId = parseInt(value);
            const password = passwordInput?.value || '';
            result = Auth.loginByUser(userId, password);
        }

        if (!result.success) {
            if (errorEl) {
                errorEl.textContent = result.error || 'Помилка входу';
                errorEl.classList.remove('hidden');
            }
            Toast.show(result.error || 'Помилка входу', 'error');
            return;
        }

        Database.data.user = result.user;
        Database.save();
        ActivityLog.add('login', { userId: result.user.id || null, role: result.user.role });

        document.getElementById('userRoleDisplay').textContent = result.user.name;
        document.getElementById('authModule').classList.add('hidden');
        document.getElementById('mainInterface').classList.remove('hidden');

        import('./modules/router.js?v=5')
            .then(function(m) { return m.default; })
            .then(function(Router) {
                Router.initNavigation();
                window.navigateTo = function(route) { Router.navigate(route); };
                window.routerNavigate = function(route) { Router.navigate(route); };
                Router.navigate('dashboard');
            })
            .catch(function(err) {
                console.error(err);
                var area = document.getElementById('contentArea');
                if (area) area.innerHTML = '<div class="p-8 text-red-400">Помилка завантаження. <a href="javascript:location.reload()">Оновити</a></div>';
            });

        if (errorEl) errorEl.classList.add('hidden');
    },

    init() {
        document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') Modal.close();
        });
        populateAuthForm();
        AutomationModule.start();
        RemoteSyncModule.start();
        this.bindHotkeys();
    }
};

window.App = App;
window.showHotkeysHelp = () => App.showHotkeysHelp();

// Ініціалізація при завантаженні
App.init();
