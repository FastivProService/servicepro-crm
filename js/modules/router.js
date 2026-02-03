import Auth from './auth.js';
import DashboardModule from './dashboard.js';
import OrderModule from './orders.js';
import InventoryModule from './inventory.js';
import ServiceModule from './services.js';
import ClientModule from './clients.js';
import FinanceModule from './finance.js';
import { Modal } from './ui.js';

const Router = {
    currentRoute: '',

    navigate(route) {
        this.currentRoute = route;
        window.currentRoute = route;
        const content = document.getElementById('contentArea');

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
            case 'kanban':
                this.renderKanban();
                break;
            default:
                this.navigate('dashboard');
                return;
        }

        // Оновлюємо активний пункт меню
        this.updateActiveMenuItem(route);
    },

    updateActiveMenuItem(route) {
        // Десктоп
        document.querySelectorAll('#desktopNav button').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            const isActive = onclick.includes(`'${route}'`);
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
            if (itemRoute === route) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    renderKanban() {
        const orders = Database.query('orders');
        const columns = {
            new: orders.filter(o => o.status === 'new'),
            diagnostic: orders.filter(o => o.status === 'diagnostic'),
            in_repair: orders.filter(o => o.status === 'in_repair'),
            ready: orders.filter(o => o.status === 'ready')
        };

        const colHtml = (title, items, color, bgColor) => `
            <div class="flex-1 min-w-[280px] bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-semibold ${color}">${title}</h3>
                    <span class="bg-gray-700 text-xs px-2 py-1 rounded-full">${items.length}</span>
                </div>
                <div class="space-y-3">
                    ${items.map(o => {
                        const c = Database.find('clients', o.clientId);
                        const total = OrderModule.calculateTotal(o);
                        return `
                            <div class="bg-gray-800 p-3 rounded-lg border-l-4 ${bgColor} cursor-pointer hover:bg-gray-750 transition-all" onclick="window.openOrderDetail(${o.id})">
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
            <h2 class="text-3xl font-bold mb-6">Kanban дошка</h2>
            <div class="flex gap-4 overflow-x-auto pb-4 items-start">
                ${colHtml('Нові', columns.new, 'text-gray-300', 'border-gray-600')}
                ${colHtml('Діагностика', columns.diagnostic, 'text-yellow-400', 'border-yellow-500')}
                ${colHtml('В ремонті', columns.in_repair, 'text-blue-400', 'border-blue-500')}
                ${colHtml('Готові', columns.ready, 'text-green-400', 'border-green-500')}
            </div>
        `;
    },

    initNavigation() {
        const nav = document.getElementById('desktopNav');
        const menuItems = Auth.getMenu();

        const icons = {
            dashboard: 'fa-chart-line',
            orders: 'fa-clipboard-list',
            kanban: 'fa-columns',
            inventory: 'fa-boxes',
            services: 'fa-list-alt',
            clients: 'fa-users',
            finance: 'fa-wallet'
        };

        const colors = {
            orders: 'text-blue-400',
            kanban: 'text-yellow-400',
            inventory: 'text-purple-400',
            services: 'text-cyan-400',
            clients: 'text-green-400',
            finance: 'text-emerald-400'
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
            finance: 'Фінанси'
        };
        return map[route] || route;
    }
};

window.routerNavigate = (route) => Router.navigate(route);

export default Router;
