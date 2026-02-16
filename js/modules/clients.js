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
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            return `
                <div class="flex flex-col gap-4 mb-4">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold">Клієнти</h2>
                        <span class="text-sm text-gray-400">${clients.length} ос.</span>
                    </div>
                    <div class="relative w-full">
                        <input type="text" id="clientSearch" placeholder="Пошук клієнта..." 
                            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pl-10 focus:border-blue-500 transition-colors"
                            onkeyup="window.filterClients()">
                        <i class="fas fa-search absolute left-3 top-3.5 text-gray-500"></i>
                    </div>
                </div>
                <div class="space-y-3 pb-20">
                    ${clients.map(c => this.renderMobileCard(c)).join('')}
                </div>
            `;
        }

        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Клієнти</h2>
                <div class="relative">
                    <input type="text" id="clientSearch" placeholder="Пошук..." 
                        class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-10 w-64 focus:border-blue-500 focus:outline-none"
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
                            <tr class="hover:bg-gray-800/50 transition-colors client-row">
                                <td class="px-6 py-4 font-medium client-name">${c.name}</td>
                                <td class="px-6 py-4 text-gray-400 client-phone">${c.phone}</td>
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

    renderMobileCard(client) {
        return `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 client-card">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-lg text-white client-name">${client.name}</div>
                        <a href="tel:${client.phone}" class="text-blue-400 text-sm flex items-center gap-2 mt-1 client-phone">
                            <i class="fas fa-phone-alt"></i> ${client.phone}
                        </a>
                    </div>
                    <span class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        ${client.orders} зам.
                    </span>
                </div>
                <div class="flex justify-end border-t border-gray-700 pt-3">
                    <button onclick="window.showClientHistory(${client.id})" class="w-full py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors flex items-center justify-center gap-2 text-sm">
                        <i class="fas fa-history text-blue-400"></i> Історія обслуговування
                    </button>
                </div>
            </div>
        `;
    },

    showHistory(clientId) {
        const client = Database.find('clients', clientId);
        if (!client) {
            window.Toast?.show('Клієнт не знайдений', 'error');
            return;
        }
        const orders = Database.findBy('orders', 'clientId', clientId);
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-2 text-white">${client.name}</h3>
                <a href="tel:${client.phone}" class="text-blue-400 block mb-6"><i class="fas fa-phone mr-2"></i>${client.phone}</a>
                
                <h4 class="font-semibold mb-3 text-gray-300">Історія замовлень (${orders.length})</h4>
                <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    ${orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(o => `
                        <div class="p-4 bg-gray-900 rounded-xl border border-gray-700 flex justify-between items-center" onclick="window.openOrderDetail(${o.id})">
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-mono text-blue-400 font-bold text-sm">${o.number}</span>
                                    <span class="text-gray-500 text-xs">${new Date(o.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div class="text-sm font-medium text-white">${o.deviceBrand} ${o.deviceModel}</div>
                            </div>
                            <i class="fas fa-chevron-right text-gray-600"></i>
                        </div>
                    `).join('') || '<div class="text-center py-4 text-gray-500 bg-gray-900 rounded-xl">Немає замовлень</div>'}
                </div>
                <button onclick="Modal.close()" class="mt-6 w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-white transition-colors">Закрити</button>
            </div>
        `);
    }
};

// Глобальні функції для onclick в HTML
window.filterClients = () => {
    const term = document.getElementById('clientSearch').value.toLowerCase();
    
    // Фільтр для десктопу (таблиця)
    const rows = document.querySelectorAll('.client-row');
    if (rows.length > 0) {
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    // Фільтр для мобільного (картки)
    const cards = document.querySelectorAll('.client-card');
    if (cards.length > 0) {
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            card.style.display = text.includes(term) ? '' : 'none';
        });
    }
};

window.showClientHistory = (id) => ClientModule.showHistory(id);

export default ClientModule;
