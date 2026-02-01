import Database from './database.js';
import ClientModule from './clients.js';
import InventoryModule from './inventory.js';
import { Modal, Toast } from './ui.js';

const OrderModule = {
    currentOrder: null,

    generateNumber() {
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const count = Database.query('orders').length + 1;
        return `R-${dateStr}-${String(count).padStart(3, '0')}`;
    },

    create(data) {
        const client = ClientModule.getOrCreate(data.phone, data.clientName);
        ClientModule.incrementOrders(client.id);
        
        const order = Database.create('orders', {
            number: this.generateNumber(),
            clientId: client.id,
            deviceType: data.deviceType,
            deviceBrand: data.deviceBrand,
            deviceModel: data.deviceModel,
            deviceSerial: data.deviceSerial || '',
            devicePassword: data.devicePassword || '',
            issue: data.issue,
            status: 'new',
            priority: data.priority || 'normal',
            prepayment: parseFloat(data.prepayment) || 0,
            createdAt: new Date().toISOString(),
            parts: [],
            services: []
        });

        if (order.prepayment > 0) {
            Database.create('transactions', {
                type: 'income',
                amount: order.prepayment,
                category: 'Аванс',
                orderId: order.id,
                date: new Date().toISOString()
            });
        }

        return order;
    },

    calculateTotal(order) {
        const partsTotal = order.parts?.reduce((sum, p) => sum + (p.price * p.qty), 0) || 0;
        const servicesTotal = order.services?.reduce((sum, s) => sum + s.price, 0) || 0;
        return partsTotal + servicesTotal;
    },

    addPart(orderId, partId, qty, price) {
        const order = Database.find('orders', orderId);
        const part = Database.find('inventory', partId);
        
        if (!order || !part) return false;
        if (part.qty < qty) return false;

        order.parts.push({
            partId: part.id,
            name: part.name,
            qty: qty,
            price: price
        });

        InventoryModule.deduct(partId, qty);
        Database.save();
        return true;
    },

    removePart(orderId, partIndex) {
        const order = Database.find('orders', orderId);
        if (!order || !order.parts[partIndex]) return;

        const part = order.parts[partIndex];
        InventoryModule.return(part.partId, part.qty);
        order.parts.splice(partIndex, 1);
        Database.save();
    },

    addService(orderId, serviceId, price) {
        const order = Database.find('orders', orderId);
        const service = Database.find('services', serviceId);
        
        if (!order || !service) return false;

        order.services.push({
            serviceId: service.id,
            name: service.name,
            price: price
        });
        Database.save();
        return true;
    },

    removeService(orderId, serviceIndex) {
        const order = Database.find('orders', orderId);
        if (order && order.services) {
            order.services.splice(serviceIndex, 1);
            Database.save();
        }
    },

    changeStatus(orderId, newStatus) {
        const order = Database.find('orders', orderId);
        if (order) {
            order.status = newStatus;
            if (newStatus === 'ready') {
                Toast.show(`SMS: Замовлення ${order.number} готове!`, 'info');
            }
            Database.save();
        }
    },

    renderList() {
        const orders = Database.query('orders').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Замовлення</h2>
                <button onclick="window.navigateTo('newOrder')" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <i class="fas fa-plus"></i> Нове замовлення
                </button>
            </div>
            <div class="glass rounded-xl overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">№</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Клієнт / Пристрій</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Статус</th>
                            <th class="px-6 py-4 text-right text-sm font-medium text-gray-400">Сума</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${orders.map(o => this.renderRow(o)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(order) {
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        const statusColors = {
            'new': 'bg-gray-700 text-gray-300',
            'diagnostic': 'bg-yellow-500/20 text-yellow-400',
            'in_repair': 'bg-blue-500/20 text-blue-400',
            'ready': 'bg-green-500/20 text-green-400',
            'issued': 'bg-gray-600 text-gray-400'
        };
        const statusNames = {
            'new': 'Новий',
            'diagnostic': 'Діагностика',
            'in_repair': 'В ремонті',
            'ready': 'Готовий',
            'issued': 'Видано'
        };

        return `
            <tr class="hover:bg-gray-800/50 transition-colors cursor-pointer" onclick="window.openOrderDetail(${order.id})">
                <td class="px-6 py-4 font-mono text-blue-400 font-semibold">${order.number}</td>
                <td class="px-6 py-4">
                    <div class="font-medium">${client?.name || 'Невідомо'}</div>
                    <div class="text-sm text-gray-400">${order.deviceBrand} ${order.deviceModel}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs ${statusColors[order.status] || 'bg-gray-700'}">${statusNames[order.status]}</span>
                </td>
                <td class="px-6 py-4 text-right font-bold">₴${total}</td>
            </tr>
        `;
    },

    renderForm() {
        return `
            <div class="max-w-4xl fade-in">
                <h2 class="text-3xl font-bold mb-6">Нове замовлення</h2>
                <form onsubmit="window.submitNewOrder(event)" class="space-y-6">
                    <div class="glass p-6 rounded-xl">
                        <h3 class="font-semibold mb-4 text-blue-400"><i class="fas fa-user mr-2"></i>Клієнт</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm text-gray-400 mb-2">Телефон *</label>
                                <input type="tel" name="phone" required onblur="window.autoFillClient(this)"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none" placeholder="+380...">
                            </div>
                            <div>
                                <label class="block text-sm text-gray-400 mb-2">ПІБ *</label>
                                <input type="text" name="clientName" required
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                            </div>
                        </div>
                    </div>

                    <div class="glass p-6 rounded-xl">
                        <h3 class="font-semibold mb-4 text-green-400"><i class="fas fa-laptop mr-2"></i>Пристрій</h3>
                        <div class="grid grid-cols-3 gap-4 mb-4">
                            <select name="deviceType" required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                                <option value="">Тип пристрою</option>
                                <option value="laptop">Ноутбук</option>
                                <option value="phone">Телефон</option>
                                <option value="pc">ПК</option>
                                <option value="printer">Принтер</option>
                                <option value="tablet">Планшет</option>
                            </select>
                            <input type="text" name="deviceBrand" placeholder="Бренд" required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                            <input type="text" name="deviceModel" placeholder="Модель" required class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <input type="text" name="deviceSerial" placeholder="S/N або IMEI" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                            <input type="text" name="devicePassword" placeholder="Пароль від пристрою" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                        </div>
                    </div>

                    <div class="glass p-6 rounded-xl">
                        <h3 class="font-semibold mb-4 text-yellow-400"><i class="fas fa-file-alt mr-2"></i>Деталі</h3>
                        <textarea name="issue" required rows="3" placeholder="Опис несправності..." class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 mb-4 focus:border-blue-500 focus:outline-none"></textarea>
                        <div class="grid grid-cols-2 gap-4">
                            <input type="number" name="prepayment" placeholder="Аванс (грн)" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                            <select name="priority" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                                <option value="normal">Звичайний пріоритет</option>
                                <option value="high">Високий</option>
                                <option value="urgent">Терміновий</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors">
                            Створити замовлення
                        </button>
                        <button type="button" onclick="window.navigateTo('orders')" class="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors">
                            Скасувати
                        </button>
                    </div>
                </form>
            </div>
        `;
    },

    openDetail(id) {
        const order = Database.find('orders', id);
        const client = Database.find('clients', order.clientId);
        this.currentOrder = order;
        
        const total = this.calculateTotal(order);
        const toPay = total - (order.prepayment || 0);

        const content = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold">Замовлення ${order.number}</h2>
                        <p class="text-gray-400">${new Date(order.createdAt).toLocaleString('uk-UA')}</p>
                    </div>
                    <div class="text-right">
                        <select onchange="window.updateOrderStatus(${order.id}, this.value)" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                            <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новий</option>
                            <option value="diagnostic" ${order.status === 'diagnostic' ? 'selected' : ''}>Діагностика</option>
                            <option value="in_repair" ${order.status === 'in_repair' ? 'selected' : ''}>В ремонті</option>
                            <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Готовий</option>
                            <option value="issued" ${order.status === 'issued' ? 'selected' : ''}>Видано</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="glass p-4 rounded-lg">
                        <div class="text-sm text-gray-400 mb-1">Клієнт</div>
                        <div class="font-semibold">${client.name}</div>
                        <div class="text-sm text-gray-400">${client.phone}</div>
                    </div>
                    <div class="glass p-4 rounded-lg">
                        <div class="text-sm text-gray-400 mb-1">Пристрій</div>
                        <div class="font-semibold">${order.deviceBrand} ${order.deviceModel}</div>
                        <div class="text-sm text-gray-400">S/N: ${order.deviceSerial || '—'}</div>
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <div class="text-sm text-gray-400 mb-1">Опис несправності</div>
                    <div>${order.issue}</div>
                </div>

                <!-- Запчастини -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-semibold text-purple-400"><i class="fas fa-cogs mr-2"></i>Запчастини</h3>
                        <button onclick="window.showAddPartToOrder()" class="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded hover:bg-purple-500/30 transition-colors">
                            <i class="fas fa-plus"></i> Додати
                        </button>
                    </div>
                    <div class="space-y-2 mb-2">
                        ${order.parts?.map((p, i) => `
                            <div class="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-700">
                                <div>
                                    <div class="font-medium">${p.name}</div>
                                    <div class="text-sm text-gray-400">${p.qty} шт. × ₴${p.price}</div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="font-bold">₴${p.qty * p.price}</span>
                                    <button onclick="window.removeOrderPart(${order.id}, ${i})" class="text-red-400 hover:text-red-300">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') || '<p class="text-gray-500 text-sm italic">Немає запчастин</p>'}
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        Всього: <span class="text-white font-semibold">₴${order.parts?.reduce((s, p) => s + p.price * p.qty, 0) || 0}</span>
                    </div>
                </div>

                <!-- Послуги -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-semibold text-cyan-400"><i class="fas fa-wrench mr-2"></i>Послуги</h3>
                        <button onclick="window.showAddServiceToOrder()" class="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded hover:bg-cyan-500/30 transition-colors">
                            <i class="fas fa-plus"></i> Додати
                        </button>
                    </div>
                    <div class="space-y-2 mb-2">
                        ${order.services?.map((s, i) => `
                            <div class="flex justify-between items-center bg-gray-900 p-3 rounded border border-gray-700">
                                <div class="font-medium">${s.name}</div>
                                <div class="flex items-center gap-3">
                                    <span class="font-bold">₴${s.price}</span>
                                    <button onclick="window.removeOrderService(${order.id}, ${i})" class="text-red-400 hover:text-red-300">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') || '<p class="text-gray-500 text-sm italic">Немає послуг</p>'}
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        Всього: <span class="text-white font-semibold">₴${order.services?.reduce((s, sv) => s + sv.price, 0) || 0}</span>
                    </div>
                </div>

                <!-- Разом -->
                <div class="glass p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 mb-6">
                    <div class="flex justify-between items-end">
                        <div>
                            <div class="text-sm text-gray-400">Загальна сума:</div>
                            <div class="text-3xl font-bold">₴${total}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-400">Аванс: <span class="text-green-400 font-semibold">₴${order.prepayment || 0}</span></div>
                            <div class="text-xl font-semibold mt-1">До сплати: ₴${toPay}</div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button onclick="window.printOrder(${order.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white transition-colors">
                        <i class="fas fa-print mr-2"></i>Друк
                    </button>
                    ${order.status !== 'issued' ? `
                        <button onclick="window.issueOrder(${order.id})" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white transition-colors">
                            <i class="fas fa-check mr-2"></i>Видано клієнту
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        Modal.open(content);
    },

    showAddPartModal() {
        const parts = Database.query('inventory').filter(p => p.qty > 0);
        if (parts.length === 0) {
            Toast.show('Немає запчастин на складі!', 'error');
            return;
        }
        
        const options = parts.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name} (в наявн.: ${p.qty})</option>`).join('');
        
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати запчастину</h3>
                <div class="space-y-4">
                    <select id="addPartId" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2" onchange="document.getElementById('addPartPrice').value = this.options[this.selectedIndex].dataset.price">
                        <option value="">Виберіть запчастину</option>
                        ${options}
                    </select>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" id="addPartQty" placeholder="Кількість" value="1" min="1" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                        <input type="number" id="addPartPrice" placeholder="Ціна" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="window.confirmAddPartToOrder()" class="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-white">Додати</button>
                    <button onclick="Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                </div>
            </div>
        `);
    },

    showAddServiceModal() {
        const services = Database.query('services');
        const options = services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name} (₴${s.price})</option>`).join('');
        
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати послугу</h3>
                <div class="space-y-4">
                    <select id="addServiceId" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2" onchange="document.getElementById('addServicePrice').value = this.options[this.selectedIndex].dataset.price">
                        <option value="">Виберіть послугу</option>
                        ${options}
                    </select>
                    <input type="number" id="addServicePrice" placeholder="Ціна" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="window.confirmAddServiceToOrder()" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-2 rounded-lg text-white">Додати</button>
                    <button onclick="Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                </div>
            </div>
        `);
    },

    printOrder(id) {
        const order = Database.find('orders', id);
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        
        const printWindow = window.open('', '_blank');
        const html = `
            <html>
            <head>
                <title>Акт ${order.number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #000; padding: 10px; text-align: left; }
                    th { background: #f0f0f0; }
                    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
                    .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>АКТ ВИКОНАНИХ РОБІТ</h1>
                    <h2>№ ${order.number}</h2>
                    <p>від ${new Date().toLocaleDateString('uk-UA')}</p>
                </div>
                
                <div class="section">
                    <p><strong>Виконавець:</strong> ТОВ "ServicePro"</p>
                    <p><strong>Замовник:</strong> ${client.name}, тел: ${client.phone}</p>
                </div>
                
                <div class="section">
                    <p><strong>Пристрій:</strong> ${order.deviceBrand} ${order.deviceModel}</p>
                    <p><strong>S/N:</strong> ${order.deviceSerial || '—'}</p>
                    <p><strong>Опис проблеми:</strong> ${order.issue}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Найменування</th>
                            <th>К-ть</th>
                            <th>Ціна</th>
                            <th>Сума</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.parts?.map((p, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${p.name}</td>
                                <td>${p.qty}</td>
                                <td>${p.price}</td>
                                <td>${p.qty * p.price}</td>
                            </tr>
                        `).join('') || ''}
                        ${order.services?.map((s, i) => `
                            <tr>
                                <td>${(order.parts?.length || 0) + i + 1}</td>
                                <td>${s.name} (послуга)</td>
                                <td>1</td>
                                <td>${s.price}</td>
                                <td>${s.price}</td>
                            </tr>
                        `).join('') || ''}
                    </tbody>
                </table>
                
                <div class="total">
                    Всього: ₴${total}<br>
                    ${order.prepayment > 0 ? `Аванс: ₴${order.prepayment}<br>До сплати: ₴${total - order.prepayment}` : ''}
                </div>
                
                <div class="signatures">
                    <div>Виконавець _________________</div>
                    <div>Замовник _________________</div>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
};

// Глобальні функції для HTML onclick
window.openOrderDetail = (id) => OrderModule.openDetail(id);
window.navigateTo = (route) => {
    // Імпортуємо Router динамічно щоб уникнути циклічних залежностей
    import('./router.js').then(module => {
        module.default.navigate(route);
    });
};
window.refreshCurrentPage = () => window.navigateTo(window.currentRoute || 'dashboard');

window.autoFillClient = (input) => {
    const client = ClientModule.searchByPhone(input.value);
    if (client) {
        document.querySelector('[name="clientName"]').value = client.name;
    }
};

window.submitNewOrder = (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.prepayment = parseFloat(data.prepayment) || 0;
    
    OrderModule.create(data);
    Toast.show('Замовлення створено!', 'success');
    window.navigateTo('orders');
};

window.updateOrderStatus = (id, status) => {
    OrderModule.changeStatus(id, status);
    OrderModule.openDetail(id);
    Toast.show('Статус оновлено', 'success');
};

window.showAddPartToOrder = () => OrderModule.showAddPartModal();
window.showAddServiceToOrder = () => OrderModule.showAddServiceModal();

window.confirmAddPartToOrder = () => {
    const partId = parseInt(document.getElementById('addPartId').value);
    const qty = parseInt(document.getElementById('addPartQty').value);
    const price = parseFloat(document.getElementById('addPartPrice').value);
    
    if (!partId || !qty || !price) {
        Toast.show('Заповніть всі поля', 'error');
        return;
    }
    
    if (OrderModule.addPart(OrderModule.currentOrder.id, partId, qty, price)) {
        OrderModule.openDetail(OrderModule.currentOrder.id);
        Toast.show('Запчастину додано', 'success');
    } else {
        Toast.show('Недостатньо на складі', 'error');
    }
};

window.confirmAddServiceToOrder = () => {
    const serviceId = parseInt(document.getElementById('addServiceId').value);
    const price = parseFloat(document.getElementById('addServicePrice').value);
    
    if (!serviceId || !price) {
        Toast.show('Виберіть послугу та вкажіть ціну', 'error');
        return;
    }
    
    OrderModule.addService(OrderModule.currentOrder.id, serviceId, price);
    OrderModule.openDetail(OrderModule.currentOrder.id);
    Toast.show('Послугу додано', 'success');
};

window.removeOrderPart = (orderId, idx) => {
    OrderModule.removePart(orderId, idx);
    OrderModule.openDetail(orderId);
    Toast.show('Запчастину видалено', 'info');
    window.refreshCurrentPage();
};

window.removeOrderService = (orderId, idx) => {
    OrderModule.removeService(orderId, idx);
    OrderModule.openDetail(orderId);
    Toast.show('Послугу видалено', 'info');
};

window.issueOrder = (id) => {
    const order = Database.find('orders', id);
    const total = OrderModule.calculateTotal(order);
    const toPay = total - (order.prepayment || 0);
    
    if (toPay > 0) {
        Database.create('transactions', {
            type: 'income',
            amount: toPay,
            category: 'Оплата ремонту',
            orderId: id,
            date: new Date().toISOString()
        });
    }
    
    OrderModule.changeStatus(id, 'issued');
    order.issuedAt = new Date().toISOString();
    Database.save();
    
    Modal.close();
    Toast.show('Замовлення видано клієнту', 'success');
    window.navigateTo('orders');
};

window.printOrder = (id) => OrderModule.printOrder(id);

export default OrderModule;