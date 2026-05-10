import Database from './database.js';

const InventoryModule = {
    currentCategory: 'all',

    getAvailableQty(item) {
        const reserved = Number(item?.reservedQty || 0);
        return Math.max(0, Number(item?.qty || 0) - reserved);
    },

    getSuppliers() {
        const fromDb = Array.isArray(Database.data?.inventorySuppliers) ? Database.data.inventorySuppliers : [];
        const fromItems = (Database.query('inventory') || []).map(i => (i.supplier || '').trim()).filter(Boolean);
        return [...new Set([...fromDb, ...fromItems])].sort((a, b) => a.localeCompare(b, 'uk'));
    },

    rememberSupplier(name) {
        const clean = (name || '').trim();
        if (!clean) return;
        if (!Array.isArray(Database.data.inventorySuppliers)) Database.data.inventorySuppliers = [];
        if (!Database.data.inventorySuppliers.some(s => s.toLowerCase() === clean.toLowerCase())) {
            Database.data.inventorySuppliers.push(clean);
            Database.save();
        }
    },

    parseSerialNumbers(input) {
        return [...new Set(String(input || '')
            .split(/\r?\n|,|;/)
            .map(v => v.trim())
            .filter(Boolean))];
    },
    
    render() {
        const items = this.getFilteredItems();
        const categories = this.getCategories();
        
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Склад запчастин</h2>
                <div class="flex gap-2">
                    <button onclick="window.openAddPartModal()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
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
                    <div class="text-2xl font-bold text-yellow-400">${Database.query('inventory').filter(i => this.getAvailableQty(i) <= (Number(i.minQty) || 3)).length}</div>
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

            ${Database.query('inventory').filter(i => this.getAvailableQty(i) <= (Number(i.minQty) || 3)).length > 0 ? `
                <div class="mb-4 p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-300 text-sm">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Є позиції з нестачею відносно мінімального залишку.
                </div>
            ` : ''}

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
        const availableQty = this.getAvailableQty(item);
        const minQty = Number(item.minQty) || 3;
        const lowStock = availableQty <= minQty;
        const profit = item.price - (item.cost || 0);
        const profitPercent = item.cost > 0 ? ((profit / item.cost) * 100).toFixed(0) : '—';
        const serialCount = Array.isArray(item.serialNumbers) ? item.serialNumbers.length : 0;
        
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
                        <button onclick="window.deletePart(${item.id})" class="text-red-400 hover:text-red-300" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="text-sm text-gray-400 mb-3 flex justify-between">
                    <span>${item.category}</span>
                    <span class="font-mono text-xs bg-gray-800 px-2 py-1 rounded">${item.sku}</span>
                </div>

                ${item.supplier ? `<div class="text-xs text-gray-400 mb-2"><i class="fas fa-truck mr-1"></i>${item.supplier}</div>` : ''}
                <div class="text-xs text-cyan-400 mb-2"><i class="fas fa-barcode mr-1"></i>Серійних в наявності: ${serialCount}</div>

                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <div class="text-2xl font-bold ${lowStock ? 'text-red-400' : 'text-white'}">${item.qty} шт.</div>
                        <div class="text-xs text-gray-500">Доступно: ${availableQty} | Мінімум: ${minQty}</div>
                        <div class="text-xs text-gray-500">В резерві: ${item.reservedQty || 0}</div>
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
                    ${lowStock ? '<span class="text-xs text-red-400 font-bold"><i class="fas fa-exclamation-triangle"></i> Нестача</span>' : ''}
                </div>
            </div>
        `;
    },

    // Додавання нової запчастини
    showAddModal() {
        const suppliers = this.getSuppliers();
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова запчастина</h3>
                <form onsubmit="window.saveNewPart(event)" class="space-y-4">
                    <input type="text" id="partName" placeholder="Назва" required 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <input type="text" id="partSku" placeholder="Артикул (залиште порожнім для автогенерації)"
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                            <div class="text-xs text-gray-500 mt-1">Буде згенеровано: PART-XXXX</div>
                        </div>
                        <input type="text" id="partCategory" placeholder="Категорія" list="categories" required 
                            class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>

                    <div>
                        <input type="text" id="partSupplier" placeholder="Постачальник" list="suppliers"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <datalist id="suppliers">
                            ${suppliers.map(s => `<option value="${s}">`).join('')}
                        </datalist>
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
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Мінімальний залишок</label>
                        <input type="number" id="partMinQty" value="3" min="0" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Серійні номери (по одному в рядок)</label>
                        <textarea id="partSerials" rows="3" placeholder="SN12345&#10;SN12346" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"></textarea>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white font-semibold">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    generateSku() {
        const items = Database.query('inventory');
        const partNumbers = items
            .map(i => (i.sku || '').match(/^PART-(\d+)$/))
            .filter(Boolean)
            .map(m => parseInt(m[1], 10));
        const nextNum = partNumbers.length > 0 ? Math.max(...partNumbers) + 1 : 1;
        return `PART-${String(nextNum).padStart(4, '0')}`;
    },

    save(e) {
        e.preventDefault();
        let sku = (document.getElementById('partSku').value || '').trim();
        if (!sku) sku = this.generateSku();
        const serialNumbers = this.parseSerialNumbers(document.getElementById('partSerials')?.value || '');
        const supplier = (document.getElementById('partSupplier')?.value || '').trim();
        const qtyInput = parseInt(document.getElementById('partQty').value) || 0;
        const qty = Math.max(qtyInput, serialNumbers.length);
        Database.create('inventory', {
            name: document.getElementById('partName').value,
            sku: sku,
            category: document.getElementById('partCategory').value,
            qty,
            cost: parseFloat(document.getElementById('partCost').value) || 0,
            price: parseFloat(document.getElementById('partPrice').value) || 0,
            minQty: parseInt(document.getElementById('partMinQty')?.value) || 3,
            supplier,
            serialNumbers,
            reservedQty: 0,
            reservedSerialNumbers: []
        });
        this.rememberSupplier(supplier);
        window.Modal.close();
        window.Toast.show('Запчастину додано', 'success');
        this.refresh();
    },

    // Редагування запчастини
    edit(id) {
        const part = Database.find('inventory', id);
        if (!part) return;
        const suppliers = this.getSuppliers();
        const serialText = (part.serialNumbers || []).join('\n');

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

                    <div>
                        <input type="text" id="editPartSupplier" value="${(part.supplier || '').replace(/"/g, '&quot;')}" list="suppliers" placeholder="Постачальник"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <datalist id="suppliers">
                            ${suppliers.map(s => `<option value="${s}">`).join('')}
                        </datalist>
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
                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Мінімальний залишок</label>
                        <input type="number" id="editPartMinQty" value="${part.minQty || 3}" min="0" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-xs text-gray-400 mb-1">Серійні номери (по одному в рядок)</label>
                        <textarea id="editPartSerials" rows="4" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">${serialText}</textarea>
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
        const serialNumbers = this.parseSerialNumbers(document.getElementById('editPartSerials')?.value || '');
        const qtyInput = parseInt(document.getElementById('editPartQty').value) || 0;
        const supplier = (document.getElementById('editPartSupplier')?.value || '').trim();
        Database.update('inventory', id, {
            name: document.getElementById('editPartName').value,
            sku: document.getElementById('editPartSku').value,
            category: document.getElementById('editPartCategory').value,
            qty: Math.max(qtyInput, serialNumbers.length, Number(Database.find('inventory', id)?.reservedQty || 0)),
            cost: parseFloat(document.getElementById('editPartCost').value) || 0,
            price: parseFloat(document.getElementById('editPartPrice').value) || 0,
            minQty: parseInt(document.getElementById('editPartMinQty')?.value) || 3,
            supplier,
            serialNumbers
        });
        this.rememberSupplier(supplier);
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
                        <label class="block text-sm text-gray-400 mb-2">Постачальник</label>
                        <input type="text" id="adjustSupplier" list="suppliers" placeholder="Оберіть або введіть постачальника"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                        <datalist id="suppliers">${this.getSuppliers().map(s => `<option value="${s}">`).join('')}</datalist>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Ціна закупівлі (за од.)</label>
                        <input type="number" id="adjustCost" step="0.01" placeholder="₴${part.cost}" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Серійні номери (по одному в рядок)</label>
                        <textarea id="adjustSerials" rows="3" placeholder="SN001&#10;SN002" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2"></textarea>
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
            const supplier = (document.getElementById('adjustSupplier')?.value || '').trim();
            const serials = this.parseSerialNumbers(document.getElementById('adjustSerials')?.value || '');
            const existing = new Set((part.serialNumbers || []).map(s => String(s).toLowerCase()));
            const uniqueSerials = serials.filter(s => !existing.has(s.toLowerCase()));
            const effectiveQty = Math.max(qty, uniqueSerials.length);
            
            // Оновлюємо середньозважену собівартість
            const totalCost = (part.qty * part.cost) + (effectiveQty * newCost);
            const totalQty = part.qty + effectiveQty;
            part.cost = totalCost / totalQty;
            
            part.qty += effectiveQty;
            if (!Array.isArray(part.serialNumbers)) part.serialNumbers = [];
            part.serialNumbers.push(...uniqueSerials);
            if (supplier) {
                part.supplier = supplier;
                this.rememberSupplier(supplier);
            }
            
            // Записуємо в історію поставок (опціонально)
            Database.create('transactions', {
                type: 'expense',
                amount: effectiveQty * newCost,
                category: `Закупівля: ${part.name}`,
                description: [reason, supplier].filter(Boolean).join(' | '),
                date: new Date().toISOString()
            });
            
            window.Toast.show(`Додано ${effectiveQty} шт. ${part.name}`, 'success');
        } else {
            // Списання
            if (this.getAvailableQty(part) < qty) {
                window.Toast.show('Недостатньо на складі!', 'error');
                return;
            }
            
            part.qty -= qty;
            if (Array.isArray(part.serialNumbers) && part.serialNumbers.length > 0) {
                part.serialNumbers.splice(0, Math.min(qty, part.serialNumbers.length));
            }
            window.Toast.show(`Списано ${qty} шт. ${part.name}`, 'info');
        }
        
        Database.save();
        window.Modal.close();
        this.refresh();
    },

    // Поставка (масове додавання)
    showSupplyModal() {
        const parts = Database.query('inventory');
        const suppliers = this.getSuppliers();
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4 text-green-400"><i class="fas fa-truck mr-2"></i>Оприбуткування поставки</h3>
                <form onsubmit="window.saveSupply(event)" class="space-y-4">
                    <div class="max-h-[400px] overflow-y-auto space-y-3" id="supplyItems">
                        ${parts.map(part => `
                            <div class="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                                <input type="checkbox" id="supply_${part.id}" value="${part.id}" class="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-800"
                                    onchange="document.getElementById('qty_${part.id}').disabled = !this.checked; document.getElementById('cost_${part.id}').disabled = !this.checked; document.getElementById('serials_${part.id}').disabled = !this.checked;">
                                <div class="flex-1">
                                    <label for="supply_${part.id}" class="font-medium cursor-pointer">${part.name}</label>
                                    <div class="text-xs text-gray-400">${part.category} | Поточно: ${part.qty} шт.</div>
                                </div>
                                <input type="number" id="qty_${part.id}" placeholder="К-ть" min="1" disabled
                                    class="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center disabled:opacity-50">
                                <input type="number" id="cost_${part.id}" placeholder="Ціна ₴" step="0.01" min="0" disabled
                                    class="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-center disabled:opacity-50">
                                <textarea id="serials_${part.id}" placeholder="S/N (рядками)" disabled
                                    class="w-36 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs disabled:opacity-50"></textarea>
                            </div>
                        `).join('')}
                    </div>

                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Постачальник</label>
                        <input type="text" id="supplySupplier" list="suppliers" placeholder="Оберіть або введіть постачальника" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                        <datalist id="suppliers">${suppliers.map(s => `<option value="${s}">`).join('')}</datalist>
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
        const supplier = (document.getElementById('supplySupplier')?.value || '').trim();
        
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
            const serials = this.parseSerialNumbers(document.getElementById(`serials_${id}`).value || '');
            
            if (qty > 0) {
                const part = Database.find('inventory', id);
                const oldQty = part.qty;
                const existing = new Set((part.serialNumbers || []).map(s => String(s).toLowerCase()));
                const uniqueSerials = serials.filter(s => !existing.has(s.toLowerCase()));
                const effectiveQty = Math.max(qty, uniqueSerials.length);
                
                // Перерахунок середньозваженої собівартості
                if (cost > 0) {
                    const totalCost = (oldQty * part.cost) + (effectiveQty * cost);
                    part.cost = totalCost / (oldQty + effectiveQty);
                }
                
                part.qty += effectiveQty;
                if (!Array.isArray(part.serialNumbers)) part.serialNumbers = [];
                part.serialNumbers.push(...uniqueSerials);
                if (supplier) part.supplier = supplier;

                totalAmount += effectiveQty * (cost || part.cost);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            if (supplier) this.rememberSupplier(supplier);
            Database.save();
            window.Modal.close();
            window.Toast.show(`Оприбутковано ${updatedCount} позицій на суму ₴${totalAmount.toFixed(2)}`, 'success');
            this.refresh();
        }
    },

    // Сервісні функції
    deduct(partId, qty, serialNumber = '') {
        const part = Database.find('inventory', partId);
        if (part && part.qty >= qty) {
            const serial = String(serialNumber || '').trim();
            if (!Array.isArray(part.serialNumbers)) part.serialNumbers = [];

            if (serial) {
                const idx = part.serialNumbers.findIndex(s => String(s).toLowerCase() === serial.toLowerCase());
                if (idx === -1) return false;
                part.serialNumbers.splice(idx, 1);
            } else if (part.serialNumbers.length > 0) {
                part.serialNumbers.splice(0, Math.min(qty, part.serialNumbers.length));
            }

            part.qty -= qty;
            Database.save();
            return true;
        }
        return false;
    },

    reserveForOrder(partId, qty, serialNumber = '') {
        const part = Database.find('inventory', partId);
        if (!part) return false;
        if (!Array.isArray(part.reservedSerialNumbers)) part.reservedSerialNumbers = [];
        part.reservedQty = Number(part.reservedQty || 0);

        const serial = String(serialNumber || '').trim();
        if (serial) {
            const exists = (part.serialNumbers || []).some(s => String(s).toLowerCase() === serial.toLowerCase());
            const reserved = part.reservedSerialNumbers.some(s => String(s).toLowerCase() === serial.toLowerCase());
            if (!exists || reserved) return false;
            if (this.getAvailableQty(part) < 1) return false;
            part.reservedSerialNumbers.push(serial);
            part.reservedQty += 1;
            Database.save();
            return true;
        }

        if (this.getAvailableQty(part) < qty) return false;
        part.reservedQty += qty;
        Database.save();
        return true;
    },

    releaseReserve(partId, qty, serialNumber = '') {
        const part = Database.find('inventory', partId);
        if (!part) return;
        if (!Array.isArray(part.reservedSerialNumbers)) part.reservedSerialNumbers = [];
        part.reservedQty = Number(part.reservedQty || 0);

        const serial = String(serialNumber || '').trim();
        if (serial) {
            const idx = part.reservedSerialNumbers.findIndex(s => String(s).toLowerCase() === serial.toLowerCase());
            if (idx !== -1) {
                part.reservedSerialNumbers.splice(idx, 1);
                part.reservedQty = Math.max(0, part.reservedQty - 1);
            }
        } else {
            part.reservedQty = Math.max(0, part.reservedQty - qty);
        }
        Database.save();
    },

    commitReserved(partId, qty, serialNumber = '') {
        const part = Database.find('inventory', partId);
        if (!part) return false;
        const serial = String(serialNumber || '').trim();
        if (!Array.isArray(part.serialNumbers)) part.serialNumbers = [];
        if (!Array.isArray(part.reservedSerialNumbers)) part.reservedSerialNumbers = [];
        part.reservedQty = Number(part.reservedQty || 0);

        if (serial) {
            const sIdx = part.serialNumbers.findIndex(s => String(s).toLowerCase() === serial.toLowerCase());
            const rIdx = part.reservedSerialNumbers.findIndex(s => String(s).toLowerCase() === serial.toLowerCase());
            if (sIdx === -1 || rIdx === -1 || part.qty < 1) return false;
            part.serialNumbers.splice(sIdx, 1);
            part.reservedSerialNumbers.splice(rIdx, 1);
            part.qty -= 1;
            part.reservedQty = Math.max(0, part.reservedQty - 1);
            Database.save();
            return true;
        }

        if (part.qty < qty || part.reservedQty < qty) return false;
        part.qty -= qty;
        part.reservedQty -= qty;
        if (part.serialNumbers.length > 0) {
            const removeCount = Math.min(qty, part.serialNumbers.length - part.reservedSerialNumbers.length);
            if (removeCount > 0) part.serialNumbers.splice(0, removeCount);
        }
        Database.save();
        return true;
    },

    return(partId, qty, serialNumber = '') {
        const part = Database.find('inventory', partId);
        if (part) {
            part.qty += qty;
            const serial = String(serialNumber || '').trim();
            if (serial) {
                if (!Array.isArray(part.serialNumbers)) part.serialNumbers = [];
                if (!part.serialNumbers.some(s => String(s).toLowerCase() === serial.toLowerCase())) {
                    part.serialNumbers.push(serial);
                }
            }
            Database.save();
        }
    },

    deletePart(id) {
        const part = Database.find('inventory', id);
        if (!part) return;
        const orders = Database.query('orders') || [];
        const usedIn = orders.filter(o => o.parts?.some(p => p.partId == id));
        if (usedIn.length > 0) {
            if (!confirm(`Запчастина "${part.name}" використовується в ${usedIn.length} замовленні(ях). Видалити все одно?`)) return;
        } else if (!confirm(`Видалити запчастину "${part.name}"?`)) return;
        Database.delete('inventory', id);
        window.Toast.show('Запчастину видалено', 'info');
        this.refresh();
    }
};

// Глобальні функції
window.openAddPartModal = () => InventoryModule.showAddModal();
window.saveNewPart = (e) => InventoryModule.save(e);
window.editPart = (id) => InventoryModule.edit(id);
window.deletePart = (id) => InventoryModule.deletePart(id);
window.saveEditedPart = (e, id) => InventoryModule.saveEdit(e, id);
window.adjustStock = (id, action) => InventoryModule.adjustStock(id, action);
window.saveStockAdjustment = (e, id, action) => InventoryModule.saveAdjustment(e, id, action);
window.showSupplyModal = () => InventoryModule.showSupplyModal();
window.saveSupply = (e) => InventoryModule.saveSupply(e);
window.filterInventory = (cat) => InventoryModule.filter(cat);

export default InventoryModule;
