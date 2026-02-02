import Database from './database.js';

const ServiceModule = {
    currentCategory: 'all',
    
    render() {
        const services = this.getFilteredServices();
        const categories = this.getCategories();
        const stats = this.getStats();
        const isMobile = window.innerWidth < 768;
        
        return `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 class="text-2xl md:text-3xl font-bold">Довідник послуг</h2>
                <button onclick="window.openAddServiceModal()" class="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-3 md:py-2 rounded-lg flex justify-center items-center gap-2 transition-colors font-semibold">
                    <i class="fas fa-plus"></i> Додати послугу
                </button>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                <div class="glass p-3 md:p-4 rounded-xl border-l-4 border-cyan-500">
                    <div class="text-gray-400 text-xs md:text-sm">Всього послуг</div>
                    <div class="text-xl md:text-2xl font-bold">${stats.total}</div>
                </div>
                <div class="glass p-3 md:p-4 rounded-xl border-l-4 border-purple-500">
                    <div class="text-gray-400 text-xs md:text-sm">Категорій</div>
                    <div class="text-xl md:text-2xl font-bold">${stats.categories}</div>
                </div>
                <div class="glass p-3 md:p-4 rounded-xl border-l-4 border-yellow-500">
                    <div class="text-gray-400 text-xs md:text-sm">Середній чек</div>
                    <div class="text-xl md:text-2xl font-bold">₴${stats.avgPrice}</div>
                </div>
                <div class="glass p-3 md:p-4 rounded-xl border-l-4 border-green-500 hidden md:block">
                    <div class="text-gray-400 text-sm">Діапазон цін</div>
                    <div class="text-2xl font-bold">₴${stats.minPrice} - ₴${stats.maxPrice}</div>
                </div>
            </div>

            <div class="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                <button onclick="window.filterServices('all')" 
                    class="px-4 py-2 rounded-lg whitespace-nowrap ${this.currentCategory === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors">
                    Всі послуги
                </button>
                ${categories.map(cat => `
                    <button onclick="window.filterServices('${cat}')" 
                        class="px-4 py-2 rounded-lg whitespace-nowrap ${this.currentCategory === cat ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} transition-colors">
                        ${cat}
                    </button>
                `).join('')}
            </div>

            <div class="space-y-6 pb-20">
                ${this.currentCategory === 'all' 
                    ? (isMobile ? this.renderMobileList(categories) : this.renderGroupedByCategory(categories))
                    : (isMobile ? this.renderMobileCategory(this.currentCategory, services) : this.renderCategoryList(this.currentCategory, services))}
            </div>
        `;
    },

    getCategories() {
        const services = Database.query('services');
        const categories = [...new Set(services.map(s => s.category))];
        return categories.sort();
    },

    getFilteredServices() {
        if (this.currentCategory === 'all') {
            return Database.query('services');
        }
        return Database.query('services').filter(s => s.category === this.currentCategory);
    },

    getStats() {
        const services = Database.query('services');
        if (services.length === 0) return { total: 0, categories: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 };
        
        const prices = services.map(s => s.price);
        return {
            total: services.length,
            categories: this.getCategories().length,
            avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices)
        };
    },

    // --- DESKTOP VIEWS ---
    renderGroupedByCategory(categories) {
        return categories.map(cat => `
            <div class="glass rounded-xl overflow-hidden">
                <div class="bg-gray-800/50 px-6 py-3 border-b border-gray-700 flex justify-between items-center">
                    <h3 class="font-semibold text-lg text-cyan-400">
                        <i class="fas fa-folder mr-2"></i>${cat}
                    </h3>
                    <span class="text-sm text-gray-400">${Database.query('services').filter(s => s.category === cat).length} послуг</span>
                </div>
                <table class="w-full">
                    <thead class="bg-gray-800/30 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-sm font-medium text-gray-400">Назва послуги</th>
                            <th class="px-6 py-3 text-left text-sm font-medium text-gray-400">Тривалість</th>
                            <th class="px-6 py-3 text-right text-sm font-medium text-gray-400">Вартість</th>
                            <th class="px-6 py-3 text-center text-sm font-medium text-gray-400">Дії</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${this.renderServiceRows(Database.query('services').filter(s => s.category === cat))}
                    </tbody>
                </table>
            </div>
        `).join('');
    },

    renderCategoryList(category, services) {
        return `
            <div class="glass rounded-xl overflow-hidden">
                <div class="bg-gray-800/50 px-6 py-3 border-b border-gray-700">
                    <h3 class="font-semibold text-lg text-cyan-400">
                        <i class="fas fa-folder-open mr-2"></i>${category}
                    </h3>
                </div>
                <table class="w-full">
                    <thead class="bg-gray-800/30 border-b border-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-sm font-medium text-gray-400">Назва послуги</th>
                            <th class="px-6 py-3 text-left text-sm font-medium text-gray-400">Тривалість</th>
                            <th class="px-6 py-3 text-right text-sm font-medium text-gray-400">Вартість</th>
                            <th class="px-6 py-3 text-center text-sm font-medium text-gray-400">Дії</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-800">
                        ${this.renderServiceRows(services)}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderServiceRows(services) {
        if (services.length === 0) {
            return '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Немає послуг у цій категорії</td></tr>';
        }
        return services.map(s => `
            <tr class="hover:bg-gray-800/50 transition-colors">
                <td class="px-6 py-4 font-medium">${s.name}</td>
                <td class="px-6 py-4 text-gray-400">
                    <i class="fas fa-clock mr-1 text-gray-600"></i>${s.duration}
                </td>
                <td class="px-6 py-4 text-right font-bold text-cyan-400 text-lg">₴${s.price}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="window.editService(${s.id})" class="text-blue-400 hover:text-blue-300 mr-3 p-2 hover:bg-blue-500/10 rounded transition-colors" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteService(${s.id})" class="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded transition-colors" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // --- MOBILE VIEWS ---
    renderMobileList(categories) {
        return categories.map(cat => `
            <div class="mb-4">
                <h3 class="font-bold text-lg text-cyan-400 mb-3 px-2 border-l-4 border-cyan-500 flex items-center justify-between">
                    <span>${cat}</span>
                    <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">${Database.query('services').filter(s => s.category === cat).length}</span>
                </h3>
                <div class="space-y-3">
                    ${this.renderMobileServiceCards(Database.query('services').filter(s => s.category === cat))}
                </div>
            </div>
        `).join('');
    },

    renderMobileCategory(category, services) {
        return `
            <div class="space-y-3">
                 ${this.renderMobileServiceCards(services)}
            </div>
        `;
    },

    renderMobileServiceCards(services) {
        if (services.length === 0) return '<div class="text-gray-500 text-center py-4 glass rounded-xl">Немає послуг</div>';
        
        return services.map(s => `
            <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 relative shadow-lg">
                <div class="flex justify-between items-start mb-2">
                    <div class="font-semibold text-white text-lg pr-4">${s.name}</div>
                    <div class="text-cyan-400 font-bold text-xl whitespace-nowrap">₴${s.price}</div>
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-400 mb-4 bg-gray-900/50 p-2 rounded-lg w-fit">
                    <i class="far fa-clock text-gray-500"></i> 
                    <span>${s.duration}</span>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-2">
                    <button onclick="window.editService(${s.id})" class="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-blue-400 flex items-center justify-center gap-2 transition-colors">
                        <i class="fas fa-pencil-alt"></i> Редагувати
                    </button>
                    <button onclick="window.deleteService(${s.id})" class="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-red-400 flex items-center justify-center gap-2 transition-colors">
                        <i class="fas fa-trash-alt"></i> Видалити
                    </button>
                </div>
            </div>
        `).join('');
    },

    // --- ACTIONS ---
    filter(category) {
        this.currentCategory = category;
        this.refresh();
    },

    refresh() {
        import('./router.js').then(m => m.default.navigate('services'));
    },

    showAddModal() {
        const categories = this.getCategories();
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Нова послуга</h3>
                <form onsubmit="window.saveNewService(event)" class="space-y-4">
                    <input type="text" id="svcName" placeholder="Назва послуги" required 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none text-lg">
                    
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Категорія</label>
                        <select id="svcCategory" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none appearance-none">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            <option value="new" class="text-cyan-400 font-bold">+ Створити нову категорію</option>
                        </select>
                    </div>
                    
                    <div id="newCategoryInput" style="display:none">
                        <label class="block text-sm text-gray-400 mb-2 text-cyan-400">Назва нової категорії</label>
                        <input type="text" id="svcNewCategory" placeholder="Введіть назву..." 
                            class="w-full bg-gray-900 border border-cyan-500/50 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                    </div>

                    <script>
                        document.getElementById('svcCategory').addEventListener('change', function(e) {
                            document.getElementById('newCategoryInput').style.display = e.target.value === 'new' ? 'block' : 'none';
                        });
                    <\/script>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Тривалість</label>
                            <input type="text" id="svcDuration" placeholder="напр. 30 хв" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Вартість (₴)</label>
                            <input type="number" id="svcPrice" placeholder="0.00" min="0" step="0.01" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-cyan-500 focus:outline-none text-cyan-400 font-bold">
                        </div>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg text-white font-semibold text-lg">Зберегти</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    save(e) {
        e.preventDefault();
        
        let category = document.getElementById('svcCategory').value;
        if (category === 'new') {
            category = document.getElementById('svcNewCategory').value || 'Без категорії';
        }
        
        Database.create('services', {
            name: document.getElementById('svcName').value,
            category: category,
            duration: document.getElementById('svcDuration').value,
            price: parseFloat(document.getElementById('svcPrice').value) || 0
        });
        
        window.Modal.close();
        window.Toast.show('Послугу додано', 'success');
        this.currentCategory = category;
        this.refresh();
    },

    edit(id) {
        const service = Database.find('services', id);
        if (!service) return;
        
        const categories = this.getCategories().filter(c => c !== service.category);

        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Редагувати послугу</h3>
                <form onsubmit="window.saveEditedService(event, ${id})" class="space-y-4">
                    <input type="text" id="editSvcName" value="${service.name}" required 
                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                    
                    <div>
                         <label class="block text-sm text-gray-400 mb-2">Категорія</label>
                        <select id="editSvcCategory" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                            <option value="${service.category}" selected>${service.category} (поточна)</option>
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                            <option value="new">+ Нова категорія</option>
                        </select>
                    </div>

                    <div id="editNewCategoryInput" style="display:none">
                        <label class="block text-sm text-gray-400 mb-2">Нова категорія</label>
                        <input type="text" id="editSvcNewCategory" placeholder="Назва нової категорії" 
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                    </div>
                    
                    <script>
                        document.getElementById('editSvcCategory').addEventListener('change', function(e) {
                            document.getElementById('editNewCategoryInput').style.display = e.target.value === 'new' ? 'block' : 'none';
                        });
                    <\/script>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Тривалість</label>
                            <input type="text" id="editSvcDuration" value="${service.duration}" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Вартість (₴)</label>
                            <input type="number" id="editSvcPrice" value="${service.price}" min="0" step="0.01" required 
                                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none text-cyan-400 font-bold">
                        </div>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-white font-semibold">Зберегти зміни</button>
                        <button type="button" onclick="window.Modal.close()" class="px-4 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                    </div>
                </form>
            </div>
        `);
    },

    saveEdit(e, id) {
        e.preventDefault();
        
        let category = document.getElementById('editSvcCategory').value;
        if (category === 'new') {
            category = document.getElementById('editSvcNewCategory').value || 'Без категорії';
        }
        
        Database.update('services', id, {
            name: document.getElementById('editSvcName').value,
            category: category,
            duration: document.getElementById('editSvcDuration').value,
            price: parseFloat(document.getElementById('editSvcPrice').value) || 0
        });
        
        window.Modal.close();
        window.Toast.show('Послугу оновлено', 'success');
        this.refresh();
    },

    remove(id) {
        if (!confirm('Видалити цю послугу?')) return;
        Database.delete('services', id);
        window.Toast.show('Послугу видалено', 'info');
        this.refresh();
    }
};

// Глобальні функції
window.openAddServiceModal = () => ServiceModule.showAddModal();
window.saveNewService = (e) => ServiceModule.save(e);
window.editService = (id) => ServiceModule.edit(id);
window.saveEditedService = (e, id) => ServiceModule.saveEdit(e, id);
window.deleteService = (id) => ServiceModule.remove(id);
window.filterServices = (cat) => ServiceModule.filter(cat);

export default ServiceModule;
