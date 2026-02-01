import Database from './database.js';

const FinanceModule = {
    getStats() {
        const today = new Date().toDateString();
        const transactions = Database.query('transactions');
        
        const todayTrans = transactions.filter(t => new Date(t.date).toDateString() === today);
        const income = todayTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = todayTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        const monthTrans = transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth());
        const monthRevenue = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        
        return { income, expense, profit: income - expense, monthRevenue };
    },

    render() {
        const stats = this.getStats();
        const transactions = Database.query('transactions').slice(-20).reverse();
        
        return `
            <h2 class="text-3xl font-bold mb-6">Фінанси</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="glass p-6 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-sm">Дохід сьогодні</div>
                    <div class="text-2xl font-bold mt-1">₴${stats.income}</div>
                </div>
                <div class="glass p-6 rounded-xl border-l-4 border-red-500">
                    <div class="text-gray-400 text-sm">Витрати сьогодні</div>
                    <div class="text-2xl font-bold mt-1">₴${stats.expense}</div>
                </div>
                <div class="glass p-6 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-sm">Прибуток сьогодні</div>
                    <div class="text-2xl font-bold mt-1">₴${stats.profit}</div>
                </div>
            </div>
            
            <div class="glass rounded-xl p-6">
                <h3 class="font-semibold mb-4 text-lg">Останні операції</h3>
                <div class="space-y-3">
                    ${transactions.map(t => {
                        const order = t.orderId ? Database.find('orders', t.orderId) : null;
                        return `
                            <div class="flex justify-between items-center p-4 bg-gray-900 rounded-lg border border-gray-800">
                                <div>
                                    <div class="font-medium">${t.category}</div>
                                    <div class="text-xs text-gray-500">${new Date(t.date).toLocaleString('uk-UA')}</div>
                                    ${order ? `<div class="text-xs text-blue-400">${order.number}</div>` : ''}
                                </div>
                                <div class="${t.type === 'income' ? 'text-green-400' : 'text-red-400'} font-bold text-lg">
                                    ${t.type === 'income' ? '+' : '-'}₴${t.amount}
                                </div>
                            </div>
                        `;
                    }).join('') || '<p class="text-gray-500 text-center py-4">Немає транзакцій</p>'}
                </div>
            </div>
        `;
    }
};

export default FinanceModule;