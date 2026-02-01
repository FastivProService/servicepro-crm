import Database from './database.js';
import { Toast } from './ui.js';

const FinanceModule = {
    // ... весь попередній код render(), getStats() і т.д. без змін ...

    showCashInModal() {
        // ЗМІНА: використовуємо window.Modal
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-arrow-down mr-2"></i>Внесення в касу</h3>
                <form onsubmit="window.saveCashOperation(event, 'cash_in')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн)</label>
                        <input type="number" name="amount" required min="1" step="0.01"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold text-green-400" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Джерело</label>
                        <input type="text" name="category" required placeholder="Напр.: З банку, Аванс..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white font-semibold">Внести в касу</button>
                        <!-- ВИПРАВЛЕННЯ: window.Modal.close() -->
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
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
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн)</label>
                        <input type="number" name="amount" required min="1" step="0.01"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold text-orange-400" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Примітка / Призначення</label>
                        <input type="text" name="category" required placeholder="Напр.: В банк, Зарплата..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg text-white font-semibold">Зняти з каси</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    showExpenseModal() {
        const categories = ['Закупівля запчастин', 'Зарплата', 'Оренда', 'Комунальні', 'Реклама', 'Інше'];
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-red-400"><i class="fas fa-minus-circle mr-2"></i>Витрата</h3>
                <form onsubmit="window.saveCashOperation(event, 'expense')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Сума (грн)</label>
                        <input type="number" name="amount" required min="1" step="0.01"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold text-red-400" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Категорія</label>
                        <select name="category" id="expenseCategory" onchange="document.getElementById('customCat').style.display=this.value==='custom'?'block':'none'" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-2">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            <option value="custom">Інше...</option>
                        </select>
                        <input type="text" id="customCat" style="display:none" placeholder="Вкажіть категорію..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Опис</label>
                        <textarea name="description" rows="2" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2"></textarea>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg text-white font-semibold">Зафіксувати</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    // ... решта коду (saveOperation, filterTransactions) без змін ...
};

// Глобальні функції
window.showCashInModal = () => FinanceModule.showCashInModal();
window.showCashOutModal = () => FinanceModule.showCashOutModal();
window.showExpenseModal = () => FinanceModule.showExpenseModal();
window.saveCashOperation = (e, type) => FinanceModule.saveOperation(e, type);
window.filterTransactions = (type) => FinanceModule.filterTransactions(type);

export default FinanceModule;
