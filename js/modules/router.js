import Auth from './auth.js';
import Database from './database.js';
import DashboardModule from './dashboard.js';
import OrderModule from './orders.js';
import InventoryModule from './inventory.js';
import ServiceModule from './services.js';
import ClientModule from './clients.js';
import FinanceModule from './finance.js';
import SalariesModule from './salaries.js';
import SettingsModule from './settings.js';
import PrintEditorModule from './printEditor.js';
import DocumentEditorModule from './documentEditor.js';
import RoleSettingsModule from './roleSettings.js';
import ActivityLogPage from './activityLogPage.js';
import NotificationsModule from './notifications.js';
import AdminConfigModule from './adminConfig.js';
import UsersSettingsModule from './usersSettings.js';
import StatusesSettingsModule from './statusesSettings.js';
import { Modal } from './ui.js';

const Router = {
    currentRoute: '',

    moveOrderInKanban(orderId, targetStatusId) {
        const order = Database.find('orders', Number(orderId));
        if (!order || !targetStatusId || order.status === targetStatusId) return;
        OrderModule.changeStatus(order.id, targetStatusId);
        if (window.Toast) window.Toast.show(`Замовлення ${order.number} переміщено`, 'success');
        this.navigate('kanban');
    },

    initKanbanDnD() {
        const cards = document.querySelectorAll('[data-kanban-order-id]');
        const cols = document.querySelectorAll('[data-kanban-status-id]');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const id = card.getAttribute('data-kanban-order-id');
                if (!id) return;
                e.dataTransfer.setData('text/plain', id);
                e.dataTransfer.effectAllowed = 'move';
                card.classList.add('opacity-50');
            });
            card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
        });

        cols.forEach(col => {
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                col.classList.add('ring-2', 'ring-blue-500');
            });
            col.addEventListener('dragleave', () => col.classList.remove('ring-2', 'ring-blue-500'));
            col.addEventListener('drop', (e) => {
                e.preventDefault();
                col.classList.remove('ring-2', 'ring-blue-500');
                const orderId = e.dataTransfer.getData('text/plain');
                const statusId = col.getAttribute('data-kanban-status-id');
                if (orderId && statusId) this.moveOrderInKanban(orderId, statusId);
            });
        });
    },

    navigate(route) {
        this.currentRoute = route;
        window.currentRoute = route;
        const content = document.getElementById('contentArea');
        if (!content) {
            console.error('contentArea не знайдено');
            return;
        }

        // Закриваємо модалку
        Modal.close();
        
        // Закриваємо сайдбар (перевіряємо чи існує)
        if (typeof window.Sidebar !== 'undefined' && window.Sidebar.close) {
            window.Sidebar.close();
        }
        
        switch (route) {
            case 'dashboard':
                content.innerHTML = DashboardModule.render();
                setTimeout(() => DashboardModule.initCharts(), 100);
                break;
            case 'orders':
                content.innerHTML = OrderModule.renderList();
                break;
            case 'newOrder':
                content.innerHTML = OrderModule.renderForm();
                break;
            case 'inventory':
                content.innerHTML = InventoryModule.render();
                break;
            case 'services':
                content.innerHTML = ServiceModule.render();
                break;
            case 'clients':
                content.innerHTML = ClientModule.renderList();
                break;
            case 'finance':
                if (Auth.hasAccess('finance')) {
                    content.innerHTML = FinanceModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу до фінансів</div>`;
                }
                break;
            case 'salaries':
                if (Auth.hasAccess('finance') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = SalariesModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу до модуля зарплат</div>`;
                }
                break;
            case 'kanban':
                this.renderKanban();
                break;
            case 'settings':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = SettingsModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу до налаштувань</div>`;
                }
                break;
            case 'printEditor':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = PrintEditorModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'documentEditor':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = DocumentEditorModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'roleSettings':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = RoleSettingsModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'activityLog':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = ActivityLogPage.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'adminConfig':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = AdminConfigModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'notifications':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = NotificationsModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'usersSettings':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = UsersSettingsModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            case 'statusesSettings':
                if (Auth.hasAccess('settings') || Auth.currentUser?.role === 'admin') {
                    content.innerHTML = StatusesSettingsModule.render();
                } else {
                    content.innerHTML = `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
                }
                break;
            default:
                this.navigate('dashboard');
                return;
        }

        // Оновлюємо активний пункт меню
        this.updateActiveMenuItem(route);
    },

    updateActiveMenuItem(route) {
        const effectiveRoute = (route === 'printEditor' || route === 'documentEditor' || route === 'roleSettings' || route === 'activityLog' || route === 'notifications' || route === 'adminConfig' || route === 'usersSettings' || route === 'statusesSettings') ? 'settings' : route;
        // Десктоп
        document.querySelectorAll('#desktopNav button').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            const isActive = onclick.includes(`'${effectiveRoute}'`);
            if (isActive) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('text-gray-300', 'hover:bg-gray-700');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('text-gray-300');
            }
        });

        // Мобільна навігація
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const itemRoute = item.getAttribute('data-route');
            if (itemRoute === effectiveRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    renderKanban() {
        const orders = Database.query('orders');
        const statuses = (Database.data?.orderStatuses || []).filter(s => !s.isFinal);
        const columns = statuses.map(s => ({
            ...s,
            items: orders.filter(o => o.status === s.id)
        }));

        const isMobile = window.innerWidth < 768;
        const colHtml = (statusId, title, items, color, borderClass) => `
            <div data-kanban-status-id="${statusId}" class="flex-1 min-w-[280px] ${isMobile ? 'kanban-col min-w-[260px] max-w-[85vw]' : ''} bg-gray-800/30 rounded-xl p-4 border border-gray-700 transition-shadow">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-semibold ${color}">${title}</h3>
                    <span class="bg-gray-700 text-xs px-2 py-1 rounded-full">${items.length}</span>
                </div>
                <div class="space-y-3">
                    ${items.map(o => {
                        const c = Database.find('clients', o.clientId);
                        const total = OrderModule.calculateTotal(o);
                        return `
                            <div data-kanban-order-id="${o.id}" draggable="true" class="bg-gray-800 p-3 rounded-lg border-l-4 ${borderClass || 'border-gray-600'} cursor-pointer hover:bg-gray-750 transition-all" onclick="window.openOrderDetail(${o.id})">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-xs font-mono text-blue-400 font-bold">${o.number}</span>
                                    <span class="text-xs text-gray-500">${new Date(o.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="font-medium text-sm mb-1">${o.deviceBrand} ${o.deviceModel}</div>
                                <div class="text-xs text-gray-400 mb-2">${c?.name}</div>
                                <div class="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                    <span class="text-xs font-bold">₴${total}</span>
                                    ${o.prepayment > 0 ? '<span class="text-xs text-green-400">Аванс</span>' : ''}
                                </div>
                            </div>
                        `;
                    }).join('') || '<p class="text-gray-600 text-sm text-center py-4">Немає замовлень</p>'}
                </div>
            </div>
        `;

        document.getElementById('contentArea').innerHTML = `
            <h2 class="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Kanban дошка</h2>
            <div class="flex gap-4 overflow-x-auto pb-4 md:pb-4 items-start kanban-scroll scroll-touch">
                ${columns.map(c => colHtml(c.id, c.name, c.items, (c.colorClass || '').split(' ').find(x => x.startsWith('text-')) || 'text-gray-300', c.borderClass)).join('')}
            </div>
        `;
        this.initKanbanDnD();
    },

    initNavigation() {
        const nav = document.getElementById('desktopNav');
        const menuItems = (Auth.getMenu() || []).filter(item => item !== 'documentEditor');

        const icons = {
            dashboard: 'fa-chart-line',
            orders: 'fa-clipboard-list',
            kanban: 'fa-columns',
            inventory: 'fa-boxes',
            services: 'fa-list-alt',
            clients: 'fa-users',
            finance: 'fa-wallet',
            salaries: 'fa-money-check-dollar',
            activityLog: 'fa-history',
            documentEditor: 'fa-file-alt',
            settings: 'fa-cog'
        };

        const colors = {
            orders: 'text-blue-400',
            kanban: 'text-yellow-400',
            inventory: 'text-purple-400',
            services: 'text-cyan-400',
            clients: 'text-green-400',
            finance: 'text-emerald-400',
            salaries: 'text-lime-400',
            activityLog: 'text-indigo-400',
            documentEditor: 'text-blue-400',
            settings: 'text-amber-400'
        };

        nav.innerHTML = menuItems.map(item => `
            <button onclick="window.routerNavigate('${item}')" 
                class="sidebar-item w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-300 hover:text-white mb-1 transition-all">
                <i class="fas ${icons[item]} w-5 ${colors[item] || ''}"></i>
                <span>${this.translateRoute(item)}</span>
            </button>
        `).join('');
    },

    translateRoute(route) {
        const map = {
            dashboard: 'Дашборд',
            orders: 'Замовлення',
            kanban: 'Kanban',
            inventory: 'Склад',
            services: 'Послуги',
            clients: 'Клієнти',
            finance: 'Фінанси',
            salaries: 'Зарплати',
            activityLog: 'Журнал дій',
            documentEditor: 'Редактор документів',
            settings: 'Налаштування'
        };
        return map[route] || route;
    }
};

window.routerNavigate = (route) => Router.navigate(route);

export default Router;
