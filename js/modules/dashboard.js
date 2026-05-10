import Database from './database.js';
import OrderModule from './orders.js';
import FinanceModule from './finance.js';

const DashboardModule = {
    qualityPeriodDays: 30,
    getMasterStats() {
        const users = Database.query('users') || [];
        const technicians = users.filter(u => u.role === 'technician');
        const orders = Database.query('orders') || [];
        return technicians.map(t => {
            const ownOrders = orders.filter(o => Number(o.assignedMasterId) === Number(t.id));
            const norm = ownOrders.reduce((s, o) => s + Number(o.normHours || 0), 0);
            const fact = ownOrders.reduce((s, o) => s + Number(o.actualHours || 0), 0);
            const salary = ownOrders.reduce((s, o) => s + (OrderModule.getMasterSalary ? OrderModule.getMasterSalary(o) : 0), 0);
            return { id: t.id, name: t.name, orders: ownOrders.length, norm, fact, salary };
        });
    },

    getDailyLoad(days = 7) {
        const orders = Database.query('orders') || [];
        const now = new Date();
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const count = orders.filter(o => String(o.createdAt || '').slice(0, 10) === key).length;
            result.push({ key, label: d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }), count });
        }
        return result;
    },

    getQualityStats(days = 30) {
        const orders = Database.query('orders') || [];
        const from = new Date();
        from.setDate(from.getDate() - Math.max(1, Number(days || 30)));
        const recent = orders.filter(o => {
            const dt = new Date(o.createdAt || Date.now());
            return dt >= from;
        });

        const warrantyCount = recent.filter(o => o.status === 'warranty').length;
        const byClient = new Map();
        recent.forEach(o => {
            const c = o.clientId;
            byClient.set(c, (byClient.get(c) || 0) + 1);
        });
        const repeatClients = [...byClient.values()].filter(v => v > 1).length;
        return { warrantyCount, repeatClients, periodDays: Math.max(1, Number(days || 30)) };
    },

    render() {
        const orders = Database.query('orders');
        const statuses = Database.data?.orderStatuses || [];
        const finalIds = statuses.filter(s => s.isFinal).map(s => s.id);
        const readyIds = statuses.filter(s => s.isReady).map(s => s.id);
        const active = orders.filter(o => !finalIds.includes(o.status)).length;
        const ready = orders.filter(o => readyIds.includes(o.status)).length;
        const stats = FinanceModule.getStats();
        const masterStats = this.getMasterStats();
        const dailyLoad = this.getDailyLoad(7);
        const quality = this.getQualityStats(this.qualityPeriodDays || 30);
        
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

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-6">
                <div class="glass p-4 rounded-xl">
                    <h3 class="font-semibold mb-3 text-sm md:text-base">Майстри / розподіл</h3>
                    <div class="space-y-2 max-h-64 overflow-y-auto">
                        ${masterStats.map(m => `
                            <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                                <div class="flex justify-between"><span>${m.name}</span><span class="text-cyan-400">${m.orders} зам.</span></div>
                                <div class="text-xs text-gray-500">Норма: ${m.norm.toFixed(1)}г | Факт: ${m.fact.toFixed(1)}г | ЗП: ₴${m.salary.toFixed(0)}</div>
                            </div>
                        `).join('') || '<div class="text-gray-500">Немає майстрів</div>'}
                    </div>
                </div>

                <div class="glass p-4 rounded-xl">
                    <h3 class="font-semibold mb-3 text-sm md:text-base">Навантаження по днях (7 днів)</h3>
                    <div class="space-y-2">
                        ${dailyLoad.map(d => `
                            <div>
                                <div class="flex justify-between text-xs mb-1"><span>${d.label}</span><span>${d.count}</span></div>
                                <div class="h-2 bg-gray-800 rounded"><div class="h-2 bg-blue-500 rounded" style="width:${Math.min(100, d.count * 12)}%"></div></div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="glass p-4 rounded-xl">
                    <div class="flex items-center justify-between gap-2 mb-3">
                        <h3 class="font-semibold text-sm md:text-base">Якість (останні ${quality.periodDays} днів)</h3>
                        <select onchange="window.setDashboardQualityPeriod(this.value)" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs">
                            <option value="7" ${quality.periodDays === 7 ? 'selected' : ''}>7 днів</option>
                            <option value="30" ${quality.periodDays === 30 ? 'selected' : ''}>30 днів</option>
                            <option value="90" ${quality.periodDays === 90 ? 'selected' : ''}>90 днів</option>
                        </select>
                    </div>
                    <div class="space-y-3">
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-xs text-gray-400">Повторні звернення (клієнти)</div>
                            <div class="text-xl font-bold text-yellow-400">${quality.repeatClients}</div>
                        </div>
                        <div class="bg-gray-900 rounded-lg p-3 border border-gray-700">
                            <div class="text-xs text-gray-400">Гарантійні замовлення</div>
                            <div class="text-xl font-bold text-violet-400">${quality.warrantyCount}</div>
                        </div>
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

window.setDashboardQualityPeriod = (days) => {
    const val = Math.max(1, Number(days || 30));
    DashboardModule.qualityPeriodDays = val;
    import('./router.js').then(m => m.default.navigate('dashboard'));
};

export default DashboardModule;
