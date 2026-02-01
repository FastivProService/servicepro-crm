import Database from './database.js';
import { Modal } from './ui.js';

const ClientModule = {
    searchByPhone(phone) {
        return Database.query('clients').find(c => c.phone === phone);
    },

    getOrCreate(phone, name) {
        let client = this.searchByPhone(phone);
        if (!client) {
            client = Database.create('clients', { name, phone, email: '', orders: 0 });
        }
        return client;
    },

    incrementOrders(clientId) {
        const client = Database.find('clients', clientId);
        if (client) {
            client.orders++;
            Database.save();
        }
    },

    renderList() {
        const clients = Database.query('clients');
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Клієнти</h2>
                <div class="relative">
                    <input type="text" id="clientSearch" placeholder="Пошук..." 
                        class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 w-64"
                        onkeyup="window.filterClients()">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-500"></i>
                </div>
            </div>
            <div class="glass rounded-xl overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">ПІБ</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Телефон</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Замовлень</th>
                            <th class="px-6 py-4 text-right text-sm font-medium text-gray-400">Дії</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${clients.map(c => `
                            <tr class="hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 font-medium">${c.name}</td>
                                <td class="px-6 py-4 text-gray-400">${c.phone}</td>
                                <td class="px-6 py-4">
                                    <span class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">${c.orders}</span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="window.showClientHistory(${c.id})" class="text-blue-400 hover:text-blue-300">
                                        <i class="fas fa-history"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    showHistory(clientId) {
        const client = Database.find('clients', clientId);
        const orders = Database.findBy('orders', 'clientId', clientId);
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">${client.name}</h3>
                <p class="text-gray-400 mb-4">Телефон: ${client.phone}</p>
                <h4 class="font-semibold mb-2">Історія замовлень (${orders.length}):</h4>
                <div class="space-y-2 max-h-96 overflow-y-auto">
                    ${orders.map(o => `
                        <div class="p-3 bg-gray-900 rounded border border-gray-700">
                            <div class="flex justify-between">
                                <span class="font-mono text-blue-400">${o.number}</span>
                                <span class="text-gray-400">${new Date(o.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div class="text-sm">${o.deviceBrand} ${o.deviceModel}</div>
                        </div>
                    `).join('') || '<p class="text-gray-500">Немає замовлень</p>'}
                </div>
                <button onclick="Modal.close()" class="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded">Закрити</button>
            </div>
        `);
    }
};

// Глобальні функції для onclick в HTML
window.filterClients = () => {
    const term = document.getElementById('clientSearch').value.toLowerCase();
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
};

window.showClientHistory = (id) => ClientModule.showHistory(id);


export default ClientModule;
