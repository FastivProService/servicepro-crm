import Database from './database.js';
import ClientModule from './clients.js';
import InventoryModule from './inventory.js';
import ActivityLog from './activityLog.js';
import Auth from './auth.js';
import AutomationModule from './automation.js';
import { ensureTemplates } from './printEditor.js';
import DocumentEditorModule from './documentEditor.js';
import { Modal } from './ui.js';

const getClientPhones = (c) => (c?.phones && c.phones.length) ? c.phones : (c?.phone ? [c.phone] : []);
const DEFAULT_DEVICE_CATALOG = {
    types: ['Ноутбук', 'Телефон', 'ПК', 'Принтер', 'Планшет'],
    brands: ['Apple', 'Samsung', 'Xiaomi', 'HP', 'Lenovo', 'ASUS'],
    models: [],
    conditions: ['Відмінний', 'Добрий', 'З потертостями', 'Тріщини/пошкодження']
};

const normalizeText = (v) => (v || '').trim();
const escapeHtml = (v) => String(v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const OrderModule = {
    currentOrder: null,
    listFilterSearch: '',
    listFilterStatus: 'all',
    selectedOrderIds: [],

    getIssueTemplates() {
        const fromDb = Database.data?.issueTemplates;
        if (Array.isArray(fromDb) && fromDb.length) return fromDb;
        return [
            'Не вмикається',
            'Розбитий дисплей',
            'Швидко розряджається',
            'Потрапляння вологи',
            'Не заряджається',
            'Перегрів / шумить'
        ];
    },

    getFilteredOrders() {
        const all = (Database.query('orders') || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const q = String(this.listFilterSearch || '').trim().toLowerCase();
        return all.filter(o => {
            if (this.listFilterStatus !== 'all' && o.status !== this.listFilterStatus) return false;
            if (!q) return true;
            const c = Database.find('clients', o.clientId);
            const hay = [o.number, o.deviceBrand, o.deviceModel, o.issue, c?.name].join(' ').toLowerCase();
            return hay.includes(q);
        });
    },

    getPriorityMeta(priority) {
        const map = {
            low: { label: 'Низький', cls: 'bg-gray-700 text-gray-300' },
            normal: { label: 'Звичайний', cls: 'bg-blue-500/20 text-blue-400' },
            high: { label: 'Високий', cls: 'bg-orange-500/20 text-orange-400' },
            urgent: { label: 'Терміновий', cls: 'bg-red-500/20 text-red-400' }
        };
        return map[priority] || map.normal;
    },

    getAdminConfig() {
        return Database.data?.adminConfig || {};
    },

    getPricingConfig() {
        const admin = this.getAdminConfig();
        const tariffs = admin.tariffs || {};
        const pricing = admin.pricing || {};
        return {
            urgentMultiplier: Math.max(1, Number(tariffs.urgentMultiplier || 1)),
            taxPercent: Math.max(0, Number(pricing.taxPercent || 0)),
            markupPercent: Math.max(0, Number(pricing.markupPercent || 0))
        };
    },

    roundMoney(v) {
        return Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
    },

    getStatuses() {
        const statuses = Database.data?.orderStatuses;
        return Array.isArray(statuses) && statuses.length ? statuses : [
            { id: 'new', name: 'Новий', colorClass: 'bg-gray-700 text-gray-300', borderClass: 'border-gray-600', isFinal: false, isReady: false },
            { id: 'diagnostic', name: 'Діагностика', colorClass: 'bg-yellow-500/20 text-yellow-400', borderClass: 'border-yellow-500', isFinal: false, isReady: false },
            { id: 'waiting_part', name: 'Очікує запчастину', colorClass: 'bg-orange-500/20 text-orange-400', borderClass: 'border-orange-500', isFinal: false, isReady: false },
            { id: 'in_progress', name: 'В роботі', colorClass: 'bg-blue-500/20 text-blue-400', borderClass: 'border-blue-500', isFinal: false, isReady: false },
            { id: 'ready', name: 'Готовий', colorClass: 'bg-green-500/20 text-green-400', borderClass: 'border-green-500', isFinal: false, isReady: true },
            { id: 'issued', name: 'Видано', colorClass: 'bg-cyan-500/20 text-cyan-400', borderClass: 'border-cyan-500', isFinal: false, isReady: false },
            { id: 'warranty', name: 'Гарантія', colorClass: 'bg-violet-500/20 text-violet-400', borderClass: 'border-violet-500', isFinal: false, isReady: false },
            { id: 'closed', name: 'Закрито', colorClass: 'bg-gray-600 text-gray-400', borderClass: 'border-gray-500', isFinal: true, isReady: false }
        ];
    },

    ensureOrderMeta(order) {
        if (!order) return;
        if (!Array.isArray(order.history)) order.history = [];
        if (!Array.isArray(order.photosBefore)) order.photosBefore = [];
        if (!Array.isArray(order.photosAfter)) order.photosAfter = [];
        if (!Array.isArray(order.checklist)) order.checklist = [];
        if (!Array.isArray(order.completedWorks)) order.completedWorks = [];
        if (!('assignedMasterId' in order)) order.assignedMasterId = null;
        if (!Number.isFinite(Number(order.normHours))) order.normHours = 0;
        if (!Number.isFinite(Number(order.actualHours))) order.actualHours = 0;
    },

    getTechnicians() {
        return (Database.query('users') || []).filter(u => u.role === 'technician');
    },

    getChecklistTemplates() {
        return Array.isArray(Database.data?.checklistTemplates) ? Database.data.checklistTemplates : [];
    },

    saveChecklistTemplates(list) {
        Database.data.checklistTemplates = list;
        Database.save();
    },

    applyChecklistTemplate(orderId, templateId, mode = 'replace') {
        const order = Database.find('orders', orderId);
        if (!order) return false;
        const template = this.getChecklistTemplates().find(t => t.id === templateId);
        if (!template) return false;
        this.ensureOrderMeta(order);

        const items = (template.items || []).map(text => ({ text: String(text || '').trim(), done: false })).filter(i => i.text);
        if (!items.length) return false;

        if (mode === 'append') {
            order.checklist = [...order.checklist, ...items];
            this.addHistory(order, `Додано шаблон чек-листа: ${template.name}`);
        } else {
            order.checklist = items;
            this.addHistory(order, `Застосовано шаблон чек-листа: ${template.name}`);
        }
        Database.save();
        return true;
    },

    saveChecklistTemplateFromOrder(orderId, templateName) {
        const order = Database.find('orders', orderId);
        if (!order) return false;
        this.ensureOrderMeta(order);
        const name = String(templateName || '').trim();
        const items = (order.checklist || []).map(i => String(i?.text || '').trim()).filter(Boolean);
        if (!name || !items.length) return false;

        const list = this.getChecklistTemplates();
        const existing = list.find(t => String(t.name || '').toLowerCase() === name.toLowerCase());
        if (existing) {
            existing.items = items;
            existing.updatedAt = new Date().toISOString();
        } else {
            list.push({
                id: `chk_${Date.now()}`,
                name,
                items,
                createdAt: new Date().toISOString()
            });
        }
        this.saveChecklistTemplates(list);
        this.addHistory(order, `Збережено шаблон чек-листа: ${name}`);
        return true;
    },

    getMasterSalary(order) {
        if (!order?.assignedMasterId) return 0;
        const master = Database.find('users', order.assignedMasterId);
        if (!master) return 0;
        const payType = master.payType || 'percent';
        const payRate = Number(master.payRate || 0);
        const completedWorksTotal = (order.completedWorks || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
        const plannedServicesTotal = (order.services || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
        // Для нарахування майстру беремо фактично виконані роботи,
        // а якщо їх ще не внесено — використовуємо заплановані послуги в замовленні.
        const serviceTotal = completedWorksTotal > 0 ? completedWorksTotal : plannedServicesTotal;
        const partsTotal = (order.parts || []).reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.qty || 0)), 0);
        const payRateServices = Number(master.payRateServices ?? payRate ?? 0);
        const payRateParts = Number(master.payRateParts ?? payRate ?? 0);
        if (payType === 'rate') {
            return Number(order.actualHours || 0) * payRate;
        }
        if (payType === 'piece') {
            return (order.completedWorks || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
        }
        return (serviceTotal * (payRateServices / 100)) + (partsTotal * (payRateParts / 100));
    },

    addHistory(order, text) {
        if (!order) return;
        this.ensureOrderMeta(order);
        order.history.push({ at: new Date().toISOString(), text });
    },

    addChecklistItem(orderId, text) {
        const order = Database.find('orders', orderId);
        if (!order || !text) return;
        this.ensureOrderMeta(order);
        order.checklist.push({ text: String(text).trim(), done: false });
        this.addHistory(order, `Додано пункт чек-листа: ${text}`);
        Database.save();
    },

    toggleChecklist(orderId, idx) {
        const order = Database.find('orders', orderId);
        if (!order || !order.checklist?.[idx]) return;
        order.checklist[idx].done = !order.checklist[idx].done;
        this.addHistory(order, `${order.checklist[idx].done ? 'Виконано' : 'Повернуто'}: ${order.checklist[idx].text}`);
        Database.save();
    },

    removeChecklist(orderId, idx) {
        const order = Database.find('orders', orderId);
        if (!order || !order.checklist?.[idx]) return;
        const item = order.checklist[idx];
        order.checklist.splice(idx, 1);
        this.addHistory(order, `Видалено пункт чек-листа: ${item.text}`);
        Database.save();
    },

    updateExecution(orderId, data) {
        const order = Database.find('orders', orderId);
        if (!order) return;
        this.ensureOrderMeta(order);
        order.assignedMasterId = data.assignedMasterId ? Number(data.assignedMasterId) : null;
        order.normHours = Math.max(0, Number(data.normHours || 0));
        order.actualHours = Math.max(0, Number(data.actualHours || 0));
        this.addHistory(order, 'Оновлено виконавця/норму часу');
        Database.save();
    },

    addCompletedWork(orderId, work) {
        const order = Database.find('orders', orderId);
        if (!order || !work?.text) return;
        this.ensureOrderMeta(order);
        order.completedWorks.push({
            text: String(work.text).trim(),
            amount: Math.max(0, Number(work.amount || 0)),
            hours: Math.max(0, Number(work.hours || 0)),
            at: new Date().toISOString()
        });
        if (Number(work.hours || 0) > 0) {
            order.actualHours = Number(order.actualHours || 0) + Number(work.hours || 0);
        }
        this.addHistory(order, `Додано виконану роботу: ${work.text}`);
        Database.save();
    },

    removeCompletedWork(orderId, idx) {
        const order = Database.find('orders', orderId);
        if (!order || !order.completedWorks?.[idx]) return;
        const removed = order.completedWorks[idx];
        order.completedWorks.splice(idx, 1);
        const removedHours = Math.max(0, Number(removed?.hours || 0));
        if (removedHours > 0) {
            order.actualHours = Math.max(0, Number(order.actualHours || 0) - removedHours);
        }
        this.addHistory(order, `Видалено виконану роботу: ${removed.text}`);
        Database.save();
    },

    addPhoto(orderId, type, url) {
        const order = Database.find('orders', orderId);
        if (!order || !url) return;
        this.ensureOrderMeta(order);
        if (type === 'after') order.photosAfter.push(url);
        else order.photosBefore.push(url);
        this.addHistory(order, `Додано фото (${type === 'after' ? 'після' : 'до'})`);
        Database.save();
    },

    getElapsed(order) {
        const start = new Date(order?.createdAt || Date.now()).getTime();
        const diff = Date.now() - start;
        const minutes = Math.max(0, Math.floor(diff / 60000));
        const h = Math.floor(minutes / 60);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}д ${h % 24}г`;
        if (h > 0) return `${h}г ${minutes % 60}хв`;
        return `${minutes}хв`;
    },

    getStatusById(statusId) {
        return this.getStatuses().find(s => s.id === statusId) || null;
    },

    getDefaultStatusId() {
        return this.getStatuses()[0]?.id || 'new';
    },

    getDeviceCatalog() {
        const src = Database.data?.deviceCatalog || {};
        return {
            types: Array.isArray(src.types) ? src.types : [...DEFAULT_DEVICE_CATALOG.types],
            brands: Array.isArray(src.brands) ? src.brands : [...DEFAULT_DEVICE_CATALOG.brands],
            models: Array.isArray(src.models) ? src.models : [...DEFAULT_DEVICE_CATALOG.models],
            conditions: Array.isArray(src.conditions) ? src.conditions : [...DEFAULT_DEVICE_CATALOG.conditions]
        };
    },

    saveDeviceCatalog(catalog) {
        Database.data.deviceCatalog = catalog;
        Database.save();
    },

    ensureCatalogValue(key, value) {
        const clean = normalizeText(value);
        if (!clean) return;
        const catalog = this.getDeviceCatalog();
        const list = catalog[key] || [];
        if (!list.some(x => String(x).toLowerCase() === clean.toLowerCase())) {
            list.push(clean);
            catalog[key] = list;
            this.saveDeviceCatalog(catalog);
        }
    },

    syncCatalogFromOrderData(data) {
        this.ensureCatalogValue('types', data.deviceType);
        this.ensureCatalogValue('brands', data.deviceBrand);
        this.ensureCatalogValue('models', data.deviceModel);
        this.ensureCatalogValue('conditions', data.deviceAppearance);
    },

    addDeviceType(typeName) {
        const clean = normalizeText(typeName);
        if (!clean) return false;
        const catalog = this.getDeviceCatalog();
        if (catalog.types.some(t => t.toLowerCase() === clean.toLowerCase())) return false;
        catalog.types.push(clean);
        this.saveDeviceCatalog(catalog);
        return true;
    },

    renameDeviceType(oldName, newName) {
        const oldClean = normalizeText(oldName);
        const newClean = normalizeText(newName);
        if (!oldClean || !newClean) return false;
        const catalog = this.getDeviceCatalog();
        const idx = catalog.types.findIndex(t => t.toLowerCase() === oldClean.toLowerCase());
        if (idx === -1) return false;
        if (catalog.types.some((t, i) => i !== idx && t.toLowerCase() === newClean.toLowerCase())) return false;
        catalog.types[idx] = newClean;
        this.saveDeviceCatalog(catalog);
        return true;
    },

    deleteDeviceType(typeName) {
        const clean = normalizeText(typeName);
        if (!clean) return false;
        const catalog = this.getDeviceCatalog();
        const before = catalog.types.length;
        catalog.types = catalog.types.filter(t => t.toLowerCase() !== clean.toLowerCase());
        if (catalog.types.length === before) return false;
        this.saveDeviceCatalog(catalog);
        return true;
    },

    showDeviceTypesManager() {
        const catalog = this.getDeviceCatalog();
        const typesHtml = (catalog.types || []).map(t => `
            <div class="flex items-center justify-between gap-2 p-2 bg-gray-900 rounded-lg border border-gray-700">
                <span>${escapeHtml(t)}</span>
                <div class="flex gap-2">
                    <button type="button" data-type="${escapeHtml(t)}" onclick="window.renameDeviceType(this.dataset.type)" class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded">Змінити</button>
                    <button type="button" data-type="${escapeHtml(t)}" onclick="window.deleteDeviceType(this.dataset.type)" class="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded">Видалити</button>
                </div>
            </div>
        `).join('') || '<div class="text-gray-500 text-sm">Немає типів</div>';

        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Типи пристроїв</h3>
                <div class="space-y-2 mb-4 max-h-64 overflow-y-auto">${typesHtml}</div>
                <div class="flex gap-2">
                    <input id="newDeviceTypeInput" type="text" placeholder="Новий тип" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                    <button type="button" onclick="window.addDeviceType()" class="bg-green-600 hover:bg-green-700 px-3 py-2 rounded-lg">Додати</button>
                </div>
                <button type="button" onclick="window.Modal.close()" class="w-full mt-4 border border-gray-600 rounded-lg py-2 hover:bg-gray-700">Закрити</button>
            </div>
        `);
    },

    generateNumber() {
        const date = new Date();
        const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
        const count = Database.query('orders').length + 1;
        return `R-${dateStr}-${String(count).padStart(3, '0')}`;
    },

    create(data) {
        const phones = data.phones || [data.phone];
        const primary = phones[0] || data.phone;
        const additional = phones.slice(1);
        const client = ClientModule.getOrCreate(primary, data.clientName, additional);
        if (!client) {
            throw new Error('Не вдалося створити клієнта');
        }
        if (client.isBlacklisted) {
            const reason = (client.blacklistReason || '').trim();
            throw new Error(`Клієнт у чорному списку${reason ? `: ${reason}` : ''}`);
        }
        ClientModule.incrementOrders(client.id);

        this.syncCatalogFromOrderData(data);
        
        const order = Database.create('orders', {
            number: this.generateNumber(),
            clientId: client.id,
            deviceType: data.deviceType,
            deviceBrand: data.deviceBrand,
            deviceModel: data.deviceModel,
            deviceAppearance: data.deviceAppearance || '',
            deviceSerial: data.deviceSerial || '',
            devicePassword: data.devicePassword || '',
            issue: data.issue || '',
            status: this.getDefaultStatusId(),
            priority: data.priority || 'normal',
            prepayment: parseFloat(data.prepayment) || 0,
            dueAt: data.dueAt || '',
            createdAt: new Date().toISOString(),
            assignedMasterId: data.assignedMasterId ? Number(data.assignedMasterId) : null,
            normHours: Number(data.normHours || 0),
            actualHours: Number(data.actualHours || 0),
            parts: [],
            services: [],
            history: [],
            photosBefore: [],
            photosAfter: [],
            checklist: [],
            completedWorks: []
        });

        this.addHistory(order, 'Замовлення створено');

        if (order.prepayment > 0) {
            Database.create('transactions', {
                type: 'income',
                amount: order.prepayment,
                category: 'Аванс',
                orderId: order.id,
                clientId: order.clientId,
                date: new Date().toISOString()
            });
        }

        return order;
    },

    calculateSubtotal(order) {
        const partsTotal = order.parts?.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.qty || 0)), 0) || 0;
        const servicesTotal = order.services?.reduce((sum, s) => sum + Number(s.price || 0), 0) || 0;
        return this.roundMoney(partsTotal + servicesTotal);
    },

    calculateTotalDetails(order) {
        const { urgentMultiplier, taxPercent, markupPercent } = this.getPricingConfig();
        const subtotal = this.calculateSubtotal(order);
        const priorityCoeff = order?.priority === 'urgent' ? urgentMultiplier : 1;
        const priorityAdjusted = this.roundMoney(subtotal * priorityCoeff);
        const markupAmount = this.roundMoney(priorityAdjusted * (markupPercent / 100));
        const taxableBase = this.roundMoney(priorityAdjusted + markupAmount);
        const taxAmount = this.roundMoney(taxableBase * (taxPercent / 100));
        const total = this.roundMoney(taxableBase + taxAmount);
        return { subtotal, priorityCoeff, markupPercent, taxPercent, markupAmount, taxAmount, total };
    },

    calculateTotal(order) {
        return this.calculateTotalDetails(order).total;
    },

    getAvailableSerialsForPart(partId) {
        const part = Database.find('inventory', partId);
        if (!part || !Array.isArray(part.serialNumbers)) return [];
        return [...new Set(part.serialNumbers.map(s => String(s || '').trim()).filter(Boolean))];
    },

    addPart(orderId, partId, qty, price, serialNumber = '') {
        const order = Database.find('orders', orderId);
        const part = Database.find('inventory', partId);
        
        if (!order || !part) return false;
        const serial = String(serialNumber || '').trim();
        if (serial) qty = 1;
        const availableQty = (typeof InventoryModule.getAvailableQty === 'function')
            ? InventoryModule.getAvailableQty(part)
            : part.qty;
        if (availableQty < qty) return false;
        if (serial) {
            const available = this.getAvailableSerialsForPart(partId);
            if (!available.some(s => s.toLowerCase() === serial.toLowerCase())) return false;
        }

        order.parts.push({
            partId: part.id,
            name: part.name,
            qty: qty,
            price: price,
            serialNumber: serial
        });

        InventoryModule.reserveForOrder(partId, qty, serial);
        this.addHistory(order, `Додано запчастину: ${part.name} (${qty} шт.)`);
        Database.save();
        return true;
    },

    removePart(orderId, partIndex) {
        const order = Database.find('orders', orderId);
        if (!order || !order.parts[partIndex]) return;

        const part = order.parts[partIndex];
        InventoryModule.releaseReserve(part.partId, part.qty, part.serialNumber || '');
        this.addHistory(order, `Видалено запчастину: ${part.name}`);
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
        this.addHistory(order, `Додано послугу: ${service.name}`);
        Database.save();
        return true;
    },

    removeService(orderId, serviceIndex) {
        const order = Database.find('orders', orderId);
        if (order && order.services) {
            const removed = order.services[serviceIndex];
            if (removed) this.addHistory(order, `Видалено послугу: ${removed.name}`);
            order.services.splice(serviceIndex, 1);
            Database.save();
        }
    },

    changeStatus(orderId, newStatus) {
        const order = Database.find('orders', orderId);
        if (order) {
            if (order.status === newStatus) return;
            if (newStatus === 'closed') {
                const failed = (order.parts || []).some(p => !InventoryModule.commitReserved(p.partId, p.qty, p.serialNumber || ''));
                if (failed) {
                    window.Toast.show('Не вдалося списати всі зарезервовані запчастини', 'error');
                    return;
                }
                this.addHistory(order, 'Списання запчастин виконано при закритті');
            }
            const prev = this.getStatusById(order.status)?.name || order.status;
            order.status = newStatus;
            const st = this.getStatusById(newStatus);
            this.addHistory(order, `Статус змінено: ${prev} → ${st?.name || newStatus}`);

            const client = Database.find('clients', order.clientId);
            const phones = (client?.phones && client.phones.length) ? client.phones : (client?.phone ? [client.phone] : []);
            AutomationModule.notifyOrderStatus(order, {
                prevStatus: prev,
                newStatus: st?.name || newStatus,
                clientName: client?.name || 'Клієнт',
                phones
            });

            if (st?.isReady) window.Toast.show(`Статус оновлено: ${order.number} готове до видачі`, 'success');
            Database.save();
        }
    },

    renderList() {
        const orders = this.getFilteredOrders();
        const isMobile = window.innerWidth < 768;
        const statuses = this.getStatuses();
        
        if (isMobile) {
            return `
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <div class="flex justify-between items-center w-full sm:w-auto">
                        <h2 class="text-xl font-bold">Замовлення</h2>
                        <span id="orderCountLabel" class="text-gray-400 text-sm">${orders.length} шт.</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 w-full">
                        <button onclick="window.openQuickOrderModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors touch-target">
                            <i class="fas fa-bolt"></i> Швидка
                        </button>
                        <button onclick="window.navigateTo('newOrder')" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors touch-target">
                            <i class="fas fa-plus"></i> Нова
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 mb-3">
                    <input id="orderSearch" value="${escapeHtml(this.listFilterSearch)}" oninput="window.setOrderListFilters(this.value, document.getElementById('orderStatusFilter')?.value || 'all')" placeholder="Пошук..." class="col-span-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                    <select id="orderStatusFilter" onchange="window.setOrderListFilters(document.getElementById('orderSearch')?.value || '', this.value)" class="col-span-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                        <option value="all" ${this.listFilterStatus === 'all' ? 'selected' : ''}>Всі статуси</option>
                        ${statuses.map(s => `<option value="${s.id}" ${this.listFilterStatus === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
                <div id="ordersMobileList" class="space-y-3 pb-4">
                    ${orders.map(o => this.renderMobileCard(o)).join('')}
                </div>
            `;
        }
        
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold">Замовлення</h2>
                <div class="flex gap-2">
                    <button onclick="window.openDeliveryCalendar()" class="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2">
                        <i class="fas fa-calendar-day"></i> Календар видачі
                    </button>
                    <button onclick="window.openQuickOrderModal()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2">
                        <i class="fas fa-bolt"></i> Швидка заявка
                    </button>
                    <button onclick="window.navigateTo('newOrder')" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
                        <i class="fas fa-plus"></i> Нове
                    </button>
                </div>
            </div>
            <div class="glass rounded-xl p-3 mb-4 flex gap-3 items-center">
                <input id="orderSearch" value="${escapeHtml(this.listFilterSearch)}" oninput="window.setOrderListFilters(this.value, document.getElementById('orderStatusFilter')?.value || 'all')" placeholder="Пошук: №, клієнт, пристрій, несправність" class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                <select id="orderStatusFilter" onchange="window.setOrderListFilters(document.getElementById('orderSearch')?.value || '', this.value)" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                    <option value="all" ${this.listFilterStatus === 'all' ? 'selected' : ''}>Всі статуси</option>
                    ${statuses.map(s => `<option value="${s.id}" ${this.listFilterStatus === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                </select>
                <button onclick="window.bulkChangeOrdersStatus()" class="bg-amber-600 hover:bg-amber-700 px-3 py-2 rounded-lg text-sm">Масово: статус</button>
                <button onclick="window.printSelectedOrderLabels()" class="bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg text-sm">Друк етикеток</button>
            </div>
            <div class="glass rounded-xl overflow-hidden">
                <table class="w-full">
                    <thead class="bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th class="px-4 py-4"><input type="checkbox" onchange="window.toggleSelectAllOrders(this.checked)"></th>
                            <th class="px-6 py-4 text-left">№</th>
                            <th class="px-6 py-4 text-left">Клієнт</th>
                            <th class="px-6 py-4 text-left">Статус</th>
                            <th class="px-6 py-4 text-right">Сума</th>
                        </tr>
                    </thead>
                    <tbody id="ordersTableBody" class="divide-y divide-gray-800">
                        ${orders.map(o => this.renderRow(o)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderMobileCard(order) {
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        const statusMeta = this.getStatusById(order.status);
        const hoverTitle = `Клієнт: ${client?.name || '—'} | Пристрій: ${order.deviceBrand || ''} ${order.deviceModel || ''} | Несправність: ${order.issue || '—'}`;
        
        return `
            <div class="mobile-card swipe-action" title="${escapeHtml(hoverTitle)}" onclick="window.openOrderDetail(${order.id})">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-mono text-blue-400 font-bold text-sm">${order.number}</div>
                        <div class="font-semibold text-lg">${client?.name || 'Невідомо'}</div>
                    </div>
                    <span class="px-2 py-1 rounded-full text-xs ${statusMeta?.colorClass || 'bg-gray-700 text-gray-300'}">
                        ${statusMeta?.name || order.status}
                    </span>
                </div>
                <div class="text-gray-400 text-sm mb-3">
                    ${order.deviceBrand} ${order.deviceModel}
                </div>
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-1 rounded-full text-[10px] ${this.getPriorityMeta(order.priority).cls}">${this.getPriorityMeta(order.priority).label}</span>
                    <span class="text-xs text-gray-500"><i class="fas fa-stopwatch mr-1"></i>${this.getElapsed(order)}</span>
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
        const statusMeta = this.getStatusById(order.status);
        const checked = this.selectedOrderIds.includes(order.id);
        const hoverTitle = `Клієнт: ${client?.name || '—'} | Пристрій: ${order.deviceBrand || ''} ${order.deviceModel || ''} | Несправність: ${order.issue || '—'}`;

        return `
            <tr class="hover:bg-gray-800/50 transition-colors cursor-pointer" title="${escapeHtml(hoverTitle)}" onclick="window.openOrderDetail(${order.id})">
                <td class="px-4 py-4" onclick="event.stopPropagation()"><input type="checkbox" ${checked ? 'checked' : ''} onchange="window.toggleOrderSelection(${order.id}, this.checked)"></td>
                <td class="px-6 py-4 font-mono text-blue-400 font-semibold">${order.number}</td>
                <td class="px-6 py-4">
                    <div class="font-medium">${client?.name || 'Невідомо'}</div>
                    <div class="text-sm text-gray-400">${order.deviceBrand} ${order.deviceModel}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs ${statusMeta?.colorClass || 'bg-gray-700 text-gray-300'}">${statusMeta?.name || order.status}</span>
                    <span class="ml-2 px-2 py-1 rounded-full text-[10px] ${this.getPriorityMeta(order.priority).cls}">${this.getPriorityMeta(order.priority).label}</span>
                </td>
                <td class="px-6 py-4 text-right font-bold">₴${total}</td>
            </tr>
        `;
    },

    refreshListUI() {
        const orders = this.getFilteredOrders();
        const mobileList = document.getElementById('ordersMobileList');
        if (mobileList) {
            mobileList.innerHTML = orders.map(o => this.renderMobileCard(o)).join('') || '<div class="text-gray-500 text-sm">Немає замовлень</div>';
            const countLabel = document.getElementById('orderCountLabel');
            if (countLabel) countLabel.textContent = `${orders.length} шт.`;
            return;
        }

        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = orders.map(o => this.renderRow(o)).join('') || '<tr><td colspan="5" class="px-6 py-6 text-center text-gray-500">Немає замовлень</td></tr>';
        }
    },

    openDeliveryCalendar() {
        const orders = (Database.query('orders') || []).slice().sort((a, b) => new Date(a.dueAt || a.createdAt) - new Date(b.dueAt || b.createdAt));
        const rows = orders.map(o => {
            const c = Database.find('clients', o.clientId);
            const due = o.dueAt ? new Date(o.dueAt).toLocaleString('uk-UA') : '—';
            const st = this.getStatusById(o.status);
            return `<tr class="border-b border-gray-800 cursor-pointer" onclick="window.openOrderDetail(${o.id})"><td class="py-2">${o.number}</td><td>${due}</td><td>${escapeHtml(c?.name || '—')}</td><td><span class="text-xs px-2 py-1 rounded ${st?.colorClass || 'bg-gray-700'}">${escapeHtml(st?.name || o.status)}</span></td></tr>`;
        }).join('');
        Modal.open(`<div class="p-6"><h3 class="text-xl font-bold mb-4">Календар видачі</h3><div class="max-h-[70vh] overflow-y-auto"><table class="w-full text-sm"><thead><tr class="text-gray-400"><th class="text-left py-2">№</th><th class="text-left">Дедлайн</th><th class="text-left">Клієнт</th><th class="text-left">Статус</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="py-4 text-gray-500">Немає даних</td></tr>'}</tbody></table></div><button class="mt-4 w-full border border-gray-600 rounded-lg py-2" onclick="window.Modal.close()">Закрити</button></div>`);
    },

    setListFilters(search, status) {
        this.listFilterSearch = String(search || '');
        this.listFilterStatus = status || 'all';
    },

    toggleOrderSelection(id, checked) {
        const nId = Number(id);
        if (checked) {
            if (!this.selectedOrderIds.includes(nId)) this.selectedOrderIds.push(nId);
        } else {
            this.selectedOrderIds = this.selectedOrderIds.filter(x => x !== nId);
        }
    },

    toggleSelectAll(checked) {
        const ids = this.getFilteredOrders().map(o => Number(o.id));
        this.selectedOrderIds = checked ? ids : [];
    },

    bulkChangeStatus() {
        if (!this.selectedOrderIds.length) {
            window.Toast.show('Спочатку виберіть замовлення', 'warning');
            return;
        }
        const statuses = this.getStatuses();
        const target = prompt(`Введіть ID статусу: ${statuses.map(s => s.id).join(', ')}`, statuses[0]?.id || 'new');
        if (!target) return;
        this.selectedOrderIds.forEach(id => this.changeStatus(id, target));
        window.Toast.show(`Оновлено: ${this.selectedOrderIds.length}`, 'success');
        import('./router.js').then(m => m.default.navigate('orders'));
    },

    printLabels() {
        if (!this.selectedOrderIds.length) {
            window.Toast.show('Немає вибраних замовлень', 'warning');
            return;
        }
        const orders = (Database.query('orders') || []).filter(o => this.selectedOrderIds.includes(Number(o.id)));
        const labels = orders.map(o => {
            const c = Database.find('clients', o.clientId);
            return `<div style="width:90mm;border:1px dashed #999;padding:6mm;margin:4mm;break-inside:avoid;">
                <div style="font:700 16px Arial">${o.number}</div>
                <div style="font:12px Arial">${escapeHtml(c?.name || '')}</div>
                <div style="font:12px Arial">${escapeHtml(o.deviceBrand || '')} ${escapeHtml(o.deviceModel || '')}</div>
                <img style="margin-top:4px" src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(o.number)}&scale=2&includetext" />
            </div>`;
        }).join('');
        const w = window.open('', '_blank');
        w.document.write(`<html><head><meta charset="utf-8"><title>Етикетки</title></head><body>${labels}</body></html>`);
        w.document.close();
        w.print();
    },

    openQuickOrderModal() {
        const services = Database.query('services') || [];
        const issueTemplates = this.getIssueTemplates();
        Modal.open(`
            <div class="p-6 space-y-3">
                <h3 class="text-xl font-bold">Швидке створення заявки</h3>
                <input id="qClient" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="ПІБ клієнта">
                <input id="qPhone" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Телефон">
                <div class="grid grid-cols-2 gap-2">
                    <input id="qBrand" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Бренд">
                    <input id="qModel" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Модель">
                </div>
                <select id="qIssueTpl" onchange="window.applyIssueTemplate(this.value)" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                    <option value="">Шаблон несправності</option>
                    ${issueTemplates.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
                </select>
                <textarea id="qIssue" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Несправність"></textarea>
                <div class="grid grid-cols-2 gap-2">
                    <select id="qService" onchange="window.applyQuickServicePrice()" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                        <option value="">Послуга (опц.)</option>
                        ${services.map(s => `<option value="${s.id}" data-price="${s.price}">${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                    <input id="qPrice" type="number" min="0" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Ціна">
                </div>
                <input id="qDueAt" type="datetime-local" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Дедлайн">
                <div class="flex gap-2 pt-2">
                    <button onclick="window.createQuickOrder()" class="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-2">Створити</button>
                    <button onclick="window.Modal.close()" class="px-4 border border-gray-600 rounded-lg">Скасувати</button>
                </div>
            </div>
        `);
    },

    createQuickOrderFromModal() {
        const clientName = document.getElementById('qClient')?.value?.trim();
        const phone = document.getElementById('qPhone')?.value?.trim();
        const deviceBrand = document.getElementById('qBrand')?.value?.trim();
        const deviceModel = document.getElementById('qModel')?.value?.trim();
        const issue = document.getElementById('qIssue')?.value?.trim();
        const dueAt = document.getElementById('qDueAt')?.value || '';
        const serviceId = Number(document.getElementById('qService')?.value || 0);
        const quickPrice = Number(document.getElementById('qPrice')?.value || 0);
        if (!clientName || !phone) {
            window.Toast.show('Вкажіть клієнта і телефон', 'warning');
            return;
        }
        const order = this.create({
            clientName,
            phone,
            phones: [phone],
            deviceType: 'Телефон',
            deviceBrand,
            deviceModel,
            issue,
            dueAt,
            priority: 'normal'
        });
        if (serviceId && quickPrice >= 0) {
            this.addService(order.id, serviceId, quickPrice);
        }
        Modal.close();
        window.Toast.show('Швидку заявку створено', 'success');
        import('./router.js').then(m => m.default.navigate('orders'));
    },

    renderForm() {
        const catalog = this.getDeviceCatalog();
        const technicians = this.getTechnicians();
        const typeOptions = (catalog.types || []).map(t => `<option value="${escapeHtml(t)}"></option>`).join('');
        const brandOptions = (catalog.brands || []).map(b => `<option value="${escapeHtml(b)}"></option>`).join('');
        const modelOptions = (catalog.models || []).map(m => `<option value="${escapeHtml(m)}"></option>`).join('');
        const conditionOptions = (catalog.conditions || []).map(c => `<option value="${escapeHtml(c)}"></option>`).join('');

        return `
            <div class="max-w-4xl fade-in">
                <h2 class="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Нове замовлення</h2>
                <form onsubmit="window.submitNewOrder(event)" class="space-y-4 md:space-y-6">
                    <div class="glass p-4 md:p-6 rounded-xl">
                        <h3 class="font-semibold mb-3 md:mb-4 text-blue-400 text-sm md:text-base"><i class="fas fa-user mr-2"></i>Клієнт</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm text-gray-400 mb-2">ПІБ *</label>
                                <input type="text" name="clientName" required
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                            </div>
                            <div>
                                <label class="block text-sm text-gray-400 mb-2">Телефони</label>
                                <div id="orderPhonesList" class="space-y-2">
                                    <div class="flex gap-2 items-center order-phone-row">
                                        <input type="tel" class="order-phone-input flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base" value="+38" placeholder="+380..." onfocus="window.prefillPhonePrefix(this)" onblur="window.handleOrderPhoneBlur(this)">
                                        <button type="button" onclick="window.removeOrderPhoneRow(this)" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
                                    </div>
                                </div>
                                <button type="button" onclick="window.addOrderPhoneRow()" class="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                                    <i class="fas fa-plus"></i> Додати телефон
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="glass p-4 md:p-6 rounded-xl">
                        <h3 class="font-semibold mb-3 md:mb-4 text-green-400 text-sm md:text-base"><i class="fas fa-laptop mr-2"></i>Пристрій</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                            <div class="sm:col-span-2">
                                <input type="text" name="deviceType" list="deviceTypeList" placeholder="Тип пристрою"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                                <datalist id="deviceTypeList">${typeOptions}</datalist>
                            </div>
                            <button type="button" onclick="window.openDeviceTypesManager()" class="bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-3 md:py-2 text-sm font-medium">Керувати типами</button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <input type="text" name="deviceBrand" list="deviceBrandList" placeholder="Бренд"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                                <datalist id="deviceBrandList">${brandOptions}</datalist>
                            </div>
                            <div>
                                <input type="text" name="deviceModel" list="deviceModelList" placeholder="Модель"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                                <datalist id="deviceModelList">${modelOptions}</datalist>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <input type="text" name="deviceAppearance" list="deviceConditionList" placeholder="Зовнішній вигляд"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                                <datalist id="deviceConditionList">${conditionOptions}</datalist>
                            </div>
                            <input type="text" name="deviceSerial" placeholder="S/N або IMEI" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none">
                            <input type="text" name="devicePassword" placeholder="Пароль від пристрою" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none">
                        </div>
                    </div>

                    <div class="glass p-4 md:p-6 rounded-xl">
                        <h3 class="font-semibold mb-3 md:mb-4 text-yellow-400 text-sm md:text-base"><i class="fas fa-file-alt mr-2"></i>Деталі</h3>
                        <textarea name="issue" rows="3" placeholder="Опис несправності..." class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 mb-4 focus:border-blue-500 focus:outline-none"></textarea>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="number" name="prepayment" placeholder="Аванс (грн)" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                            <select name="priority" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base">
                                <option value="low">Низький пріоритет</option>
                                <option value="normal">Звичайний пріоритет</option>
                                <option value="high">Високий</option>
                                <option value="urgent">Терміновий</option>
                            </select>
                        </div>
                        <div class="mt-4">
                            <input type="datetime-local" name="dueAt" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base" title="Дедлайн виконання">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <select name="assignedMasterId" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2">
                                <option value="">Майстер не призначений</option>
                                ${technicians.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
                            </select>
                            <input type="number" name="normHours" placeholder="Норма годин" min="0" step="0.1" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2">
                            <input type="number" name="actualHours" placeholder="Факт годин" min="0" step="0.1" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2">
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors touch-target min-h-[48px]">
                            Створити замовлення
                        </button>
                        <button type="button" onclick="window.navigateTo('orders')" class="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors touch-target min-h-[48px]">
                            Скасувати
                        </button>
                    </div>
                </form>
            </div>
        `;
    },

    openDetail(id) {
        const order = Database.find('orders', id);
        if (!order) return;
        this.ensureOrderMeta(order);
        const statuses = this.getStatuses();
        const statusOptions = statuses.map(s => `<option value="${escapeHtml(s.id)}" ${order.status === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
        const currentStatus = this.getStatusById(order.status);
        const client = Database.find('clients', order.clientId);
        const technicians = this.getTechnicians();
        const servicesCatalog = Database.query('services') || [];
        const messageTemplates = Array.isArray(Database.data?.messageTemplates) ? Database.data.messageTemplates : [];
        const checklistTemplates = this.getChecklistTemplates();
        const assignedMaster = order.assignedMasterId ? Database.find('users', order.assignedMasterId) : null;
        const masterSalary = this.getMasterSalary(order);
        const worksTotal = (order.completedWorks || []).reduce((s, w) => s + Number(w.amount || 0), 0);

        this.currentOrder = order;
        const totalDetails = this.calculateTotalDetails(order);
        const total = totalDetails.total;
        const toPay = total - (order.prepayment || 0);
        const isMobile = window.innerWidth < 768;

        // Модальне вікно (спільне для обох версій, адаптується CSS)
        const content = `
            <div class="${isMobile ? 'p-4 pb-20' : 'p-6'}">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold">Замовлення ${order.number}</h2>
                        <p class="text-gray-400">${new Date(order.createdAt).toLocaleString('uk-UA')}</p>
                    </div>
                    <div class="${isMobile ? 'mt-2' : 'text-right'}">
                        <select onchange="window.updateOrderStatus(${order.id}, this.value)" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">${statusOptions}</select>
                    </div>
                </div>

                <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6">
                    <div class="glass p-4 rounded-lg">
                        <div class="text-sm text-gray-400 mb-1">Клієнт</div>
                        <div class="font-semibold">${client?.name || 'Клієнт не знайдений'}</div>
                        ${getClientPhones(client).length ? getClientPhones(client).map(p => `<a href="tel:${p}" class="text-blue-400 text-sm flex items-center gap-1 mt-1"><i class="fas fa-phone"></i> ${p}</a>`).join('') : ''}
                    </div>
                    <div class="glass p-4 rounded-lg">
                        <div class="text-sm text-gray-400 mb-1">Пристрій</div>
                        <div class="font-semibold">${order.deviceBrand} ${order.deviceModel}</div>
                        <div class="text-sm text-gray-400">S/N: ${order.deviceSerial || '—'}</div>
                        <div class="text-xs text-gray-400 mt-2"><i class="fas fa-stopwatch mr-1"></i>Таймер: ${this.getElapsed(order)}</div>
                        <div class="text-xs text-gray-400 mt-1">Дедлайн: ${order.dueAt ? new Date(order.dueAt).toLocaleString('uk-UA') : 'не задано'}</div>
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <div class="text-sm text-gray-400 mb-2">QR / Штрихкод замовлення</div>
                    <div class="flex flex-wrap items-center gap-4">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(order.number)}" alt="QR ${order.number}" class="rounded border border-gray-700 bg-white p-1">
                        <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(order.number)}&scale=2&includetext" alt="Barcode ${order.number}" class="bg-white rounded p-1 border border-gray-700">
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <div class="text-sm text-gray-400 mb-1">Опис несправності</div>
                    <div>${order.issue}</div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <h3 class="font-semibold text-emerald-400 mb-3"><i class="fas fa-user-cog mr-2"></i>Виконання / Майстер</h3>
                    <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3 mb-3">
                        <select id="orderMasterId" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                            <option value="">Майстер не призначений</option>
                            ${technicians.map(t => `<option value="${t.id}" ${order.assignedMasterId == t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
                        </select>
                        <input id="orderNormHours" type="number" step="0.1" min="0" value="${Number(order.normHours || 0)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Норма, год">
                        <input id="orderActualHours" type="number" step="0.1" min="0" value="${Number(order.actualHours || 0)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Факт, год">
                    </div>
                    <div class="flex gap-3 mb-3">
                        <button onclick="window.saveOrderExecution(${order.id})" class="bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded text-sm">Зберегти</button>
                        <button onclick="window.addOrderWorkFromForm(${order.id})" class="bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded text-sm">Додати виконану роботу</button>
                    </div>
                    <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-4'} gap-2 mb-3">
                        <select id="orderWorkService" onchange="window.onOrderWorkServiceChange()" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                            <option value="">Послуга (необов'язково)</option>
                            ${servicesCatalog.map(s => `<option value="${s.id}" data-name="${escapeHtml(s.name)}" data-price="${Number(s.price || 0)}">${escapeHtml(s.name)} (₴${Number(s.price || 0)})</option>`).join('')}
                        </select>
                        <input id="orderWorkText" type="text" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Назва роботи">
                        <input id="orderWorkAmount" type="number" step="0.01" min="0" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Сума, грн">
                        <input id="orderWorkHours" type="number" step="0.1" min="0" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Години">
                    </div>
                    <div class="text-xs text-gray-400 mb-2">Майстер: <span class="text-white">${assignedMaster?.name || '—'}</span> | Зарплата: <span class="text-lime-400">₴${masterSalary.toFixed(2)}</span> | Виконані роботи: ₴${worksTotal.toFixed(2)}</div>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${(order.completedWorks || []).map((w, i) => `
                            <div class="flex justify-between items-center bg-gray-900 border border-gray-700 rounded p-2">
                                <div>
                                    <div class="text-sm">${escapeHtml(w.text)}</div>
                                    <div class="text-xs text-gray-500">${new Date(w.at || Date.now()).toLocaleString('uk-UA')} | ${Number(w.hours || 0)} год</div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-sm text-green-400">₴${Number(w.amount || 0).toFixed(2)}</span>
                                    <button onclick="window.removeOrderWork(${order.id}, ${i})" class="text-red-400 hover:text-red-300"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `).join('') || '<div class="text-gray-500 text-sm">Немає зафіксованих робіт</div>'}
                    </div>
                </div>

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
                                    ${p.serialNumber ? `<div class="text-xs text-cyan-400">S/N: ${escapeHtml(p.serialNumber)}</div>` : ''}
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
                </div>

                <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6">
                    <div class="glass p-4 rounded-lg">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-amber-400"><i class="fas fa-camera mr-2"></i>Фото до</h3>
                            <button onclick="window.addOrderPhoto('before')" class="text-xs bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded">Додати</button>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            ${order.photosBefore.map(src => `<a href="${escapeHtml(src)}" target="_blank" class="block"><img src="${escapeHtml(src)}" class="w-full h-20 object-cover rounded border border-gray-700"></a>`).join('') || '<div class="text-gray-500 text-sm">Немає фото</div>'}
                        </div>
                    </div>
                    <div class="glass p-4 rounded-lg">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-emerald-400"><i class="fas fa-camera-retro mr-2"></i>Фото після</h3>
                            <button onclick="window.addOrderPhoto('after')" class="text-xs bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded">Додати</button>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            ${order.photosAfter.map(src => `<a href="${escapeHtml(src)}" target="_blank" class="block"><img src="${escapeHtml(src)}" class="w-full h-20 object-cover rounded border border-gray-700"></a>`).join('') || '<div class="text-gray-500 text-sm">Немає фото</div>'}
                        </div>
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-semibold text-lime-400"><i class="fas fa-list-check mr-2"></i>Чек-лист робіт</h3>
                        <div class="flex gap-2">
                            <button onclick="window.addOrderChecklistItem()" class="text-xs bg-lime-600 hover:bg-lime-700 px-2 py-1 rounded">Додати пункт</button>
                            <button onclick="window.saveOrderChecklistAsTemplate(${order.id})" class="text-xs bg-emerald-600 hover:bg-emerald-700 px-2 py-1 rounded">Зберегти як шаблон</button>
                        </div>
                    </div>
                    <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-4'} gap-2 mb-3">
                        <select id="orderChecklistTemplate" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 ${isMobile ? '' : 'col-span-2'}">
                            <option value="">Оберіть шаблон чек-листа</option>
                            ${checklistTemplates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${(t.items || []).length})</option>`).join('')}
                        </select>
                        <button onclick="window.applyOrderChecklistTemplate(${order.id}, 'replace')" class="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">Застосувати</button>
                        <button onclick="window.applyOrderChecklistTemplate(${order.id}, 'append')" class="bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm">Додати до списку</button>
                    </div>
                    <div class="space-y-2">
                        ${order.checklist.map((c, i) => `
                            <div class="flex items-center justify-between bg-gray-900 rounded p-2 border border-gray-700">
                                <label class="flex items-center gap-2">
                                    <input type="checkbox" ${c.done ? 'checked' : ''} onchange="window.toggleOrderChecklistItem(${i})">
                                    <span class="${c.done ? 'line-through text-gray-500' : ''}">${escapeHtml(c.text)}</span>
                                </label>
                                <button onclick="window.removeOrderChecklistItem(${i})" class="text-red-400 hover:text-red-300"><i class="fas fa-trash"></i></button>
                            </div>
                        `).join('') || '<div class="text-gray-500 text-sm">Чек-лист порожній</div>'}
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6">
                    <h3 class="font-semibold text-indigo-400 mb-3"><i class="fas fa-history mr-2"></i>Історія змін</h3>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${order.history.slice().reverse().map(h => `<div class="text-xs bg-gray-900 border border-gray-700 rounded p-2"><span class="text-gray-500">${new Date(h.at).toLocaleString('uk-UA')}</span> — ${escapeHtml(h.text)}</div>`).join('') || '<div class="text-gray-500 text-sm">Історія порожня</div>'}
                    </div>
                </div>

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
                </div>

                <div class="glass p-4 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 mb-6">
                    <div class="flex justify-between items-end">
                        <div>
                            <div class="text-sm text-gray-400">Загальна сума:</div>
                            <div class="text-3xl font-bold">₴${total}</div>
                            <div class="text-xs text-gray-400 mt-1">
                                База: ₴${totalDetails.subtotal}
                                ${totalDetails.priorityCoeff > 1 ? ` · Терміновість x${totalDetails.priorityCoeff}` : ''}
                                ${totalDetails.markupPercent > 0 ? ` · Націнка ${totalDetails.markupPercent}%` : ''}
                                ${totalDetails.taxPercent > 0 ? ` · Податок ${totalDetails.taxPercent}%` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-400">Аванс: <span class="text-green-400 font-semibold">₴${order.prepayment || 0}</span></div>
                            <div class="text-xl font-semibold mt-1">До сплати: ₴${toPay}</div>
                        </div>
                    </div>
                </div>

                <div class="glass p-4 rounded-lg mb-6 border-l-4 border-cyan-500">
                    <h3 class="font-semibold text-cyan-400 mb-3"><i class="fas fa-paper-plane mr-2"></i>Відправка повідомлення</h3>
                    <div class="grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3 items-center">
                        <select id="orderMessageTemplate" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                            <option value="">Оберіть макет повідомлення</option>
                            ${messageTemplates.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join('')}
                        </select>
                        <button onclick="window.sendOrderTemplateMessage(${order.id})" class="bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg text-white">Надіслати повідомлення</button>
                        <button onclick="window.navigateTo('notifications')" class="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-white">Редагувати макети</button>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button onclick="window.printOrder(${order.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-white transition-colors">
                        <i class="fas fa-print mr-2"></i>Друк
                    </button>
                    ${!currentStatus?.isFinal ? `
                        <button onclick="window.issueOrder(${order.id})" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-white transition-colors">
                            <i class="fas fa-check mr-2"></i>Видано клієнту
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        window.Modal.open(content);
    },

    showAddPartModal() {
        const parts = Database.query('inventory').filter(p => p.qty > 0);
        if (parts.length === 0) {
            window.Toast.show('Немає запчастин на складі!', 'error');
            return;
        }
        
        const options = parts.map(p => {
            const serials = Array.isArray(p.serialNumbers) ? p.serialNumbers.length : 0;
            return `<option value="${p.id}" data-price="${p.price}">${p.name} (в наявн.: ${p.qty}${serials ? `, S/N: ${serials}` : ''})</option>`;
        }).join('');
        
        window.Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Додати запчастину</h3>
                <div class="space-y-4">
                    <select id="addPartId" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2" onchange="document.getElementById('addPartPrice').value = this.options[this.selectedIndex].dataset.price; window.updatePartSerialOptions();">
                        <option value="">Виберіть запчастину</option>
                        ${options}
                    </select>
                    <select id="addPartSerial" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2" onchange="window.updatePartQtyState()">
                        <option value="">Без серійного номера</option>
                    </select>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" id="addPartQty" placeholder="Кількість" value="1" min="1" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                        <input type="number" id="addPartPrice" placeholder="Ціна" class="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    </div>
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="window.confirmAddPartToOrder()" class="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-white">Додати</button>
                    <button onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                </div>
            </div>
        `);
        setTimeout(() => {
            if (window.updatePartSerialOptions) window.updatePartSerialOptions();
        }, 0);
    },

    showAddServiceModal() {
        const services = Database.query('services');
        const options = services.map(s => `<option value="${s.id}" data-price="${s.price}">${s.name} (₴${s.price})</option>`).join('');
        
        window.Modal.open(`
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
                    <button onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">Скасувати</button>
                </div>
            </div>
        `);
    },

    printOrder(id) {
        const order = Database.find('orders', id);
        if (!order) return;
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        const cfg = ensureTemplates(Database.data?.printConfig || {});
        const printTemplates = cfg.templates || [];
        const docTemplates = (DocumentEditorModule.getTemplates() || []).filter(t => t && t.id && t.name);

        const allTemplates = [
            ...printTemplates.map(t => ({ ...t, type: 'print' })),
            ...docTemplates.map(t => ({ ...t, type: 'doc' }))
        ];

        if (allTemplates.length === 0) {
            this.doPrintInternal(order, client, total, null);
            return;
        }

        const defaultVal = (printTemplates.length && cfg.defaultTemplateId) ? cfg.defaultTemplateId : (docTemplates[0]?.id || allTemplates[0]?.id);
        const esc = (s) => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const optionsHtml = allTemplates.map(t => {
            return `<option value="${esc(String(t.id))}" ${t.id === defaultVal ? 'selected' : ''}>${t.type === 'doc' ? '📄 ' : ''}${esc(t.name)}</option>`;
        }).join('');

        Modal.open(`
            <div class="p-6">
                <h3 class="text-xl font-bold mb-4">Друк квітанції</h3>
                <p class="text-gray-400 text-sm mb-4">Оберіть тип квітанції для друку</p>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-500 mb-2">Тип квітанції</label>
                        <select id="printTemplateSelect" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="window.doPrintOrder(${id})" class="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold">
                            <i class="fas fa-print mr-2"></i>Друкувати
                        </button>
                        <button onclick="window.Modal.close()" class="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                    </div>
                </div>
            </div>
        `);
        window._printOrderId = id;
    },

    doPrint(id) {
        const order = Database.find('orders', id);
        if (!order) return;
        const client = Database.find('clients', order.clientId);
        const total = this.calculateTotal(order);
        const templateId = document.getElementById('printTemplateSelect')?.value || null;
        Modal.close();
        this.doPrintInternal(order, client, total, templateId);
    },

    doPrintInternal(order, client, total, templateId) {
        const docTemplate = (templateId && Database.data?.documentTemplates) 
            ? Database.data.documentTemplates.find(t => t.id === templateId) : null;

        if (docTemplate) {
            const html = this.getPrintHtmlFromDocument(order, client, total, docTemplate);
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
            return;
        }

        const cfg = ensureTemplates(Database.data?.printConfig || {});
        const template = templateId ? cfg.templates?.find(t => t.id === templateId) : cfg.templates?.[0];
        const format = cfg.format || 'a4';

        const printWindow = window.open('', '_blank');
        const html = format === '58mm'
            ? this.getPrintHtml58mm(order, client, total, template, cfg)
            : this.getPrintHtmlA4(order, client, total, template, cfg);

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    },

    getPrintHtmlFromDocument(order, client, total, docTemplate) {
        const cfg = Database.data?.printConfig || {};
        const companyName = cfg.companyName || 'ТОВ "ServicePro"';
        const companyAddress = cfg.companyAddress || '';
        const companyPhone = cfg.companyPhone || '';
        const balance = total - (order.prepayment || 0);
        const executor = Auth.currentUser?.name || companyName;

        const partsTableRows = (order.parts || []).map(p => 
            `<tr><td>${p.name}</td><td>${p.price}</td><td>${p.qty}</td><td>${p.qty * p.price}</td></tr>`
        ).join('');
        const servicesTableRows = (order.services || []).map(s => 
            `<tr><td>${s.name}</td><td>${s.price}</td><td>1</td><td>${s.price}</td></tr>`
        ).join('');

        const replacements = {
            '{{company.name}}': companyName,
            '{{company.address}}': companyAddress,
            '{{company.phone}}': companyPhone,
            '{{company.edrpou}}': cfg.companyEdrpou || '',
            '{{order.number}}': order.number || '',
            '{{order.date}}': new Date(order.createdAt || Date.now()).toLocaleDateString('uk-UA'),
            '{{order.device}}': `${order.deviceBrand || ''} ${order.deviceModel || ''}`.trim(),
            '{{order.serial}}': order.deviceSerial || '',
            '{{order.issue}}': order.issue || '',
            '{{client.name}}': client?.name || '',
            '{{client.phone}}': getClientPhones(client).join(', ') || '',
            '{{client.email}}': client?.email || '',
            '{{order.total}}': String(total),
            '{{order.prepayment}}': String(order.prepayment || 0),
            '{{order.balance}}': String(balance),
            '{{order.parts_table}}': partsTableRows,
            '{{order.services_table}}': servicesTableRows,
            '{{executor.name}}': executor,
            '{{executor.role}}': Auth.currentUser?.role || '',
            '{{date.today}}': new Date().toLocaleDateString('uk-UA'),
            '{{time.now}}': new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            '{{company.logo}}': '',
            '{{client.signature}}': '',
            '{{order.qr}}': `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(order.number || '')}`
        };

        let html = docTemplate.html || '';
        for (const [key, val] of Object.entries(replacements)) {
            html = html.split(key).join(val);
        }
        return `<html><head><meta charset="utf-8"><style>body{font-family:Inter,Arial,sans-serif;padding:20px;max-width:210mm;}</style></head><body>${html}</body></html>`;
    },

    getPrintHtmlA4(order, client, total, template, cfg) {
        cfg = cfg || ensureTemplates(Database.data?.printConfig || {});
        template = template || cfg.templates?.[0];
        const companyName = cfg.companyName || 'ТОВ "ServicePro"';
        const companyAddress = cfg.companyAddress || '';
        const companyPhone = cfg.companyPhone || '';
        const execInfo = [companyName, companyAddress, companyPhone].filter(Boolean).join(', ');
        const docTitle = template?.documentTitle || cfg.documentTitle || 'АКТ ВИКОНАНИХ РОБІТ';
        const fields = (template?.fields || []).filter(f => f.enabled !== false);
        const hasField = (id) => fields.some(f => f.id === id);
        const getLabel = (id) => fields.find(f => f.id === id)?.label || id;

        const executorBlock = hasField('executor') ? `<p><strong>${getLabel('executor')}:</strong> ${execInfo || companyName}</p>` : '';
        const clientBlock = hasField('client') ? `<p><strong>${getLabel('client')}:</strong> ${client?.name || '—'}, тел: ${getClientPhones(client).join(', ') || '—'}</p>` : '';
        const deviceBlock = hasField('device') ? `<p><strong>${getLabel('device')}:</strong> ${order.deviceBrand} ${order.deviceModel}</p>` : '';
        const serialBlock = hasField('serial') ? `<p><strong>${getLabel('serial')}:</strong> ${order.deviceSerial || '—'}</p>` : '';
        const issueBlock = hasField('issue') ? `<p><strong>${getLabel('issue')}:</strong> ${order.issue || '—'}</p>` : '';

        const tableBlock = (hasField('parts') || hasField('services')) ? `
            <table>
                <thead><tr><th>№</th><th>Найменування</th><th>К-ть</th><th>Ціна</th><th>Сума</th></tr></thead>
                <tbody>
                    ${(order.parts || []).map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.qty}</td><td>${p.price}</td><td>${p.qty * p.price}</td></tr>`).join('')}
                    ${(order.services || []).map((s, i) => `<tr><td>${(order.parts?.length || 0) + i + 1}</td><td>${s.name}</td><td>1</td><td>${s.price}</td><td>${s.price}</td></tr>`).join('')}
                </tbody>
            </table>` : '';

        let totalBlock = '';
        if (hasField('total')) totalBlock += `Всього: ₴${total}<br>`;
        if (hasField('prepayment') && order.prepayment > 0) totalBlock += `Аванс: ₴${order.prepayment}<br>`;
        if (hasField('balance') && order.prepayment > 0) totalBlock += `До сплати: ₴${total - order.prepayment}`;

        const signaturesBlock = hasField('signatures') ? `<div class="signatures"><div>Виконавець _________________</div><div>Замовник: _________________</div></div>` : '';

        return `
            <html>
            <head>
                <title>Акт ${order.number}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 210mm; }
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
                    <h1>${docTitle}</h1>
                    <h2>№ ${order.number}</h2>
                    <p>від ${new Date().toLocaleDateString('uk-UA')}</p>
                </div>
                <div class="section">${executorBlock}${clientBlock}</div>
                <div class="section">${deviceBlock}${serialBlock}${issueBlock}</div>
                ${tableBlock}
                ${totalBlock ? `<div class="total">${totalBlock}</div>` : ''}
                <div style="margin-top:10px;text-align:right;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(order.number)}" alt="QR"></div>
                ${signaturesBlock}
            </body>
            </html>
        `;
    },

    getPrintHtml58mm(order, client, total, template, cfg) {
        cfg = cfg || ensureTemplates(Database.data?.printConfig || {});
        template = template || cfg.templates?.[0];
        const docTitle = template?.documentTitle || cfg.documentTitle || 'АКТ ВИКОНАНИХ РОБІТ';
        const companyName = cfg.companyName || 'ТОВ "ServicePro"';
        const fields = (template?.fields || []).filter(f => f.enabled !== false);
        const hasField = (id) => fields.some(f => f.id === id);
        const getLabel = (id) => fields.find(f => f.id === id)?.label || id;

        const clientBlock = hasField('client') ? `<div><span class="bold">${getLabel('client')}:</span> ${client?.name || '—'}</div><div>Тел: ${getClientPhones(client).join(', ') || '—'}</div>` : '';
        const deviceLines = [];
        if (hasField('device')) deviceLines.push(`<div><span class="bold">${getLabel('device')}:</span> ${order.deviceBrand} ${order.deviceModel}</div>`);
        if (hasField('issue')) deviceLines.push(`<div>${getLabel('issue')}: ${(order.issue || '').substring(0, 40)}${(order.issue || '').length > 40 ? '...' : ''}</div>`);
        const deviceBlock = deviceLines.length ? deviceLines.join('') : '';

        const tableBlock = (hasField('parts') || hasField('services')) ? `
            <table style="margin-top: 3px;">
                ${(order.parts || []).map((p, i) => `<tr><td>${i + 1}. ${p.name} ${p.qty}×${p.price}</td><td class="r">${p.qty * p.price}</td></tr>`).join('')}
                ${(order.services || []).map((s, i) => `<tr><td>${(order.parts?.length || 0) + i + 1}. ${s.name}</td><td class="r">${s.price}</td></tr>`).join('')}
            </table>` : '';

        let totalBlock = '';
        if (hasField('total')) totalBlock += `Всього: ₴${total}`;
        if (hasField('prepayment') && order.prepayment > 0) totalBlock += `<br>Аванс: ₴${order.prepayment}`;
        if (hasField('balance') && order.prepayment > 0) totalBlock += `<br>До сплати: ₴${total - order.prepayment}`;

        const signaturesBlock = hasField('signatures') ? `<div style="margin-top: 8px; font-size: 8px; text-align: center;">Виконавець ___________  Замовник: ___________</div>` : '';

        return `
            <html>
            <head>
                <title>Акт ${order.number}</title>
                <style>
                    @page { size: 58mm auto; margin: 2mm; }
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Courier New', monospace; font-size: 10px; width: 48mm; max-width: 48mm; padding: 2mm; line-height: 1.2; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .border-b { border-bottom: 1px dashed #000; padding-bottom: 2px; margin-bottom: 2px; }
                    table { width: 100%; font-size: 9px; border-collapse: collapse; }
                    td { padding: 1px 2px; }
                    .r { text-align: right; }
                    .total { margin-top: 3px; font-weight: bold; text-align: right; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="center bold border-b">${docTitle}</div>
                <div class="center bold">№ ${order.number}</div>
                <div class="center" style="font-size: 8px;">${new Date().toLocaleDateString('uk-UA')}</div>
                ${hasField('executor') && companyName ? `<div class="center" style="font-size: 8px; margin-top: 2px;">${companyName}</div>` : ''}
                ${clientBlock ? `<div class="border-b" style="margin-top: 4px;">${clientBlock}</div>` : ''}
                ${deviceBlock ? `<div class="border-b" style="margin-top: 2px;">${deviceBlock}</div>` : ''}
                ${tableBlock}
                ${totalBlock ? `<div class="total border-b" style="padding-top: 3px;">${totalBlock}</div>` : ''}
                <div style="text-align:center;margin-top:3px;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(order.number)}" alt="QR"></div>
                ${signaturesBlock}
            </body>
            </html>
        `;
    }
};

// Глобальні функції для HTML onclick
window.openOrderDetail = (id) => OrderModule.openDetail(id);
window.navigateTo = (route) => {
    import('./router.js').then(module => {
        module.default.navigate(route);
    });
};
window.refreshCurrentPage = () => window.navigateTo(window.currentRoute || 'dashboard');

window.autoFillClient = (input) => {
    const client = ClientModule.searchByPhone(input.value);
    if (client) {
        document.querySelector('[name="clientName"]').value = client.name;
        const phones = getClientPhones(client);
        if (phones.length > 0) {
            const list = document.getElementById('orderPhonesList');
            if (list) {
                list.innerHTML = phones.map((p, i) => `
                    <div class="flex gap-2 items-center order-phone-row">
                        <input type="tel" class="order-phone-input flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base" value="${(p || '').replace(/"/g, '&quot;')}" placeholder="+380..." onfocus="window.prefillPhonePrefix(this)" onblur="window.handleOrderPhoneBlur(this)">
                        <button type="button" onclick="window.removeOrderPhoneRow(this)" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
                    </div>
                `).join('');
            }
        }
    }
};

window.addOrderPhoneRow = () => {
    const list = document.getElementById('orderPhonesList');
    if (!list) return;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center order-phone-row';
    div.innerHTML = `
        <input type="tel" class="order-phone-input flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 md:py-2 focus:border-blue-500 focus:outline-none text-base" value="+38" placeholder="+380..." onfocus="window.prefillPhonePrefix(this)" onblur="window.handleOrderPhoneBlur(this)">
        <button type="button" onclick="window.removeOrderPhoneRow(this)" class="text-red-400 hover:text-red-300 p-2" title="Видалити"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(div);
};
window.removeOrderPhoneRow = (btn) => {
    const rows = document.querySelectorAll('.order-phone-row');
    if (rows.length <= 1) {
        window.Toast.show('Потрібен хоча б один телефон', 'warning');
        return;
    }
    btn.closest('.order-phone-row')?.remove();
};

window.submitNewOrder = (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.phones = [...document.querySelectorAll('.order-phone-input')]
        .map(inp => inp.value.trim())
        .filter(Boolean)
        .filter(v => v !== '+38');
    data.phone = data.phones[0] || data.phone;
    data.prepayment = parseFloat(data.prepayment) || 0;

    if (!String(data.clientName || '').trim()) {
        window.Toast.show('ПІБ є обовʼязковим', 'error');
        return;
    }

    try {
        const created = OrderModule.create(data);
        ActivityLog.add('order_create', { orderId: created?.id, number: created?.number });
        window.Toast.show('Замовлення створено!', 'success');
        window.navigateTo('orders');
    } catch (err) {
        console.error(err);
        window.Toast.show(err?.message || 'Помилка створення замовлення', 'error');
    }
};

window.prefillPhonePrefix = (input) => {
    if (!input) return;
    const val = (input.value || '').trim();
    if (!val) input.value = '+38';
};

window.handleOrderPhoneBlur = (input) => {
    if (!input) return;
    const val = (input.value || '').trim();
    if (val === '+38') {
        input.value = '';
        return;
    }
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 6) {
        window.autoFillClient(input);
    }
};

window.openDeviceTypesManager = () => OrderModule.showDeviceTypesManager();
window.addDeviceType = () => {
    const input = document.getElementById('newDeviceTypeInput');
    const val = input?.value || '';
    if (!OrderModule.addDeviceType(val)) {
        window.Toast.show('Не вдалося додати тип (можливо, вже існує)', 'warning');
        return;
    }
    window.Toast.show('Тип пристрою додано', 'success');
    OrderModule.showDeviceTypesManager();
};
window.renameDeviceType = (oldType) => {
    const next = prompt('Нова назва типу:', oldType || '');
    if (next === null) return;
    if (!OrderModule.renameDeviceType(oldType, next)) {
        window.Toast.show('Не вдалося змінити тип', 'warning');
        return;
    }
    window.Toast.show('Тип пристрою оновлено', 'success');
    OrderModule.showDeviceTypesManager();
};
window.deleteDeviceType = (typeName) => {
    if (!confirm(`Видалити тип "${typeName}"?`)) return;
    if (!OrderModule.deleteDeviceType(typeName)) {
        window.Toast.show('Не вдалося видалити тип', 'warning');
        return;
    }
    window.Toast.show('Тип пристрою видалено', 'info');
    OrderModule.showDeviceTypesManager();
};

window.updateOrderStatus = (id, status) => {
    OrderModule.changeStatus(id, status);
    OrderModule.openDetail(id);
    window.Toast.show('Статус оновлено', 'success');
};

window.showAddPartToOrder = () => OrderModule.showAddPartModal();
window.showAddServiceToOrder = () => OrderModule.showAddServiceModal();

window.updatePartSerialOptions = () => {
    const partId = parseInt(document.getElementById('addPartId')?.value);
    const serialSelect = document.getElementById('addPartSerial');
    if (!serialSelect) return;

    if (!partId) {
        serialSelect.innerHTML = '<option value="">Без серійного номера</option>';
        window.updatePartQtyState();
        return;
    }

    const serials = OrderModule.getAvailableSerialsForPart(partId);
    serialSelect.innerHTML = `
        <option value="">Без серійного номера</option>
        ${serials.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
    `;
    window.updatePartQtyState();
};

window.updatePartQtyState = () => {
    const serial = document.getElementById('addPartSerial')?.value || '';
    const qtyInput = document.getElementById('addPartQty');
    if (!qtyInput) return;
    if (serial) {
        qtyInput.value = '1';
        qtyInput.disabled = true;
    } else {
        qtyInput.disabled = false;
    }
};

window.confirmAddPartToOrder = () => {
    const partId = parseInt(document.getElementById('addPartId').value);
    const qty = parseInt(document.getElementById('addPartQty').value);
    const price = parseFloat(document.getElementById('addPartPrice').value);
    const serialNumber = document.getElementById('addPartSerial')?.value || '';
    
    if (!partId || !qty || !price) {
        window.Toast.show('Заповніть всі поля', 'error');
        return;
    }
    
    if (OrderModule.addPart(OrderModule.currentOrder.id, partId, qty, price, serialNumber)) {
        OrderModule.openDetail(OrderModule.currentOrder.id);
        window.Toast.show('Запчастину додано', 'success');
    } else {
        window.Toast.show('Недостатньо на складі або серійний номер недоступний', 'error');
    }
};

window.confirmAddServiceToOrder = () => {
    const serviceId = parseInt(document.getElementById('addServiceId').value);
    const price = parseFloat(document.getElementById('addServicePrice').value);
    
    if (!serviceId || !price) {
        window.Toast.show('Виберіть послугу та вкажіть ціну', 'error');
        return;
    }
    
    OrderModule.addService(OrderModule.currentOrder.id, serviceId, price);
    OrderModule.openDetail(OrderModule.currentOrder.id);
    window.Toast.show('Послугу додано', 'success');
};

window.removeOrderPart = (orderId, idx) => {
    OrderModule.removePart(orderId, idx);
    OrderModule.openDetail(orderId);
    window.Toast.show('Запчастину видалено', 'info');
};

window.removeOrderService = (orderId, idx) => {
    OrderModule.removeService(orderId, idx);
    OrderModule.openDetail(orderId);
    window.Toast.show('Послугу видалено', 'info');
};

window.addOrderPhoto = (type) => {
    if (!OrderModule.currentOrder) return;
    const url = prompt('Вставте URL фото:');
    if (!url) return;
    OrderModule.addPhoto(OrderModule.currentOrder.id, type, url);
    OrderModule.openDetail(OrderModule.currentOrder.id);
};

window.addOrderChecklistItem = () => {
    if (!OrderModule.currentOrder) return;
    const text = prompt('Новий пункт чек-листа:');
    if (!text) return;
    OrderModule.addChecklistItem(OrderModule.currentOrder.id, text);
    OrderModule.openDetail(OrderModule.currentOrder.id);
};

window.toggleOrderChecklistItem = (idx) => {
    if (!OrderModule.currentOrder) return;
    OrderModule.toggleChecklist(OrderModule.currentOrder.id, idx);
    OrderModule.openDetail(OrderModule.currentOrder.id);
};

window.removeOrderChecklistItem = (idx) => {
    if (!OrderModule.currentOrder) return;
    OrderModule.removeChecklist(OrderModule.currentOrder.id, idx);
    OrderModule.openDetail(OrderModule.currentOrder.id);
};

window.applyOrderChecklistTemplate = (orderId, mode = 'replace') => {
    const templateId = document.getElementById('orderChecklistTemplate')?.value;
    if (!templateId) return window.Toast.show('Оберіть шаблон чек-листа', 'warning');
    if (!OrderModule.applyChecklistTemplate(orderId, templateId, mode)) {
        return window.Toast.show('Не вдалося застосувати шаблон', 'error');
    }
    window.Toast.show(mode === 'append' ? 'Шаблон додано до чек-листа' : 'Шаблон застосовано', 'success');
    OrderModule.openDetail(orderId);
};

window.saveOrderChecklistAsTemplate = (orderId) => {
    const name = prompt('Назва шаблону чек-листа:');
    if (!name) return;
    if (!OrderModule.saveChecklistTemplateFromOrder(orderId, name)) {
        return window.Toast.show('Не вдалося зберегти шаблон (перевірте, чи чек-лист не порожній)', 'warning');
    }
    window.Toast.show('Шаблон чек-листа збережено', 'success');
    OrderModule.openDetail(orderId);
};

window.saveOrderExecution = (orderId) => {
    const assignedMasterId = document.getElementById('orderMasterId')?.value || '';
    const normHours = parseFloat(document.getElementById('orderNormHours')?.value || '0') || 0;
    const actualHours = parseFloat(document.getElementById('orderActualHours')?.value || '0') || 0;
    if (normHours < 0 || actualHours < 0) {
        window.Toast.show('Години не можуть бути відʼємними', 'warning');
        return;
    }
    OrderModule.updateExecution(orderId, { assignedMasterId, normHours, actualHours });
    window.Toast.show('Дані виконання збережено', 'success');
    OrderModule.openDetail(orderId);
};

window.onOrderWorkServiceChange = () => {
    const sel = document.getElementById('orderWorkService');
    const textEl = document.getElementById('orderWorkText');
    const amountEl = document.getElementById('orderWorkAmount');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    if (textEl && !textEl.value.trim()) textEl.value = opt.dataset.name || '';
    if (amountEl && !amountEl.value) amountEl.value = opt.dataset.price || '0';
};

window.addOrderWorkFromForm = (orderId) => {
    const text = document.getElementById('orderWorkText')?.value?.trim() || '';
    const amount = parseFloat(document.getElementById('orderWorkAmount')?.value || '0') || 0;
    const hours = parseFloat(document.getElementById('orderWorkHours')?.value || '0') || 0;
    if (!text) {
        window.Toast.show('Вкажіть назву роботи або оберіть послугу', 'warning');
        return;
    }
    if (amount < 0 || hours < 0) {
        window.Toast.show('Сума і години не можуть бути відʼємними', 'warning');
        return;
    }
    OrderModule.addCompletedWork(orderId, { text, amount, hours });
    window.Toast.show('Роботу додано', 'success');
    OrderModule.openDetail(orderId);
};

window.addOrderWork = (orderId) => {
    const text = prompt('Назва виконаної роботи:');
    if (!text || !String(text).trim()) {
        window.Toast.show('Назва роботи обовʼязкова', 'warning');
        return;
    }
    const amount = parseFloat(prompt('Сума за роботу (грн):', '0') || '0') || 0;
    const hours = parseFloat(prompt('Витрачено годин:', '0') || '0') || 0;
    if (amount < 0 || hours < 0) {
        window.Toast.show('Сума і години не можуть бути відʼємними', 'warning');
        return;
    }
    OrderModule.addCompletedWork(orderId, { text, amount, hours });
    window.Toast.show('Роботу додано', 'success');
    OrderModule.openDetail(orderId);
};

window.removeOrderWork = (orderId, idx) => {
    OrderModule.removeCompletedWork(orderId, idx);
    window.Toast.show('Роботу видалено', 'info');
    OrderModule.openDetail(orderId);
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
            clientId: order.clientId,
            date: new Date().toISOString()
        });
    }
    
    const issuedStatus = OrderModule.getStatuses().find(s => s.id === 'issued')
        || OrderModule.getStatuses().find(s => s.isFinal)
        || OrderModule.getStatuses()[0];
    if (issuedStatus) {
        OrderModule.changeStatus(id, issuedStatus.id);
    }
    order.issuedAt = new Date().toISOString();
    Database.save();
    
    window.Modal.close();
    window.Toast.show('Замовлення видано клієнту', 'success');
    window.navigateTo('orders');
};

window.sendOrderTemplateMessage = (orderId) => {
    const order = Database.find('orders', orderId);
    if (!order) return;
    const templateId = document.getElementById('orderMessageTemplate')?.value;
    if (!templateId) {
        window.Toast.show('Оберіть макет повідомлення', 'warning');
        return;
    }
    const templates = Array.isArray(Database.data?.messageTemplates) ? Database.data.messageTemplates : [];
    const template = templates.find(t => t.id === templateId);
    if (!template) {
        window.Toast.show('Макет не знайдено', 'error');
        return;
    }
    const client = Database.find('clients', order.clientId);
    const total = OrderModule.calculateTotal(order);
    const toPay = total - Number(order.prepayment || 0);
    const phones = (client?.phones && client.phones.length) ? client.phones : (client?.phone ? [client.phone] : []);
    const statusMeta = OrderModule.getStatusById(order.status);

    AutomationModule.sendOrderTemplateMessage(order, template, {
        orderNumber: order.number,
        clientName: client?.name || '',
        device: `${order.deviceBrand || ''} ${order.deviceModel || ''}`.trim(),
        status: statusMeta?.name || order.status,
        toPay,
        phones
    });
    window.Toast.show('Повідомлення відправлено', 'success');
};

window.printOrder = (id) => OrderModule.printOrder(id);
window.doPrintOrder = (id) => OrderModule.doPrint(id);

window.setOrderListFilters = (search, status) => {
    OrderModule.setListFilters(search, status);
    OrderModule.refreshListUI();
};

window.toggleOrderSelection = (id, checked) => {
    OrderModule.toggleOrderSelection(id, checked);
};

window.toggleSelectAllOrders = (checked) => {
    OrderModule.toggleSelectAll(checked);
    import('./router.js').then(m => m.default.navigate('orders'));
};

window.bulkChangeOrdersStatus = () => OrderModule.bulkChangeStatus();
window.printSelectedOrderLabels = () => OrderModule.printLabels();
window.openDeliveryCalendar = () => OrderModule.openDeliveryCalendar();
window.openQuickOrderModal = () => OrderModule.openQuickOrderModal();
window.applyIssueTemplate = (value) => {
    const el = document.getElementById('qIssue');
    if (el && value) el.value = value;
};
window.applyQuickServicePrice = () => {
    const sel = document.getElementById('qService');
    const out = document.getElementById('qPrice');
    if (!sel || !out) return;
    const opt = sel.options[sel.selectedIndex];
    out.value = opt?.dataset?.price || '';
};
window.createQuickOrder = () => OrderModule.createQuickOrderFromModal();

export default OrderModule;
