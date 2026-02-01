import Database from './database.js';
import { Modal, Toast } from './ui.js';

const FinanceModule = {
    getStats() {
        const today = new Date().toDateString();
        const transactions = Database.query('transactions');
        
        // Фільтр за сьогодні
        const todayTrans = transactions.filter(t => new Date(t.date).toDateString() === today);
        
        // Доходи (оплата замовлень)
        const income = todayTrans
            .filter(t => t.type === 'income')
            .reduce((s, t) => s + t.amount, 0);
            
        // Витрати (закупівлі, зарплата)
        const expenses = todayTrans
            .filter(t => t.type === 'expense')
            .reduce((s, t) => s + t.amount, 0);
        
        // Внесення в касу
        const cashIn = todayTrans
            .filter(t => t.type === 'cash_in')
            .reduce((s, t) => s + t.amount, 0);
            
        // Зняття з каси
        const cashOut = todayTrans
            .filter(t => t.type === 'cash_out')
            .reduce((s, t) => s + t.amount, 0);

        // Баланс каси (всі внесення - всі зняття - витрати + доходи)
        const cashBalance = transactions
            .filter(t => ['cash_in', 'income'].includes(t.type))
            .reduce((s, t) => s + t.amount, 0) -
            transactions
            .filter(t => ['cash_out', 'expense'].includes(t.type))
            .reduce((s, t) => s + t.amount, 0);

        // Місячна виручка
        const monthRevenue = transactions
            .filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === new Date().getMonth() && t.type === 'income';
            })
            .reduce((s, t) => s + t.amount, 0);

        return { 
            income, 
            expenses, 
            cashIn, 
            cashOut, 
            cashBalance, 
            monthRevenue,
            profit: income - expenses 
        };
    },

    render() {
        const stats = this.getStats();
        const transactions = Database.query('transactions').slice(-30).reverse();
        
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Фінанси та Каса</h2>
                <div class="flex gap-2">
                    <button onclick="window.showCashInModal()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <i class="fas fa-arrow-down"></i> Внесення
                    </button>
                    <button onclick="window.showCashOutModal()" class="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <i class="fas fa-arrow-up"></i> Зняття
                    </button>
                    <button onclick="window.showExpenseModal()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <i class="fas fa-minus-circle"></i> Витрата
                    </button>
                </div>
            </div>

            <!-- Баланс каси -->
            <div class="glass p-6 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-gray-400 text-sm">Баланс каси</div>
                        <div class="text-4xl font-bold text-white">₴${stats.cashBalance}</div>
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        <div class>Внесення сьогодні: <span class="text-green-400">+₴${stats.cashIn}</span></div>
                        <div>Зняття сьогодні: <span class="text-orange-400">-₴${stats.cashOut}</span></div>
                    </div>
                </div>
            </div>

            <!-- Статистика дня -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div class="glass p-4 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-sm">Дохід (ремонти)</div>
                    <div class="text-xl font-bold">₴${stats.income}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-red-500">
                    <div class="text-gray-400 text-sm">Витрати</div>
                    <div class="text-xl font-bold">₴${stats.expenses}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-sm">Прибуток день</div>
                    <div class="text-xl font-bold">₴${stats.profit}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-sm">Виручка (міс.)</div>
                    <div class="text-xl font-bold">₴${stats.monthRevenue}</div>
                </div>
            </div>

            <!-- Історія операцій -->
            <div class="glass rounded-xl overflow-hidden">
                <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 class="font-semibold">Касові операції (останні 30)</h3>
                    <select onchange="window.filterTransactions(this.value)" class="bg-gray-900 border border-gray-700 rounded px-3 py-1 text-sm">
                        <option value="all">Всі операції</option>
                        <option value="income">Доходи</option>
                        <option value="expense">Витрати</option>
                        <option value="cash_in">Внесення</option>
                        <option value="cash_out">Зняття</option>
                    </select>
                </div>
                <div class="max-h-[400px] overflow-y-auto" id="transactionsList">
                    ${this.renderTransactionsList(transactions)}
                </div>
            </div>
        `;
    },

    renderTransactionsList(transactions, filter = 'all') {
        const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
        
        if (filtered.length === 0) {
            return '<div class="p-8 text-center text-gray-500">Немає операцій</div>';
        }

        const typeLabels = {
            'income': { text: 'Дохід', color: 'text-green-400', icon: 'fa-arrow-up' },
            'expense': { text: 'Витрата', color: 'text-red-400', icon: 'fa-minus' },
            'cash_in': { text: 'Внесення в касу', color: 'text-blue-400', icon: 'fa-arrow-down' },
            'cash_out': { text: 'Зняття з каси', color: 'text-orange-400', icon: 'fa-arrow-up' }
        };

        return filtered.map(t => {
            const typeInfo = typeLabels[t.type] || { text: t.type, color: 'text-gray-400', icon: 'fa-circle' };
            const order = t.orderId ? Database.find('orders', t.orderId) : null;
            
            return `
                <div class="flex justify-between items-center p-4 border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center ${typeInfo.color}">
                            <i class="fas ${typeInfo.icon}"></i>
                        </div>
                        <div>
                            <div class="font-medium">${t.category}</div>
                            <div class="text-xs text-gray-500">${new Date(t.date).toLocaleString('uk-UA')}</div>
                            ${order ? `<div class="text-xs text-blue-400">${order.number}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${typeInfo.color} font-bold text-lg">
                            ${t.type === 'income' || t.type === 'cash_in' ? '+' : '-'}₴${t.amount}
                        </div>
                        <div class="text-xs text-gray-500">${typeInfo.text}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // МОДАЛЬНІ ВІКНА ОПЕРАЦІЙ

    showCashInModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-arrow-down mr-2"></i>Внесення в касу</h3>
                <form onsubmit="window.saveCashOperation(event, 'cash_in')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн)</label>
                        <input type="number" name="amount" required min="1" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold text-green-400" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Джерело</label>
                        <input type="text" name="category" required placeholder="Напр.: З банку, Аванс клієнта..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white font-semibold">Внести в касу</button>
                        <button type="button" onclick="Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    showCashOutModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-orange-400"><i class="fas fa-arrow-up mr-2"></i>Зняття з каси</h3>
                <form onsubmit="window.saveCashOperation(event, 'cash_out')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн)</label>
                        <input type="number" name="amount" required min="1" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold text-orange-400" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Призначення</label>
                        <input type="text" name="category" required placeholder="Напр.: В банк, Зарплата майстру..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg text-white font-semibold">З
