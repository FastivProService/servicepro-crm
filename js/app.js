import Database from './modules/database.js';
import Auth from './modules/auth.js';
import Router from './modules/router.js';
import { Modal, Toast, Sidebar } from './modules/ui.js';

const ROLE_LABELS = { admin: 'Адміністратор', manager: 'Менеджер', technician: 'Майстер' };

// Робимо доступними глобально
window.Database = Database;
window.Modal = Modal;
window.Toast = Toast;
window.Sidebar = Sidebar;

function populateAuthForm() {
    Database.init();
    const users = Database.query('users') || [];
    const select = document.getElementById('authUser');
    const passwordGroup = document.getElementById('authPasswordGroup');
    const passwordInput = document.getElementById('authPassword');
    const errorEl = document.getElementById('authError');

    if (!select) return;

    select.innerHTML = '';
    const hasAdmin = users.some(u => u.role === 'admin');

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
}

const App = {
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

        document.getElementById('userRoleDisplay').textContent = result.user.name;
        document.getElementById('authModule').classList.add('hidden');
        document.getElementById('mainInterface').classList.remove('hidden');

        Router.initNavigation();
        window.navigateTo = (route) => Router.navigate(route);
        window.routerNavigate = (route) => Router.navigate(route);
        Router.navigate('dashboard');

        if (errorEl) errorEl.classList.add('hidden');
    },

    init() {
        document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') Modal.close();
        });
        populateAuthForm();
    }
};

window.App = App;

// Ініціалізація при завантаженні
App.init();
