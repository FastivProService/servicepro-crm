import Database from './database.js';

const fmt = (n) => `₴${Number(n || 0).toFixed(2)}`;

const FinanceModule = {
    getAdminPricing() {
        const admin = Database.data?.adminConfig || {};
        const tariffs = admin.tariffs || {};
        const pricing = admin.pricing || {};
        return {
            urgentMultiplier: Math.max(1, Number(tariffs.urgentMultiplier || 1)),
            taxPercent: Math.max(0, Number(pricing.taxPercent || 0)),
            markupPercent: Math.max(0, Number(pricing.markupPercent || 0))
        };
    },

    escapeHtml(v) {
        return String(v || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    safeDateKey(d) {
        const dt = new Date(d);
        if (!Number.isFinite(dt.getTime())) return '';
        return dt.toISOString().slice(0, 10);
    },

    roundMoney(v) {
        return Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
    },

    getPaymentMethods() {
        const list = Database.data?.paymentMethods;
        return Array.isArray(list) && list.length ? list : ['cash', 'card', 'transfer'];
    },

    getStats() {
        const tx = Database.query('transactions') || [];
        const todayKey = this.safeDateKey(new Date());
        const monthPrefix = todayKey.slice(0, 7);

        const isIncome = (t) => ['income', 'cash_in'].includes(t.type);
        const isExpense = (t) => ['expense', 'cash_out'].includes(t.type);

        const dayTx = tx.filter(t => this.safeDateKey(t.date) === todayKey);
        const monthTx = tx.filter(t => String(t.date || '').startsWith(monthPrefix));

        const cashBalance = tx.reduce((s, t) => s + (isIncome(t) ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);
        const dayIncome = dayTx.filter(isIncome).reduce((s, t) => s + Number(t.amount || 0), 0);
        const dayExpense = dayTx.filter(isExpense).reduce((s, t) => s + Number(t.amount || 0), 0);
        const monthIncome = monthTx.filter(isIncome).reduce((s, t) => s + Number(t.amount || 0), 0);
        const monthExpense = monthTx.filter(isExpense).reduce((s, t) => s + Number(t.amount || 0), 0);

        return {
            cashBalance,
            dayIncome,
            dayExpense,
            dayProfit: dayIncome - dayExpense,
            monthIncome,
            monthExpense,
            monthProfit: monthIncome - monthExpense
        };
    },

    getOrderProfitability() {
        const orders = Database.query('orders') || [];
        const pricing = this.getAdminPricing();
        return orders.slice().reverse().slice(0, 30).map(o => {
            const baseIncome = (o.services || []).reduce((s, x) => s + Number(x.price || 0), 0) + (o.parts || []).reduce((s, x) => s + Number(x.price || 0) * Number(x.qty || 0), 0);
            const isUrgent = o.priority === 'urgent';
            const priorityCoeff = isUrgent ? pricing.urgentMultiplier : 1;
            const adjusted = this.roundMoney(baseIncome * priorityCoeff);
            const markup = this.roundMoney(adjusted * (pricing.markupPercent / 100));
            const taxable = this.roundMoney(adjusted + markup);
            const tax = this.roundMoney(taxable * (pricing.taxPercent / 100));
            const income = this.roundMoney(taxable + tax);
            const costParts = (o.parts || []).reduce((s, p) => {
                const inv = Database.find('inventory', p.partId);
                return s + Number(inv?.cost || 0) * Number(p.qty || 0);
            }, 0);
            const txExpense = (Database.query('transactions') || []).filter(t => t.orderId == o.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
            const cost = costParts + txExpense;
            const profit = income - cost;
            const margin = income > 0 ? (profit / income) * 100 : 0;
            return { order: o, income, cost, profit, margin, baseIncome, priorityCoeff, markup, tax };
        });
    },

    render() {
        const s = this.getStats();
        const methods = this.getPaymentMethods();
        const tx = (Database.query('transactions') || []).slice().reverse().slice(0, 50);
        const byMethod = methods.map(m => ({ method: m, sum: tx.filter(t => (t.paymentMethod || 'cash') === m && ['income', 'cash_in'].includes(t.type)).reduce((a, b) => a + Number(b.amount || 0), 0) }));
        const profitability = this.getOrderProfitability();
        const rro = Database.data?.financeConfig || { rroEnabled: false, rroProvider: 'none' };

        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Фінанси</h2>
                <div class="flex gap-2">
                    <button onclick="window.exportFinanceCSV()" class="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg text-sm">Експорт CSV</button>
                    <button onclick="window.showFinanceOperationModal()" class="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm">Операція</button>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div class="glass p-4 rounded-xl"><div class="text-xs text-gray-400">Каса</div><div class="text-xl font-bold">${fmt(s.cashBalance)}</div></div>
                <div class="glass p-4 rounded-xl"><div class="text-xs text-gray-400">Дохід (день)</div><div class="text-xl text-green-400 font-bold">${fmt(s.dayIncome)}</div></div>
                <div class="glass p-4 rounded-xl"><div class="text-xs text-gray-400">Витрати (день)</div><div class="text-xl text-red-400 font-bold">${fmt(s.dayExpense)}</div></div>
                <div class="glass p-4 rounded-xl"><div class="text-xs text-gray-400">Прибуток (місяць)</div><div class="text-xl text-blue-400 font-bold">${fmt(s.monthProfit)}</div></div>
            </div>

            <div class="glass p-4 rounded-xl mb-6">
                <h3 class="font-semibold mb-2">Способи оплати</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2">${byMethod.map(x => `<div class="bg-gray-900 rounded p-2 text-sm flex justify-between"><span>${x.method}</span><span>${fmt(x.sum)}</span></div>`).join('')}</div>
            </div>

            <div class="glass p-4 rounded-xl mb-6">
                <h3 class="font-semibold mb-2">Рентабельність замовлень (останні 30)</h3>
                <div class="max-h-64 overflow-y-auto space-y-2">
                    ${profitability.map(p => `<div class="bg-gray-900 rounded p-2 text-sm grid grid-cols-5 gap-2"><span class="font-mono">${this.escapeHtml(p.order.number)}</span><span>${fmt(p.income)}</span><span>${fmt(p.cost)}</span><span class="${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}">${fmt(p.profit)}</span><span title="База:${fmt(p.baseIncome)} Націнка:${fmt(p.markup)} Податок:${fmt(p.tax)}">${p.margin.toFixed(1)}%</span></div>`).join('') || '<div class="text-gray-500">Немає даних</div>'}
                </div>
            </div>

            <div class="glass p-4 rounded-xl mb-6">
                <h3 class="font-semibold mb-2">Інтеграція РРО/ПРРО (заготовка)</h3>
                <div class="text-sm text-gray-300">Статус: <b>${rro.rroEnabled ? 'увімкнено' : 'вимкнено'}</b>, провайдер: <b>${rro.rroProvider || 'none'}</b></div>
                <div class="flex gap-2 mt-3">
                    <button onclick="window.toggleRRO()" class="px-3 py-2 rounded bg-amber-600 hover:bg-amber-700 text-sm">Перемкнути РРО</button>
                    <button onclick="window.simulateFiscalReceipt()" class="px-3 py-2 rounded bg-violet-600 hover:bg-violet-700 text-sm">Тестовий фіскальний чек</button>
                </div>
            </div>

            <div class="glass rounded-xl overflow-hidden">
                <div class="p-3 border-b border-gray-700 font-semibold">Останні транзакції</div>
                <div class="max-h-72 overflow-y-auto">
                    ${tx.map(t => `<div class="p-3 border-b border-gray-800 text-sm flex justify-between"><span>${new Date(t.date).toLocaleString('uk-UA')} · ${this.escapeHtml(t.category || t.type)} · ${this.escapeHtml(t.paymentMethod || 'cash')}</span><span class="${['income','cash_in'].includes(t.type) ? 'text-green-400':'text-red-400'}">${['income','cash_in'].includes(t.type)?'+':'-'}${fmt(t.amount)}</span></div>`).join('') || '<div class="p-4 text-gray-500">Немає транзакцій</div>'}
                </div>
            </div>
        `;
    },

    openOperationModal() {
        const methods = this.getPaymentMethods();
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова операція</h3>
                <form onsubmit="window.saveFinanceOperation(event)" class="space-y-3">
                    <select name="type" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                        <option value="income">Дохід</option>
                        <option value="expense">Витрата</option>
                        <option value="cash_in">Внесення в касу</option>
                        <option value="cash_out">Зняття з каси</option>
                    </select>
                    <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Сума" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <input name="category" required placeholder="Категорія" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <select name="paymentMethod" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                        ${methods.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                    <input name="orderId" type="number" placeholder="ID замовлення (опц.)" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <div class="flex gap-2 pt-2">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 rounded py-2">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 border border-gray-600 rounded">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveOperation(e) {
        e.preventDefault();
        const f = e.target;
        const amount = Number(f.amount.value || 0);
        if (amount <= 0) return window.Toast.show('Некоректна сума', 'warning');
        const allowedTypes = new Set(['income', 'expense', 'cash_in', 'cash_out']);
        const type = String(f.type.value || '').trim();
        if (!allowedTypes.has(type)) {
            return window.Toast.show('Некоректний тип операції', 'warning');
        }
        const allowedMethods = new Set(this.getPaymentMethods().map(x => String(x)));
        const paymentMethod = String(f.paymentMethod.value || 'cash');
        if (!allowedMethods.has(paymentMethod)) {
            return window.Toast.show('Некоректний спосіб оплати', 'warning');
        }
        Database.create('transactions', {
            type,
            amount,
            category: String(f.category.value || '').trim(),
            paymentMethod,
            orderId: f.orderId.value ? Number(f.orderId.value) : null,
            date: new Date().toISOString()
        });
        window.Modal.close();
        import('./router.js').then(m => m.default.navigate('finance'));
    },

    exportCSV() {
        const tx = Database.query('transactions') || [];
        const rows = [['id','date','type','category','amount','paymentMethod','orderId']].concat(
            tx.map(t => [t.id, t.date, t.type, t.category || '', t.amount, t.paymentMethod || 'cash', t.orderId || ''])
        );
        const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    },

    toggleRRO() {
        const cfg = Database.data.financeConfig || { rroEnabled: false, rroProvider: 'none' };
        cfg.rroEnabled = !cfg.rroEnabled;
        if (!cfg.rroProvider || cfg.rroProvider === 'none') cfg.rroProvider = 'mock';
        Database.data.financeConfig = cfg;
        Database.save();
        import('./router.js').then(m => m.default.navigate('finance'));
    },

    simulateFiscalReceipt() {
        const cfg = Database.data.financeConfig || {};
        const logs = Database.data.integrationLogs || (Database.data.integrationLogs = []);
        logs.push({ id: Date.now(), at: new Date().toISOString(), type: 'rro_receipt', payload: { provider: cfg.rroProvider || 'mock', ok: true } });
        Database.save();
        window.Toast.show('Тестовий чек РРО/ПРРО створено (mock)', 'success');
    }
};

window.showFinanceOperationModal = () => FinanceModule.openOperationModal();
window.saveFinanceOperation = (e) => FinanceModule.saveOperation(e);
window.exportFinanceCSV = () => FinanceModule.exportCSV();
window.toggleRRO = () => FinanceModule.toggleRRO();
window.simulateFiscalReceipt = () => FinanceModule.simulateFiscalReceipt();

export default FinanceModule;
