import Database from './database.js';
import { Modal } from './ui.js';

const normalizePhone = (p) => (p || '').replace(/\s/g, '').replace(/^\+/, '');
const getPhones = (c) => (c?.phones && Array.isArray(c.phones) ? c.phones : (c?.phone ? [c.phone] : []));

const ClientModule = {
    searchByPhone(phone) {
        const norm = normalizePhone(phone);
        if (!norm) return null;
        return Database.query('clients').find(c => getPhones(c).some(p => normalizePhone(p) === norm));
    },

    getOrCreate(primaryPhone, name, additionalPhones = []) {
        const allPhones = [primaryPhone, ...additionalPhones].map(p => (p || '').trim()).filter(Boolean);
        const uniquePhones = [...new Set(allPhones)];
        if (uniquePhones.length === 0) return null;

        let client = this.searchByPhone(primaryPhone);
        if (!client) {
            client = Database.create('clients', { name, phones: uniquePhones, email: '', orders: 0 });
        } else {
            const existing = getPhones(client);
            const merged = [...new Set([...existing, ...uniquePhones])];
            if (merged.length !== existing.length) {
                client.phones = merged;
                Database.save();
            }
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
                                <td class="px-6 py-4 text-gray-400 client-phone">${getPhones(c).join(', ')}</td>
                                <td class="px-6 py-4">
                                    <span class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">${c.orders}</span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <div class="flex gap-2 justify-end">
                                        <button onclick="window.editClient(${c.id})" class="text-cyan-400 hover:text-cyan-300 p-2" title="Редагувати">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button onclick="window.showClientHistory(${c.id})" class="text-blue-400 hover:text-blue-300 p-2" title="Історія">
                                            <i class="fas fa-history"></i>
                                        </button>
                                    </div>
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
                        <div class="text-blue-400 text-sm flex flex-col gap-1 mt-1 client-phone">
                            ${getPhones(client).map(p => `<a href="tel:${p}" class="flex items-center gap-2"><i class="fas fa-phone-alt"></i> ${p}</a>`).join('')}
                        </div>
                    </div>
                    <span class="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        ${client.orders} зам.
                    </span>
                </div>
                <div class="flex gap-2 border-t border-gray-700 pt-3">
                    <button onclick="window.editClient(${client.id})" class="flex-1 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                        <i class="fas fa-edit"></i> Редагувати
                    </button>
                    <button onclick="window.showClientHistory(${client.id})" class="flex-1 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
                        <i class="fas fa-history text-blue-400"></i> Історія
                    </button>
                </div>
            </div>
        `;
    },

    showEditModal(clientId) {
        const client = Database.find('clients', clientId);
        if (!client) {
            window.Toast?.show('Клієнт не знайдений', 'error');
            return;
        }
        const phones = getPhones(client);
        const phonesHtml = phones.length > 0 
            ? phones.map((p, i) => `
                <div class="flex gap-2 items-center phone-row">
                    <input type="tel" class="edit-client-phone flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none" value="${(p || '').replace(/"/g, '&quot;')}" placeholder="+380...">
                    <button type="button" onclick="this.closest('.phone-row').remove()" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
                </div>
            `).join('')
            : '';
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати клієнта</h3>
                <form onsubmit="window.saveEditedClient(event, ${client.id})" class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">ПІБ *</label>
                        <input type="text" id="editClientName" required value="${(client.name || '').replace(/"/g, '&quot;')}"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Телефони *</label>
                        <div id="editClientPhonesList" class="space-y-2">
                            ${phonesHtml || `
                            <div class="flex gap-2 items-center phone-row">
                                <input type="tel" class="edit-client-phone flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none" placeholder="+380...">
                                <button type="button" onclick="this.closest('.phone-row').remove()" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
                            </div>`}
                        </div>
                        <button type="button" onclick="window.addClientPhoneRow()" class="mt-2 text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
                            <i class="fas fa-plus"></i> Додати телефон
                        </button>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email</label>
                        <input type="email" id="editClientEmail" value="${(client.email || '').replace(/"/g, '&quot;')}"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none" placeholder="email@example.com">
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg text-white font-semibold">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveEdit(clientId, data) {
        const phones = data.phones.filter(p => (p || '').trim());
        if (phones.length === 0) {
            window.Toast?.show('Додайте хоча б один телефон', 'error');
            return false;
        }
        const clients = Database.query('clients');
        for (const p of phones) {
            const existing = clients.find(c => c.id !== clientId && getPhones(c).some(cp => normalizePhone(cp) === normalizePhone(p)));
            if (existing) {
                window.Toast?.show(`Телефон ${p} вже належить іншому клієнту`, 'error');
                return false;
            }
        }
        Database.update('clients', clientId, {
            name: data.name,
            phones: phones,
            email: data.email || ''
        });
        return true;
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
                <div class="space-y-1 mb-6">
                    ${getPhones(client).map(p => `<a href="tel:${p}" class="text-blue-400 block"><i class="fas fa-phone mr-2"></i>${p}</a>`).join('')}
                </div>
                
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
                <button onclick="window.Modal.close()" class="mt-6 w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-white transition-colors">Закрити</button>
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

window.editClient = (id) => ClientModule.showEditModal(id);
window.showClientHistory = (id) => ClientModule.showHistory(id);
window.addClientPhoneRow = () => {
    const list = document.getElementById('editClientPhonesList');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center phone-row';
    div.innerHTML = `
        <input type="tel" class="edit-client-phone flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-cyan-500 focus:outline-none" placeholder="+380...">
        <button type="button" onclick="this.closest('.phone-row').remove()" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(div);
};
window.saveEditedClient = (e, id) => {
    e.preventDefault();
    const phones = [...document.querySelectorAll('.edit-client-phone')].map(inp => (inp.value || '').trim()).filter(Boolean);
    const data = {
        name: document.getElementById('editClientName').value.trim(),
        phones,
        email: (document.getElementById('editClientEmail').value || '').trim()
    };
    if (ClientModule.saveEdit(id, data)) {
        window.Modal.close();
        window.Toast.show('Клієнта оновлено', 'success');
        import('./router.js').then(m => m.default.navigate('clients'));
    }
};

export default ClientModule;
