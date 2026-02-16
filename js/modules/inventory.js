import Database from './database.js';

const InventoryModule = {
    currentCategory: 'all',
    
    render() {
        const items = this.getFilteredItems();
        const categories = this.getCategories();
        
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Склад запчастин</h2>
                <div class="flex gap-2">
                    <button onclick="window.showAddPartModal()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <i class="fas fa-plus"></i> Нова запчастина
                    </button>
                    <button onclick="window.showSupplyModal()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                        <i class="fas fa-truck"></i> Поставка
                    </button>
                </div>
            </div>

            <!-- Фільтри по категоріям -->
            <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button onclick="window.filterInventory('all')" 
                    class="px-4 py-2 rounded-lg ${this.currentCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors">
                    Всі
                </button>
                ${categories.map(cat => `
                    <button onclick="window.filterInventory('${cat}')" 
                        class="px-4 py-2 rounded-lg ${this.currentCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors whitespace-nowrap">
                        ${cat}
                    </button>
                `).join('')}
            </div>

            <!-- Статистика складу -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div class="glass p-4 rounded-xl border-l-4 border-blue-500">
                    <div class="text-gray-400 text-sm">Всього позицій</div>
                    <div class="text-2xl font-bold">${Database.query('inventory').length}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-yellow-500">
                    <div class="text-gray-400 text-sm">Критичний запас</div>
                    <div class="text-2xl font-bold text-yellow-400">${Database.query('inventory').filter(i => i.qty < 3).length}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-green-500">
                    <div class="text-gray-400 text-sm">Загальна вартість</div>
                    <div class="text-2xl font-bold">₴${Database.query('inventory').reduce((sum, i) => sum + (i.qty * i.price), 0)}</div>
                </div>
                <div class="glass p-4 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-sm">Собівартість</div>
                    <div class="text-2xl font-bold">₴${Database.query('inventory').reduce((sum, i) => sum + (i.qty * i.cost), 0)}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${items.map(item => this.renderCard(item)).join('')}
            </div>
        `;
    },

    getFilteredItems() {
        if (this.currentCategory === 'all') {
            return Database.query('inventory');
        }
        return Database.query('inventory').filter(i => i.category === this.currentCategory);
    },

    getCategories() {
        const items = Database.query('inventory');
        const categories = [...new Set(items.map(i => i.category))];
        return categories.sort();
    },

    filter(category) {
        this.currentCategory = category;
        this.refresh();
    },

    refresh() {
        import('./router.js').then(m => m.default.navigate('inventory'));
    },

    renderCard(item) {
        const lowStock = item.qty < 3;
        const profit = item.price - (item.cost || 0);
        const profitPercent = item.cost > 0 ? ((profit / item.cost) * 100).toFixed(0) : '—';
        
        return `
            <div class="glass p-4 rounded-xl border ${lowStock ? 'border-red-500/50 bg-red-500/10' : 'border-gray-700'} transition-all hover:border-blue-500/50 relative group">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-semibold text-lg">${item.name}</h3>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.editPart(${item.id})" class="text-blue-400 hover:text-blue-300" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.adjustStock(${item.id}, 'add')" class="text-green-400 hover:text-green-300" title="Додати">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        <button onclick="window.adjustStock(${item.id}, 'remove')" class="text-orange-400 hover:text-orange-300" title="Списати">
                            <i class="fas fa-minus-circle"></i>
                        </button>
                    </div>
                </div>
                
                <div class="text-sm text-gray-400 mb-3 flex justify-between">
                    <span>${item.category}</span>
                    <span class="font-mono text-xs bg-gray-800 px-2 py-1 rounded">${item.sku}</span>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <div class="text-2xl font-bold ${lowStock ? 'text-red-400' : 'text-white'}">${item.qty} шт.</div>
                        <div class="text-xs text-gray-500">Мінімум: 3 шт.</div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-semibold">₴${item.price}</div>
                        <div class="text-xs text-gray-500">Закупівля: ₴${item.cost}</div>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-3 border-t border-gray-700/50">
                    <div class="text-xs ${profit > 0 ? 'text-green-400' : 'text-red-400'}">
                        Прибуток: ₴${profit} (${profitPercent}%)
                    </div>
                    ${lowStock ? '<span class="text-xs text-red-400 font-bold"><i class="fas fa-exclamation-triangle"></i> Закінчується</span>' : ''}
                </div>
            </div>
        `;
    },

    // Додавання нової запчастини
    showAddModal() {
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова запчастина</h3>
                <form onsubmit="window.saveNewPart(event)" class="space-y-4">
                    <input type="text" id="partName" placeholder="Назва" required 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <input type="text" id="partSku" placeholder="Артикул" required 
                            class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <input type="text" id="partCategory" placeholder="Категорія" list="categories" required 
                            class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>
                    
                    <datalist id="categories">
                        ${this.getCategories().map(c => `<option value="${c}">`).join('')}
                        <option value="Дисплеї">
                        <option value="АКБ">
                        <option value="Клавіатури">
                        <option value="Роз'єми">
                        <option value="Корпуси">
                        <option value="Шлейфи">
                        <option value="Кнопки">
                    </datalist>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Кількість</label>
                            <input type="number" id="partQty" value="0" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Собівартість ₴</label>
                            <input type="number" id="partCost" placeholder="0.00" step="0.01" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Ціна продажу ₴</label>
                            <input type="number" id="partPrice" placeholder="0.00" step="0.01" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
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
        this.refresh();
    },

    // Редагування запчастини
    edit(id) {
        const part = Database.find('inventory', id);
        if (!part) return;

        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати запчастину</h3>
                <form onsubmit="window.saveEditedPart(event, ${id})" class="space-y-4">
                    <input type="text" id="editPartName" value="${part.name}" required 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <input type="text" id="editPartSku" value="${part.sku}" required 
                            class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <input type="text" id="editPartCategory" value="${part.category}" list="categories" required 
                            class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Кількість</label>
                            <input type="number" id="editPartQty" value="${part.qty}" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Собівартість ₴</label>
                            <input type="number" id="editPartCost" value="${part.cost}" step="0.01" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Ціна продажу ₴</label>
                            <input type="number" id="editPartPrice" value="${part.price}" step="0.01" min="0" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-semibold">Зберегти зміни</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveEdit(e, id) {
        e.preventDefault();
        Database.update('inventory', id, {
            name: document.getElementById('editPartName').value,
            sku: document.getElementById('editPartSku').value,
            category: document.getElementById('editPartCategory').value,
            qty: parseInt(document.getElementById('editPartQty').value) || 0,
            cost: parseFloat(document.getElementById('editPartCost').value) || 0,
            price: parseFloat(document.getElementById('editPartPrice').value) || 0
        });
        window.Modal.close();
        window.Toast.show('Запчастину оновлено', 'success');
        this.refresh();
    },

    // Коригування залишків (+/-)
    adjustStock(id, action) {
        const part = Database.find('inventory', id);
        if (!part) return;

        const isAdd = action === 'add';
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 ${isAdd ? 'text-green-400' : 'text-orange-400'}">
                    <i class="fas ${isAdd ? 'fa-plus-circle' : 'fa-minus-circle'} mr-2"></i>
                    ${isAdd ? 'Додати на склад' : 'Списати зі складу'}
                </h3>
                <div class="mb-4 p-3 bg-gray-900 rounded-lg">
                    <div class="font-semibold">${part.name}</div>
                    <div class="text-sm text-gray-400">Поточний залишок: ${part.qty} шт.</div>
                </div>
                <form onsubmit="window.saveStockAdjustment(event, ${id}, '${action}')" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Кількість для ${isAdd ? 'додавання' : 'списання'} *</label>
                        <input type="number" id="adjustQty" min="1" required 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-lg font-bold ${isAdd ? 'text-green-400' : 'text-orange-400'}" 
                            placeholder="0">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Причина / Примітка *</label>
                        <input type="text" id="adjustReason" required 
                            placeholder="${isAdd ? 'Напр.: Поставка від постачальника' : 'Напр.: Брак, списання на ремонт'}" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    ${isAdd ? `
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Ціна закупівлі (за од.)</label>
                        <input type="number" id="adjustCost" step="0.01" placeholder="₴${part.cost}" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    ` : ''}
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 ${isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} py-2 rounded-lg text-white font-semibold">
                            ${isAdd ? 'Додати' : 'Списати'}
                        </button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveAdjustment(e, id, action) {
        e.preventDefault();
        const part = Database.find('inventory', id);
        const qty = parseInt(document.getElementById('adjustQty').value);
        const reason = document.getElementById('adjustReason').value;
        
        if (!qty || qty <= 0) {
            window.Toast.show('Вкажіть коректну кількість', 'error');
            return;
        }

        if (action === 'add') {
            // Додавання (поставка)
            const newCost = parseFloat(document.getElementById('adjustCost').value) || part.cost;
            
            // Оновлюємо середньозважену собівартість
            const totalCost = (part.qty * part.cost) + (qty * newCost);
            const totalQty = part.qty + qty;
            part.cost = totalCost / totalQty;
            
            part.qty += qty;
            
            // Записуємо в історію поставок (опціонально)
            Database.create('transactions', {
                type: 'expense',
                amount: qty * newCost,
                category: `Закупівля: ${part.name}`,
                description: reason,
                date: new Date().toISOString()
            });
            
            window.Toast.show(`Додано ${qty} шт. ${part.name}`, 'success');
        } else {
            // Списання
            if (part.qty < qty) {
                window.Toast.show('Недостатньо на складі!', 'error');
                return;
            }
            
            part.qty -= qty;
            window.Toast.show(`Списано ${qty} шт. ${part.name}`, 'info');
        }
        
        Database.save();
        window.Modal.close();
        this.refresh();
    },

    // Поставка (масове додавання)
    showSupplyModal() {
        const parts = Database.query('inventory');
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-truck mr-2"></i>Оприбуткування поставки</h3>
                <form onsubmit="window.saveSupply(event)" class="space-y-4">
                    <div class="max-h-[400px] overflow-y-auto space-y-3" id="supplyItems">
                        ${parts.map(part => `
                            <div class="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                                <input type="checkbox" id="supply_${part.id}" value="${part.id}" class="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                    onchange="document.getElementById('qty_${part.id}').disabled = !this.checked; document.getElementById('cost_${part.id}').disabled = !this.checked">
                                <div class="flex-1">
                                    <label for="supply_${part.id}" class="font-medium cursor-pointer">${part.name}</label>
                                    <div class="text-xs text-gray-400">${part.category} | Поточно: ${part.qty} шт.</div>
                                </div>
                                <input type="number" id="qty_${part.id}" placeholder="К-ть" min="1" disabled
                                    class="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center disabled:opacity-50">
                                <input type="number" id="cost_${part.id}" placeholder="Ціна ₴" step="0.01" min="0" disabled
                                    class="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center disabled:opacity-50">
                            </div>
                        `).join('')}
                    </div>
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Постачальник / Примітка</label>
                        <input type="text" id="supplyNote" placeholder="Назва постачальника, номер накладної..." 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white font-semibold">Оприбуткувати</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveSupply(e) {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('#supplyItems input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            window.Toast.show('Виберіть хоча б одну позицію', 'error');
            return;
        }

        let totalAmount = 0;
        let updatedCount = 0;

        checkboxes.forEach(cb => {
            const id = parseInt(cb.value);
            const qty = parseInt(document.getElementById(`qty_${id}`).value) || 0;
            const cost = parseFloat(document.getElementById(`cost_${id}`).value) || 0;
            
            if (qty > 0) {
                const part = Database.find('inventory', id);
                const oldQty = part.qty;
                
                // Перерахунок середньозваженої собівартості
                if (cost > 0) {
                    const totalCost = (oldQty * part.cost) + (qty * cost);
                    part.cost = totalCost / (oldQty + qty);
                }
                
                part.qty += qty;
                totalAmount += qty * (cost || part.cost);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            Database.save();
            window.Modal.close();
            window.Toast.show(`Оприбутковано ${updatedCount} позицій на суму ₴${totalAmount.toFixed(2)}`, 'success');
            this.refresh();
        }
    },

    // Сервісні функції
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

// Глобальні функції
window.openAddPartModal = () => InventoryModule.showAddModal();
window.saveNewPart = (e) => InventoryModule.save(e);
window.editPart = (id) => InventoryModule.edit(id);
window.saveEditedPart = (e, id) => InventoryModule.saveEdit(e, id);
window.adjustStock = (id, action) => InventoryModule.adjustStock(id, action);
window.saveStockAdjustment = (e, id, action) => InventoryModule.saveAdjustment(e, id, action);
window.showSupplyModal = () => InventoryModule.showSupplyModal();
window.saveSupply = (e) => InventoryModule.saveSupply(e);
window.filterInventory = (cat) => InventoryModule.filter(cat);

export default InventoryModule;
