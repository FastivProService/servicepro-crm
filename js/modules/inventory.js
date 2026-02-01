import Database from './database.js';

const InventoryModule = {
    render() {
        const items = Database.query('inventory');
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Склад запчастин</h2>
                <button onclick="window.openAddPartModal()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <i class="fas fa-plus"></i> Додати
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${items.map(item => this.renderCard(item)).join('')}
            </div>
        `;
    },

    renderCard(item) {
        const lowStock = item.qty < 3;
        return `
            <div class="glass p-4 rounded-xl border ${lowStock ? 'border-red-500/50 bg-red-500/10' : 'border-gray-700'} transition-all hover:border-blue-500/50">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold">${item.name}</h3>
                    <span class="text-xs bg-gray-700 px-2 py-1 rounded">${item.sku}</span>
                </div>
                <div class="text-sm text-gray-400 mb-3">${item.category}</div>
                <div class="flex justify-between items-end">
                    <div>
                        <div class="text-2xl font-bold ${lowStock ? 'text-red-400' : 'text-white'}">${item.qty} шт.</div>
                        <div class="text-xs text-gray-500">Мінімум: 3</div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-semibold">₴${item.price}</div>
                        <div class="text-xs text-gray-500">Закупівля: ₴${item.cost}</div>
                    </div>
                </div>
                ${lowStock ? '<div class="mt-2 text-xs text-red-400 flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Критичний залишок</div>' : ''}
            </div>
        `;
    },

    showAddModal() {
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова запчастина</h3>
                <form onsubmit="window.saveNewPart(event)" class="space-y-4">
                    <input type="text" id="partName" placeholder="Назва" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    <input type="text" id="partSku" placeholder="Артикул" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    <input type="text" id="partCategory" placeholder="Категорія" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    <div class="grid grid-cols-3 gap-4">
                        <input type="number" id="partQty" placeholder="К-ть" required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <input type="number" id="partCost" placeholder="Собів." required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <input type="number" id="partPrice" placeholder="Ціна" required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-semibold">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    save(e) {
        e.preventDefault();
        Database.create('inventory', {
            name: document.getElementById('partName').value,
            sku: document.getElementById('partSku').value,
            category: document.getElementById('partCategory').value,
            qty: parseInt(document.getElementById('partQty').value) || 0,
            cost: parseFloat(document.getElementById('partCost').value) || 0,
            price: parseFloat(document.getElementById('partPrice').value) || 0
        });
        window.Modal.close();
        window.Toast.show('Запчастину додано', 'success');
        import('./router.js').then(m => m.default.navigate('inventory'));
    },

    deduct(partId, qty) {
        const part = Database.find('inventory', partId);
        if (part && part.qty >= qty) {
            part.qty -= qty;
            Database.save();
            return true;
        }
        return false;
    },

    return(partId, qty) {
        const part = Database.find('inventory', partId);
        if (part) {
            part.qty += qty;
            Database.save();
        }
    }
};

window.openAddPartModal = () => InventoryModule.showAddModal();
window.saveNewPart = (e) => InventoryModule.save(e);

export default InventoryModule;
