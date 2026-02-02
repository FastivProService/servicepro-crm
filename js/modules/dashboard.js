import Database from './database.js';
import OrderModule from './orders.js';
import FinanceModule from './finance.js';

const DashboardModule = {
   render() {
    const orders = Database.query('orders');
    const active = orders.filter(o => !['issued', 'cancelled'].includes(o.status)).length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const stats = FinanceModule.getStats();
    const isMobile = window.innerWidth < 768;

    return `
        <div class="mb-4 md:mb-8">
            <h2 class="text-xl md:text-3xl font-bold">Дашборд</h2>
            <p class="text-gray-400 mt-1 text-sm md:text-base">Огляд роботи сервісу</p>
    
    render() {
        const orders = Database.query('orders');
        const active = orders.filter(o => !['issued', 'cancelled'].includes(o.status)).length;
        const ready = orders.filter(o => o.status === 'ready').length;
        const stats = FinanceModule.getStats();
        
        return `
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h2 class="text-3xl font-bold">Дашборд</h2>
                    <p class="text-gray-400 mt-1">Огляд роботи сервісу</p>
                </div>
                <button onclick="window.navigateTo('newOrder')" class="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors flex items-center gap-2">
                    <i class="fas fa-plus"></i> Нове замовлення
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="glass p-6 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-sm">Активні замовлення</div>
                    <div class="text-3xl font-bold mt-2">${active}</div>
                </div>
                <div class="glass p-6 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-sm">Готові до видачі</div>
                    <div class="text-3xl font-bold mt-2">${ready}</div>
                </div>
                <div class="glass p-6 rounded-xl border-l-4 border-yellow-500">
                    <div class="text-gray-400 text-sm">Виручка (міс.)</div>
                    <div class="text-3xl font-bold mt-2">₴${stats.monthRevenue}</div>
                </div>
                <div class="glass p-6 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-sm">Клієнтів у базі</div>
                    <div class="text-3xl font-bold mt-2">${Database.query('clients').length}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="glass p-6 rounded-xl">
                    <h3 class="font-semibold mb-4">Статистика по типах пристроїв</h3>
                    <canvas id="deviceChart" height="250"></canvas>
                </div>
                <div class="glass p-6 rounded-xl">
                    <h3 class="font-semibold mb-4">Останні замовлення</h3>
                    <div class="space-y-3 max-h-[300px] overflow-y-auto">
                        ${orders.slice(-6).reverse().map(o => {
                            const c = Database.find('clients', o.clientId);
                            const total = OrderModule.calculateTotal(o);
                            return `
                                <div class="flex justify-between items-center p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors" onclick="window.openOrderDetail(${o.id})">
                                    <div>
                                        <div class="font-semibold text-sm text-blue-400">${o.number}</div>
                                        <div class="text-xs text-gray-400">${c?.name || 'Невідомо'}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-bold">₴${total}</div>
                                        <div class="text-xs text-gray-500">${new Date(o.createdAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    initCharts() {
        const ctx = document.getElementById('deviceChart');
        if (!ctx) return;
        
        const types = {};
        Database.query('orders').forEach(o => {
            types[o.deviceType] = (types[o.deviceType] || 0) + 1;
        });
        
        const labels = {
            laptop: 'Ноутбуки',
            phone: 'Телефони',
            pc: 'ПК',
            printer: 'Принтери',
            tablet: 'Планшети',
            other: 'Інше'
        };
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(types).map(t => labels[t] || t),
                datasets: [{
                    data: Object.values(types),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#9ca3af', padding: 20 } 
                    } 
                }
            }
        });
    }
};


export default DashboardModule;
