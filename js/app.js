import Database from './modules/database.js';
import Auth from './modules/auth.js';
import Router from './modules/router.js';

// Робимо Database доступним глобально для кнопки експорту в HTML
window.Database = Database;

const App = {
    init() {
        const role = document.getElementById('authRole').value;
        const user = Auth.login(role);
        
        // Оновлюємо UI
        document.getElementById('userRoleDisplay').textContent = user.name;
        document.getElementById('authModule').classList.add('hidden');
        document.getElementById('mainInterface').classList.remove('hidden');
        
        // Ініціалізація даних
        Database.init();
        
        // Налаштування навігації
        Router.initNavigation();
        
        // Перехід на дашборд
        Router.navigate('dashboard');

        // Додай цю функцію після ініціалізації App
window.refreshCurrentPage = function() {
    if (window.currentRoute) {
        Router.navigate(window.currentRoute);
    }
};
        
        // Закриття модалок по кліку поза ними
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                import('./modules/ui.js').then(m => m.Modal.close());
            }
        });
    }
};

// Робимо App доступним глобально для HTML

window.App = App;
