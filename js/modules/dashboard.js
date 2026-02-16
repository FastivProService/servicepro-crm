import Database from './database.js';
import OrderModule from './orders.js';
import FinanceModule from './finance.js';

const DashboardModule = {
    render() {
        const orders = Database.query('orders');
        const active = orders.filter(o => !['issued', 'cancelled'].includes(o.status)).length;
        const ready = orders.filter(o => o.status === 'ready').length;
        const stats = FinanceModule.getStats();
        
        return `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                <div>
                    <h2 class="text-2xl md:text-3xl font-bold">Дашборд</h2>
                    <p class="text-gray-400 mt-1 text-sm md:text-base">Огляд роботи сервісу</p>
                </div>
                <button onclick="window.navigateTo('newOrder')" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-6 py-3 md:py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold touch-target">
                    <i class="fas fa-plus"></i> Нове замовлення
                </button>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
                <div class="glass p-4 md:p-6 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-xs md:text-sm">Активні замовлення</div>
                    <div class="text-2xl md:text-3xl font-bold mt-1 md:mt-2">${active}</div>
                </div>
                <div class="glass p-4 md:p-6 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-xs md:text-sm">Готові до видачі</div>
                    <div class="text-2xl md:text-3xl font-bold mt-1 md:mt-2">${ready}</div>
                </div>
                <div class="glass p-4 md:p-6 rounded-xl border-l-4 border-yellow-500">
                    <div class="text-gray-400 text-xs md:text-sm">Виручка (міс.)</div>
                    <div class="text-xl md:text-3xl font-bold mt-1 md:mt-2 truncate" title="₴${stats.monthRevenue}">₴${stats.monthRevenue}</div>
                </div>
                <div class="glass p-4 md:p-6 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-xs md:text-sm">Клієнтів у базі</div>
                    <div class="text-2xl md:text-3xl font-bold mt-1 md:mt-2">${Database.query('clients').length}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div class="glass p-4 md:p-6 rounded-xl">
                    <h3 class="font-semibold mb-4 text-sm md:text-base">Статистика по типах пристроїв</h3>
                    <canvas id="deviceChart" height="200" class="max-h-[200px] md:max-h-[250px]"></canvas>
                </div>
                <div class="glass p-4 md:p-6 rounded-xl">
                    <h3 class="font-semibold mb-4 text-sm md:text-base">Останні замовлення</h3>
                    <div class="space-y-3 max-h-[280px] md:max-h-[300px] overflow-y-auto scroll-touch">
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
