import Database from './database.js';
import ClientModule from './clients.js';
import InventoryModule from './inventory.js';

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
                window.Toast.show(`SMS: Замовлення ${order.number} готове!`, 'info');
            }
            Database.save();
        }
    },

    renderList() {
        const orders = Database.query('orders').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            return `
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">Замовлення</h2>
                    <span class="text-gray-400 text-sm">${orders.length} шт.</span>
                </div>
                <div class="space-y-3 pb-20">
                    ${orders.map(o => this.renderMobileCard(o)).join('')}
                </div>
            `;
        }
        
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Замовлення</h2>
                <button onclick="window.navigateTo('newOrder')" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                    <i class="fas fa-plus"></i> Нове
                </button>
            </div>
            <div class="glass rounded-xl overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-4 text-left">№</th>
                            <th class="px-6 py-4 text-left">Клієнт</th>
                            <th class="px-6 py-4 text-left">Статус</th>
                            <th class="px-6 py-4 text-right">Сума</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${orders.map(o => this.renderRow(o)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderMobileCard(order) {
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        const statusColors = {
            'new': 'bg-gray-700',
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
            <div class="mobile-card swipe-action" onclick="window.openOrderDetail(${order.id})">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-mono text-blue-400 font-bold text-sm">${order.number}</div>
                        <div class="font-semibold text-lg">${client?.name || 'Невідомо'}</div>
                    </div>
                    <span class="px-2 py-1 rounded-full text-xs ${statusColors[order.status] || 'bg-gray-700'}">
                        ${statusNames[order.status]}
                    </span>
                </div>
                <div class="text-gray-400 text-sm mb-3">
                    ${order.deviceBrand} ${order.deviceModel}
                </div>
                <div class="flex justify-between items-center border-t border-gray-700 pt-3">
                    <span class="text-gray-500 text-sm">${new Date(order.createdAt).toLocaleDateString()}</span>
                    <span class="font-bold text-lg">₴${total}</span>
                </div>
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
            'new': 'Новий
