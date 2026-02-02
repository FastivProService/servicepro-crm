import Database from './database.js';

const FinanceModule = {
    getStats() {
        const today = new Date().toDateString();
        const transactions = Database.query('transactions');
        
        const todayTrans = transactions.filter(t => new Date(t.date).toDateString() === today);
        
        const income = todayTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = todayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const cashIn = todayTrans.filter(t => t.type === 'cash_in').reduce((s, t) => s + t.amount, 0);
        const cashOut = todayTrans.filter(t => t.type === 'cash_out').reduce((s, t) => s + t.amount, 0);

        const cashBalance = transactions
            .filter(t => ['cash_in', 'income'].includes(t.type))
            .reduce((s, t) => s + t.amount, 0) -
            transactions
            .filter(t => ['cash_out', 'expense'].includes(t.type))
            .reduce((s, t) => s + t.amount, 0);

        const monthRevenue = transactions
            .filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === new Date().getMonth() && t.type === 'income';
            })
            .reduce((s, t) => s + t.amount, 0);

        return { income, expenses, cashIn, cashOut, cashBalance, monthRevenue, profit: income - expenses };
    },

    render() {
        const stats = this.getStats();
        const transactions = Database.query('transactions').slice(-30).reverse();
        
        return `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 class="text-3xl font-bold">Фінанси та Каса</h2>
                <div class="grid grid-cols-3 md:flex gap-2 w-full md:w-auto">
                    <button onclick="window.showCashInModal()" class="bg-green-600 hover:bg-green-700 px-2 py-3 md:px-4 md:py-2 rounded-lg flex flex-col md:flex-row items-center justify-center gap-2 transition-colors">
                        <i class="fas fa-arrow-down"></i> <span class="text-xs md:text-base">Внесення</span>
                    </button>
                    <button onclick="window.showCashOutModal()" class="bg-orange-600 hover:bg-orange-700 px-2 py-3 md:px-4 md:py-2 rounded-lg flex flex-col md:flex-row items-center justify-center gap-2 transition-colors">
                        <i class="fas fa-arrow-up"></i> <span class="text-xs md:text-base">Зняття</span>
                    </button>
                    <button onclick="window.showExpenseModal()" class="bg-red-600 hover:bg-red-700 px-2 py-3 md:px-4 md:py-2 rounded-lg flex flex-col md:flex-row items-center justify-center gap-2 transition-colors">
                        <i class="fas fa-minus-circle"></i> <span class="text-xs md:text-base">Витрата</span>
                    </button>
                </div>
            </div>

            <div class="glass p-6 rounded-xl border-2 border-blue-500/30 bg-blue-500/10 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div class="text-gray-400 text-sm">Баланс каси</div>
                        <div class="text-4xl font-bold text-white">₴${stats.cashBalance}</div>
                    </div>
                    <div class="text-left md:text-right text-sm text-gray-400 w-full md:w-auto bg-gray-900/30 md:bg-transparent p-3 md:p-0 rounded-lg">
                        <div class="flex justify-between md:block mb-1 md:mb-0">
                            <span>Внесення сьогодні:</span> 
                            <span class="text-green-400 font-bold ml-2">+₴${stats.cashIn}</span>
                        </div>
                        <div class="flex justify-between md:block">
                            <span>Зняття сьогодні:</span> 
                            <span class="text-orange-400 font-bold ml-2">-₴${stats.cashOut}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
                <div class="glass p-4 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-xs md:text-sm">Дохід (ремонти)</div>
                    <div class="text-lg md:text-xl font-bold">₴${stats.income}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-red-500">
                    <div class="text-gray-400 text-xs md:text-sm">Витрати</div>
                    <div class="text-lg md:text-xl font-bold">₴${stats.expenses}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-xs md:text-sm">Прибуток день</div>
                    <div class="text-lg md:text-xl font-bold">₴${stats.profit}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-xs md:text-sm">Виручка (міс.)</div>
                    <div class="text-lg md:text-xl font-bold">₴${stats.monthRevenue}</div>
                </div>
            </div>

            <div class="glass rounded-xl overflow-hidden pb-20">
                <div class="p-4 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <h3 class="font-semibold">Касові операції (останні 30)</h3>
                    <select onchange="window.filterTransactions(this.value)" class="w-full md:w-auto bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm">
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
            'cash_in': { text: 'Внесення', color: 'text-blue-400', icon: 'fa-arrow-down' },
            'cash_out': { text: 'Зняття', color: 'text-orange-400', icon: 'fa-arrow-up' }
        };

        return filtered.map(t => {
            const typeInfo = typeLabels[t.type] || { text: t.type, color: 'text-gray-400', icon: 'fa-circle' };
            const order = t.orderId ? Database.find('orders', t.orderId) : null;
            
            return `
                <div class="flex justify-between items-center p-4 border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center ${typeInfo.color} shrink-0">
                            <i class="fas ${typeInfo.icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-medium truncate pr-2">${t.category}</div>
                            <div class="text-xs text-gray-500">${new Date(t.date).toLocaleString('uk-UA')}</div>
                            ${order ? `<div class="text-xs text-blue-400 font-mono">${order.number}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right shrink-0 ml-2">
                        <div class="${typeInfo.color} font-bold text-lg whitespace-nowrap">
                            ${t.type === 'income' || t.type === 'cash_in' ? '+' : '-'}₴${t.amount}
                        </div>
                        <div class="text-xs text-gray-500 hidden md:block">${typeInfo.text}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    showCashInModal() {
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-arrow-down mr-2"></i>Внесення в касу</h3>
                <form onsubmit="window.saveCashOperation(event, 'cash_in')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн) *</label>
                        <input type="number" name="amount" required min="0.01" step="0.01" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-xl font-bold text-green-400 focus:outline-none focus:border-green-500" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Джерело *</label>
                        <input type="text" name="category" required placeholder="Напр.: З банку, інвестиція..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg text-white font-semibold">Внести</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    showCashOutModal() {
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-orange-400"><i class="fas fa-arrow-up mr-2"></i>Зняття з каси</h3>
                <form onsubmit="window.saveCashOperation(event, 'cash_out')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн) *</label>
                        <input type="number" name="amount" required min="0.01" step="0.01" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-xl font-bold text-orange-400 focus:outline-none focus:border-orange-500" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Призначення *</label>
                        <input type="text" name="category" required placeholder="Напр.: В банк, зарплата..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-orange-600 hover:bg-orange-700 py-3 rounded-lg text-white font-semibold">Зняти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    showExpenseModal() {
        const categories = ['Закупівля запчастин', 'Зарплата', 'Оренда', 'Комунальні послуги', 'Реклама', 'Податки', 'Інше'];
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-red-400"><i class="fas fa-minus-circle mr-2"></i>Витрата (розхід)</h3>
                <form onsubmit="window.saveCashOperation(event, 'expense')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн) *</label>
                        <input type="number" name="amount" required min="0.01" step="0.01" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-xl font-bold text-red-400 focus:outline-none focus:border-red-500" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Категорія витрат *</label>
                        <select name="category" id="expenseCategory" onchange="document.getElementById('customCat').style.display=this.value==='custom'?'block':'none'" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-2 focus:outline-none focus:border-red-500">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            <option value="custom">Інше (ввести вручну)</option>
                        </select>
                        <input type="text" id="customCat" style="display:none" placeholder="Вкажіть категорію..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Опис (необов'язково)</label>
                        <textarea name="description" rows="2" placeholder="Деталі витрати..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"></textarea>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg text-white font-semibold">Зафіксувати</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveOperation(e, type) {
        e.preventDefault();
        const form = e.target;
        const amount = parseFloat(form.amount.value);
        
        if (!amount || amount <= 0) {
            window.Toast.show('Вкажіть коректну суму', 'error');
            return;
        }

        let category = form.category.value;
        if (category === 'custom') {
            const customVal = document.getElementById('customCat').value;
            category = customVal ? customVal.trim() : 'Інше';
        }

        Database.create('transactions', {
            type: type,
            amount: amount,
            category: category,
            description: form.description?.value || '',
            date: new Date().toISOString(),
            user: 'admin'
        });

        window.Modal.close();
        
        const messages = {
            'cash_in': 'Готівку внесено в касу',
            'cash_out': 'Готівку знято з каси',
            'expense': 'Витрату зафіксовано'
        };
        
        window.Toast.show(messages[type], 'success');
        
        // Оновлюємо сторінку фінансів
        if (window.currentRoute === 'finance') {
            import('./router.js').then(m => m.default.navigate('finance'));
        }
    },

    filterTransactions(type) {
        const transactions = Database.query('transactions').slice(-30).reverse();
        document.getElementById('transactionsList').innerHTML = this.renderTransactionsList(transactions, type);
    }
};

// Глобальні функції
window.showCashInModal = () => FinanceModule.showCashInModal();
window.showCashOutModal = () => FinanceModule.showCashOutModal();
window.showExpenseModal = () => FinanceModule.showExpenseModal();
window.saveCashOperation = (e, type) => FinanceModule.saveOperation(e, type);
window.filterTransactions = (type) => FinanceModule.filterTransactions(type);

export default FinanceModule;
