import Database from './database.js';
import { Modal, Toast } from './ui.js';

const ServiceModule = {
    render() {
        const services = Database.query('services');
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Довідник послуг</h2>
                <button onclick="window.openAddServiceModal()" class="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <i class="fas fa-plus"></i> Додати послугу
                </button>
            </div>
            <div class="glass rounded-xl overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Назва</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Категорія</th>
                            <th class="px-6 py-4 text-left text-sm font-medium text-gray-400">Тривалість</th>
                            <th class="px-6 py-4 text-right text-sm font-medium text-gray-400">Вартість</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${services.map(s => `
                            <tr class="hover:bg-gray-800/50 transition-colors">
                                <td class="px-6 py-4 font-medium">${s.name}</td>
                                <td class="px-6 py-4 text-gray-400">${s.category}</td>
                                <td class="px-6 py-4 text-gray-400">${s.duration}</td>
                                <td class="px-6 py-4 text-right font-bold text-cyan-400">₴${s.price}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    showAddModal() {
        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова послуга</h3>
                <div class="space-y-4">
                    <input type="text" id="svcName" placeholder="Назва послуги" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    <input type="text" id="svcCategory" placeholder="Категорія" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    <input type="text" id="svcDuration" placeholder="Тривалість (напр. 1-2 год)" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    <input type="number" id="svcPrice" placeholder="Вартість" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="window.saveNewService()" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-2 rounded-lg text-white">Зберегти</button>
                    <button onclick="Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                </div>
            </div>
        `);
    },

    save() {
        Database.create('services', {
            name: document.getElementById('svcName').value,
            category: document.getElementById('svcCategory').value,
            duration: document.getElementById('svcDuration').value,
            price: parseFloat(document.getElementById('svcPrice').value) || 0
        });
        Modal.close();
        Toast.show('Послугу додано', 'success');
        window.refreshCurrentPage();
    }
};

window.openAddServiceModal = () => ServiceModule.showAddModal();
window.saveNewService = () => ServiceModule.save();

export default ServiceModule;