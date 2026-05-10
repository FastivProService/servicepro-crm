import Database from './database.js';

const monthKey = (d) => {
    const dt = new Date(d);
    if (!Number.isFinite(dt.getTime())) return '';
    return dt.toISOString().slice(0, 7);
};

const money = (v) => `₴${Number(v || 0).toFixed(2)}`;

const SalariesModule = {
    selectedMonth: new Date().toISOString().slice(0, 7),

    ensureStorage() {
        if (!Array.isArray(Database.data.salaryOperations)) {
            Database.data.salaryOperations = [];
            Database.save();
        }
    },

    getOps() {
        this.ensureStorage();
        return Database.query('salaryOperations') || [];
    },

    getEmployees() {
        return (Database.query('users') || []).filter(u => ['technician', 'manager', 'admin'].includes(u.role));
    },

    getOrderMasterSalary(order) {
        if (!order?.assignedMasterId) return 0;
        const master = Database.find('users', order.assignedMasterId);
        if (!master) return 0;
        const payType = master.payType || 'percent';
        const payRate = Number(master.payRate || 0);
        const completedWorksTotal = (order.completedWorks || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
        const plannedServicesTotal = (order.services || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
        const serviceTotal = completedWorksTotal > 0 ? completedWorksTotal : plannedServicesTotal;
        const partsTotal = (order.parts || []).reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.qty || 0)), 0);
        const payRateServices = Number(master.payRateServices ?? payRate ?? 0);
        const payRateParts = Number(master.payRateParts ?? payRate ?? 0);
        if (payType === 'rate') return Number(order.actualHours || 0) * payRate;
        if (payType === 'piece') return completedWorksTotal;
        return (serviceTotal * (payRateServices / 100)) + (partsTotal * (payRateParts / 100));
    },

    calcByUser(userId, month) {
        const ops = this.getOps().filter(x => Number(x.userId) === Number(userId) && monthKey(x.date) === month);
        const accrual = ops.filter(x => x.type === 'accrual').reduce((s, x) => s + Number(x.amount || 0), 0);
        const bonus = ops.filter(x => x.type === 'bonus').reduce((s, x) => s + Number(x.amount || 0), 0);
        const fine = ops.filter(x => x.type === 'fine').reduce((s, x) => s + Number(x.amount || 0), 0);
        const payout = ops.filter(x => x.type === 'payout').reduce((s, x) => s + Number(x.amount || 0), 0);
        const accrued = accrual + bonus - fine;
        return { accrual, bonus, fine, payout, accrued, balance: accrued - payout };
    },

    render() {
        const employees = this.getEmployees();
        const month = this.selectedMonth;
        const ops = this.getOps().filter(x => monthKey(x.date) === month).slice().reverse();

        return `
            <div class="max-w-6xl fade-in">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <h2 class="text-2xl md:text-3xl font-bold">Зарплати</h2>
                    <div class="flex gap-2">
                        <input type="month" id="salaryMonth" value="${month}" onchange="window.setSalaryMonth(this.value)" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                        <button onclick="window.autoAccrueSalaries()" class="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg text-sm">Нарахувати з замовлень</button>
                        <button onclick="window.openSalaryOpModal()" class="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm">Операція</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    ${employees.map(u => {
                        const s = this.calcByUser(u.id, month);
                        return `
                            <div class="glass rounded-xl p-4 border border-gray-700">
                                <div class="font-semibold">${u.name}</div>
                                <div class="text-xs text-gray-500 mb-2">${u.role}</div>
                                <div class="text-sm space-y-1">
                                    <div class="flex justify-between"><span class="text-gray-400">Нараховано</span><span>${money(s.accrual)}</span></div>
                                    <div class="flex justify-between"><span class="text-gray-400">Бонуси</span><span class="text-green-400">${money(s.bonus)}</span></div>
                                    <div class="flex justify-between"><span class="text-gray-400">Штрафи</span><span class="text-red-400">-${money(s.fine)}</span></div>
                                    <div class="flex justify-between"><span class="text-gray-400">Видано</span><span>${money(s.payout)}</span></div>
                                    <div class="flex justify-between border-t border-gray-700 pt-1 font-semibold"><span>До видачі</span><span class="${s.balance >= 0 ? 'text-yellow-300' : 'text-red-400'}">${money(s.balance)}</span></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="p-3 border-b border-gray-700 font-semibold">Операції за ${month}</div>
                    <div class="max-h-80 overflow-y-auto">
                        ${ops.map(o => {
                            const u = Database.find('users', o.userId);
                            const sign = o.type === 'fine' || o.type === 'payout' ? '-' : '+';
                            const color = o.type === 'fine' || o.type === 'payout' ? 'text-red-400' : 'text-green-400';
                            return `<div class="p-3 border-b border-gray-800 text-sm flex justify-between">
                                <span>${new Date(o.date).toLocaleString('uk-UA')} · ${u?.name || '—'} · ${o.type} · ${o.note || ''}</span>
                                <span class="${color}">${sign}${money(o.amount)}</span>
                            </div>`;
                        }).join('') || '<div class="p-4 text-gray-500">Немає операцій</div>'}
                    </div>
                </div>
            </div>
        `;
    },

    openOpModal() {
        const users = this.getEmployees();
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Операція по зарплаті</h3>
                <form onsubmit="window.saveSalaryOp(event)" class="space-y-3">
                    <select name="userId" required class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                        ${users.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                    <select name="type" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                        <option value="accrual">Нарахування</option>
                        <option value="bonus">Бонус</option>
                        <option value="fine">Штраф</option>
                        <option value="payout">Видача</option>
                    </select>
                    <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Сума" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <input name="note" type="text" placeholder="Коментар" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <input name="date" type="datetime-local" class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2">
                    <div class="flex gap-2 pt-2">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 rounded py-2">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 border border-gray-600 rounded">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveOp(e) {
        e.preventDefault();
        const f = e.target;
        const amount = Number(f.amount.value || 0);
        if (amount <= 0) return window.Toast.show('Некоректна сума', 'warning');
        Database.create('salaryOperations', {
            userId: Number(f.userId.value),
            type: String(f.type.value),
            amount,
            note: String(f.note.value || '').trim(),
            date: f.date.value ? new Date(f.date.value).toISOString() : new Date().toISOString()
        });
        window.Modal.close();
        import('./router.js').then(m => m.default.navigate('salaries'));
    },

    autoAccrueFromOrders() {
        const month = this.selectedMonth;
        const ops = this.getOps();
        const keep = ops.filter(x => !(x.type === 'accrual' && x.note === `AUTO:${month}`));
        Database.data.salaryOperations = keep;

        const orders = (Database.query('orders') || []).filter(o => monthKey(o.issuedAt || o.createdAt) === month);
        const byUser = {};
        orders.forEach(o => {
            if (!o.assignedMasterId) return;
            byUser[o.assignedMasterId] = (byUser[o.assignedMasterId] || 0) + this.getOrderMasterSalary(o);
        });

        Object.entries(byUser).forEach(([userId, amount]) => {
            if (Number(amount) <= 0) return;
            Database.create('salaryOperations', {
                userId: Number(userId),
                type: 'accrual',
                amount: Number(amount.toFixed(2)),
                note: `AUTO:${month}`,
                date: new Date().toISOString()
            });
        });

        Database.save();
        window.Toast.show('Нарахування з замовлень виконано', 'success');
        import('./router.js').then(m => m.default.navigate('salaries'));
    }
};

window.setSalaryMonth = (v) => {
    SalariesModule.selectedMonth = v || new Date().toISOString().slice(0, 7);
    import('./router.js').then(m => m.default.navigate('salaries'));
};
window.openSalaryOpModal = () => SalariesModule.openOpModal();
window.saveSalaryOp = (e) => SalariesModule.saveOp(e);
window.autoAccrueSalaries = () => SalariesModule.autoAccrueFromOrders();

export default SalariesModule;
