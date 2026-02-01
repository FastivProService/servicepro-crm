import Database from './modules/database.js';
import Auth from './modules/auth.js';
import Router from './modules/router.js';
import { Modal, Toast } from './modules/ui.js';

// Робимо доступними глобально (хоча ui.js вже це зробив, для надійності)
window.Database = Database;
window.Modal = Modal;
window.Toast = Toast;

const App = {
    init() {
        const role = document.getElementById('authRole').value;
        const user = Auth.login(role);
        
        document.getElementById('userRoleDisplay').textContent = user.name;
        document.getElementById('authModule').classList.add('hidden');
        document.getElementById('mainInterface').classList.remove('hidden');
        
        Database.init();
        Router.initNavigation();
        Router.navigate('dashboard');
        
        // Закриття модалок по кліку поза ними
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') {
                Modal.close();
            }
        });
    }
};

window.App = App;
