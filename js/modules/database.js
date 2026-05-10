// Модуль роботи з локальною базою даних
const getOrCreateDeviceId = () => {
    const key = 'servicePro_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(key, id);
    }
    return id;
};

const Database = {
    data: {
        clients: [],
        orders: [],
        inventory: [],
        services: [],
        transactions: [],
        user: null,
        users: [],
        roleConfig: null,
        printConfig: null,
        documentTemplates: null,
        deviceCatalog: null,
        orderStatuses: null,
        inventorySuppliers: null,
        userActionLogs: null,
        automationConfig: null,
        backups: null,
        integrationLogs: null,
        salaryOperations: null,
        messageTemplates: null,
        checklistTemplates: null,
        paymentMethods: null,
        financeConfig: null,
        adminConfig: null,
        _sync: null
    },

    init() {
        const saved = localStorage.getItem('servicePro_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            const clients = (parsed.clients ?? []).map(c => {
                if (!c.phones && c.phone) c.phones = [c.phone];
                if (!c.phones) c.phones = [];
                return c;
            });
            this.data = {
                clients,
                orders: parsed.orders ?? [],
                inventory: parsed.inventory ?? [],
                services: parsed.services ?? [],
                transactions: parsed.transactions ?? [],
                user: parsed.user ?? null,
                users: parsed.users ?? [],
                roleConfig: parsed.roleConfig ?? null,
                printConfig: parsed.printConfig ?? null,
                documentTemplates: (parsed.documentTemplates && Array.isArray(parsed.documentTemplates) && parsed.documentTemplates.length > 0) 
                    ? parsed.documentTemplates : null,
                deviceCatalog: parsed.deviceCatalog ?? {
                    types: ['Ноутбук', 'Телефон', 'ПК', 'Принтер', 'Планшет'],
                    brands: [],
                    models: [],
                    conditions: ['Відмінний', 'Добрий', 'З потертостями', 'Тріщини/пошкодження']
                },
                orderStatuses: parsed.orderStatuses ?? [
                    { id: 'new', name: 'Новий', colorClass: 'bg-gray-700 text-gray-300', borderClass: 'border-gray-600', isFinal: false, isReady: false },
                    { id: 'diagnostic', name: 'Діагностика', colorClass: 'bg-yellow-500/20 text-yellow-400', borderClass: 'border-yellow-500', isFinal: false, isReady: false },
                    { id: 'waiting_part', name: 'Очікує запчастину', colorClass: 'bg-orange-500/20 text-orange-400', borderClass: 'border-orange-500', isFinal: false, isReady: false },
                    { id: 'in_progress', name: 'В роботі', colorClass: 'bg-blue-500/20 text-blue-400', borderClass: 'border-blue-500', isFinal: false, isReady: false },
                    { id: 'ready', name: 'Готовий', colorClass: 'bg-green-500/20 text-green-400', borderClass: 'border-green-500', isFinal: false, isReady: true },
                    { id: 'issued', name: 'Видано', colorClass: 'bg-cyan-500/20 text-cyan-400', borderClass: 'border-cyan-500', isFinal: false, isReady: false },
                    { id: 'warranty', name: 'Гарантія', colorClass: 'bg-violet-500/20 text-violet-400', borderClass: 'border-violet-500', isFinal: false, isReady: false },
                    { id: 'closed', name: 'Закрито', colorClass: 'bg-gray-600 text-gray-400', borderClass: 'border-gray-500', isFinal: true, isReady: false }
                ],
                inventorySuppliers: Array.isArray(parsed.inventorySuppliers) ? parsed.inventorySuppliers : [],
                userActionLogs: Array.isArray(parsed.userActionLogs) ? parsed.userActionLogs : [],
                automationConfig: parsed.automationConfig ?? {
                    autoAssignMaster: true,
                    clientReminders: true,
                    statusSmsEnabled: true,
                    statusTelegramEnabled: true,
                    autoCloseOverdue: false,
                    autoCloseDays: 14,
                    telegramWebhook: '',
                    telegramBotToken: '',
                    telegramChatId: '',
                    remoteSyncEnabled: false,
                    remoteSyncUrl: '',
                    remoteSyncApiKey: '',
                    remoteSyncIntervalSec: 30,
                    apiEnabled: true,
                    backupEnabled: true,
                    backupIntervalMin: 60
                },
                backups: Array.isArray(parsed.backups) ? parsed.backups : [],
                integrationLogs: Array.isArray(parsed.integrationLogs) ? parsed.integrationLogs : [],
                salaryOperations: Array.isArray(parsed.salaryOperations) ? parsed.salaryOperations : [],
                messageTemplates: Array.isArray(parsed.messageTemplates) && parsed.messageTemplates.length ? parsed.messageTemplates : [
                    {
                        id: 'status_ready',
                        name: 'Готово до видачі',
                        text: 'Вітаємо, {{clientName}}! Ваше замовлення {{orderNumber}} ({{device}}) готове до видачі. Сума до сплати: {{toPay}} грн.'
                    },
                    {
                        id: 'status_progress',
                        name: 'В роботі',
                        text: 'Доброго дня, {{clientName}}. Замовлення {{orderNumber}} вже в роботі. Статус: {{status}}.'
                    }
                ],
                checklistTemplates: Array.isArray(parsed.checklistTemplates) ? parsed.checklistTemplates : [],
                paymentMethods: Array.isArray(parsed.paymentMethods) && parsed.paymentMethods.length ? parsed.paymentMethods : ['cash', 'card', 'transfer'],
                financeConfig: parsed.financeConfig ?? { rroEnabled: false, rroProvider: 'none' },
                _sync: parsed._sync ?? {
                    deviceId: getOrCreateDeviceId(),
                    updatedAt: new Date().toISOString()
                },
                adminConfig: parsed.adminConfig ?? {
                    tariffs: {
                        diagnosticFee: 300,
                        urgentMultiplier: 1.2,
                        warrantyDays: 30
                    },
                    pricing: {
                        taxPercent: 0,
                        markupPercent: 0
                    },
                    branding: {
                        companyName: 'ServicePro',
                        companyTagline: 'CRM для сервісного центру',
                        logoText: 'SP',
                        accentColor: '#2563eb'
                    },
                    audit: {
                        enabled: true,
                        retentionDays: 365
                    }
                }
            };

            // Міграція сумісності: уніфікуємо id як числа,
            // щоб inline onclick та parseInt-логіка працювали коректно.
            const migratedIds = this.migrateIdsToNumeric();
            const migratedClients = this.migrateClientFields();
            const migratedInventory = this.migrateInventoryFields();
            const migratedOrders = this.migrateOrderFields();
            if (migratedIds || migratedClients || migratedInventory || migratedOrders) {
                this.save();
            }
        } else {
            this.seedData();
        }
    },

    migrateClientFields() {
        let changed = false;
        (this.data.clients || []).forEach((client) => {
            if (typeof client.notes !== 'string') {
                client.notes = '';
                changed = true;
            }
            if (typeof client.isBlacklisted !== 'boolean') {
                client.isBlacklisted = false;
                changed = true;
            }
            if (typeof client.blacklistReason !== 'string') {
                client.blacklistReason = '';
                changed = true;
            }
        });
        return changed;
    },

    migrateIdsToNumeric() {
        let changed = false;
        const idMaps = {
            clients: new Map(),
            orders: new Map(),
            inventory: new Map(),
            services: new Map(),
            users: new Map(),
            transactions: new Map()
        };

        const remapTable = (table) => {
            const rows = this.data[table] || [];
            let maxId = rows.reduce((max, r) => {
                const id = Number(r?.id);
                return Number.isInteger(id) ? Math.max(max, id) : max;
            }, 0);

            rows.forEach((row) => {
                const numeric = Number(row?.id);
                if (!Number.isInteger(numeric)) {
                    const oldId = row?.id;
                    maxId += 1;
                    row.id = maxId;
                    idMaps[table].set(oldId, maxId);
                    changed = true;
                } else if (row.id !== numeric) {
                    row.id = numeric;
                    changed = true;
                }
            });
        };

        remapTable('clients');
        remapTable('orders');
        remapTable('inventory');
        remapTable('services');
        remapTable('users');
        remapTable('transactions');

        // Оновлюємо посилання між таблицями
        (this.data.orders || []).forEach((order) => {
            if (idMaps.clients.has(order.clientId)) {
                order.clientId = idMaps.clients.get(order.clientId);
                changed = true;
            }

            (order.parts || []).forEach((p) => {
                if (idMaps.inventory.has(p.partId)) {
                    p.partId = idMaps.inventory.get(p.partId);
                    changed = true;
                }
            });

            (order.services || []).forEach((s) => {
                if (idMaps.services.has(s.serviceId)) {
                    s.serviceId = idMaps.services.get(s.serviceId);
                    changed = true;
                }
            });
        });

        (this.data.transactions || []).forEach((t) => {
            if (idMaps.orders.has(t.orderId)) {
                t.orderId = idMaps.orders.get(t.orderId);
                changed = true;
            }
        });

        return changed;
    },

    migrateInventoryFields() {
        let changed = false;
        const suppliers = new Set(Array.isArray(this.data.inventorySuppliers) ? this.data.inventorySuppliers.filter(Boolean) : []);

        (this.data.inventory || []).forEach((item) => {
            if (!Array.isArray(item.serialNumbers)) {
                item.serialNumbers = [];
                changed = true;
            }
            item.serialNumbers = [...new Set(item.serialNumbers.map(v => String(v || '').trim()).filter(Boolean))];

            if (typeof item.supplier !== 'string') {
                item.supplier = '';
                changed = true;
            }
            if (!Number.isFinite(Number(item.minQty))) {
                item.minQty = 3;
                changed = true;
            }
            if (!Number.isFinite(Number(item.reservedQty))) {
                item.reservedQty = 0;
                changed = true;
            }
            if (!Array.isArray(item.reservedSerialNumbers)) {
                item.reservedSerialNumbers = [];
                changed = true;
            }
            if (item.supplier.trim()) suppliers.add(item.supplier.trim());

            if (item.serialNumbers.length > item.qty) {
                item.qty = item.serialNumbers.length;
                changed = true;
            }
        });

        this.data.inventorySuppliers = [...suppliers];
        return changed;
    },

    migrateOrderFields() {
        let changed = false;
        const statusMap = {
            in_repair: 'in_progress',
            cancelled: 'closed'
        };
        (this.data.orders || []).forEach((order) => {
            if (statusMap[order.status]) {
                order.status = statusMap[order.status];
                changed = true;
            }
            if (!Array.isArray(order.history)) {
                order.history = [];
                changed = true;
            }
            if (!Array.isArray(order.photosBefore)) {
                order.photosBefore = [];
                changed = true;
            }
            if (!Array.isArray(order.photosAfter)) {
                order.photosAfter = [];
                changed = true;
            }
            if (!Array.isArray(order.checklist)) {
                order.checklist = [];
                changed = true;
            }
            if (!('assignedMasterId' in order)) {
                order.assignedMasterId = null;
                changed = true;
            }
            if (!Number.isFinite(Number(order.normHours))) {
                order.normHours = 0;
                changed = true;
            }
            if (!Number.isFinite(Number(order.actualHours))) {
                order.actualHours = 0;
                changed = true;
            }
            if (!Array.isArray(order.completedWorks)) {
                order.completedWorks = [];
                changed = true;
            }
        });

        (this.data.users || []).forEach((u) => {
            if (!u.payType) {
                u.payType = 'percent';
                changed = true;
            }
            if (!Number.isFinite(Number(u.payRate))) {
                u.payRate = (u.role === 'technician') ? 20 : 0;
                changed = true;
            }
            if (!Number.isFinite(Number(u.payRateServices))) {
                u.payRateServices = Number(u.payRate || (u.role === 'technician' ? 20 : 0));
                changed = true;
            }
            if (!Number.isFinite(Number(u.payRateParts))) {
                u.payRateParts = Number(u.payRate || (u.role === 'technician' ? 20 : 0));
                changed = true;
            }
        });
        return changed;
    },

    getNextId(table) {
        const rows = this.data[table] || [];
        const maxId = rows.reduce((max, r) => {
            const id = Number(r?.id);
            return Number.isInteger(id) ? Math.max(max, id) : max;
        }, 0);
        return maxId + 1;
    },

    save(touchSync = true) {
        if (!this.data._sync || !this.data._sync.deviceId) {
            this.data._sync = {
                deviceId: getOrCreateDeviceId(),
                updatedAt: new Date().toISOString()
            };
        }
        if (touchSync) {
            this.data._sync.updatedAt = new Date().toISOString();
        }
        localStorage.setItem('servicePro_v2', JSON.stringify(this.data));
    },

    seedData() {
        this.data.clients = [
            { id: 1, name: "Петренко О.В.", phones: ["+380671234567"], email: "", orders: 2, notes: '', isBlacklisted: false, blacklistReason: '' },
            { id: 2, name: "Іваненко М.С.", phones: ["+380501112233"], email: "", orders: 1, notes: '', isBlacklisted: false, blacklistReason: '' }
        ];
        
        this.data.inventory = [
            { id: 1, name: "Дисплей iPhone 12", sku: "IP12-DISP", category: "Дисплеї", qty: 5, cost: 2200, price: 2800, minQty: 2, reservedQty: 0, reservedSerialNumbers: [] },
            { id: 2, name: "Батарея ASUS", sku: "ASUS-BAT", category: "АКБ", qty: 3, cost: 900, price: 1200, supplier: 'ASUS Partner', serialNumbers: [], minQty: 2, reservedQty: 0, reservedSerialNumbers: [] },
            { id: 3, name: "Клавіатура HP", sku: "HP-KB", category: "Клавіатури", qty: 10, cost: 600, price: 800, supplier: 'HP Distribution', serialNumbers: [], minQty: 3, reservedQty: 0, reservedSerialNumbers: [] }
        ];

        this.data.inventory[0].supplier = 'Apple Parts UA';
        this.data.inventory[0].serialNumbers = [];

        this.data.services = [
            { id: 1, name: "Діагностика", category: "Діагностика", duration: "30-60 хв", price: 300 },
            { id: 2, name: "Заміна дисплея", category: "Ремонт", duration: "1-2 год", price: 500 },
            { id: 3, name: "Чистка від пилу", category: "Обслуговування", duration: "1 год", price: 600 }
        ];

        this.data.orders = [
            {
                id: 1,
                number: "R-240201-001",
                clientId: 1,
                deviceType: "phone",
                deviceBrand: "Apple",
                deviceModel: "iPhone 12",
                deviceSerial: "SN123456",
                issue: "Розбитий дисплей",
                status: "in_progress",
                priority: "high",
                prepayment: 1000,
                createdAt: new Date().toISOString(),
                parts: [{ partId: 1, qty: 1, price: 2800, name: "Дисплей iPhone 12" }],
                services: [{ serviceId: 2, price: 500, name: "Заміна дисплея" }]
            }
        ];

        this.data.users = [
            { id: 1, name: 'Адмін', login: 'admin', role: 'admin', password: '', createdAt: new Date().toISOString(), payType: 'percent', payRate: 0, payRateServices: 0, payRateParts: 0 },
            { id: 2, name: 'Менеджер', login: 'manager', role: 'manager', password: '', createdAt: new Date().toISOString(), payType: 'percent', payRate: 0, payRateServices: 0, payRateParts: 0 },
            { id: 3, name: 'Майстер', login: 'master', role: 'technician', password: '', createdAt: new Date().toISOString(), payType: 'percent', payRate: 20, payRateServices: 20, payRateParts: 20 }
        ];

        this.data.deviceCatalog = {
            types: ['Ноутбук', 'Телефон', 'ПК', 'Принтер', 'Планшет'],
            brands: ['Apple', 'Samsung', 'Xiaomi', 'HP', 'Lenovo', 'ASUS'],
            models: [],
            conditions: ['Відмінний', 'Добрий', 'З потертостями', 'Тріщини/пошкодження']
        };

        this.data.orderStatuses = [
            { id: 'new', name: 'Новий', colorClass: 'bg-gray-700 text-gray-300', borderClass: 'border-gray-600', isFinal: false, isReady: false },
            { id: 'diagnostic', name: 'Діагностика', colorClass: 'bg-yellow-500/20 text-yellow-400', borderClass: 'border-yellow-500', isFinal: false, isReady: false },
            { id: 'waiting_part', name: 'Очікує запчастину', colorClass: 'bg-orange-500/20 text-orange-400', borderClass: 'border-orange-500', isFinal: false, isReady: false },
            { id: 'in_progress', name: 'В роботі', colorClass: 'bg-blue-500/20 text-blue-400', borderClass: 'border-blue-500', isFinal: false, isReady: false },
            { id: 'ready', name: 'Готовий', colorClass: 'bg-green-500/20 text-green-400', borderClass: 'border-green-500', isFinal: false, isReady: true },
            { id: 'issued', name: 'Видано', colorClass: 'bg-cyan-500/20 text-cyan-400', borderClass: 'border-cyan-500', isFinal: false, isReady: false },
            { id: 'warranty', name: 'Гарантія', colorClass: 'bg-violet-500/20 text-violet-400', borderClass: 'border-violet-500', isFinal: false, isReady: false },
            { id: 'closed', name: 'Закрито', colorClass: 'bg-gray-600 text-gray-400', borderClass: 'border-gray-500', isFinal: true, isReady: false }
        ];

        this.data.inventorySuppliers = ['Apple Parts UA', 'ASUS Partner', 'HP Distribution'];
        this.data.userActionLogs = [];
        this.data.automationConfig = {
            autoAssignMaster: true,
            clientReminders: true,
            statusSmsEnabled: true,
            statusTelegramEnabled: true,
            autoCloseOverdue: false,
            autoCloseDays: 14,
            telegramWebhook: '',
            telegramBotToken: '',
            telegramChatId: '',
            remoteSyncEnabled: false,
            remoteSyncUrl: '',
            remoteSyncApiKey: '',
            remoteSyncIntervalSec: 30,
            apiEnabled: true,
            backupEnabled: true,
            backupIntervalMin: 60
        };
        this.data.backups = [];
        this.data.integrationLogs = [];
        this.data.salaryOperations = [];
        this.data.messageTemplates = [
            {
                id: 'status_ready',
                name: 'Готово до видачі',
                text: 'Вітаємо, {{clientName}}! Ваше замовлення {{orderNumber}} ({{device}}) готове до видачі. Сума до сплати: {{toPay}} грн.'
            },
            {
                id: 'status_progress',
                name: 'В роботі',
                text: 'Доброго дня, {{clientName}}. Замовлення {{orderNumber}} вже в роботі. Статус: {{status}}.'
            }
        ];
        this.data.checklistTemplates = [];
        this.data.paymentMethods = ['cash', 'card', 'transfer'];
        this.data.financeConfig = { rroEnabled: false, rroProvider: 'none' };
        this.data._sync = {
            deviceId: getOrCreateDeviceId(),
            updatedAt: new Date().toISOString()
        };
        this.data.adminConfig = {
            tariffs: {
                diagnosticFee: 300,
                urgentMultiplier: 1.2,
                warrantyDays: 30
            },
            pricing: {
                taxPercent: 0,
                markupPercent: 0
            },
            branding: {
                companyName: 'ServicePro',
                companyTagline: 'CRM для сервісного центру',
                logoText: 'SP',
                accentColor: '#2563eb'
            },
            audit: {
                enabled: true,
                retentionDays: 365
            }
        };

        this.save();
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `servicepro_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    },

    // CRUD операції
    create(table, record) {
        record.id = this.getNextId(table);
        this.data[table].push(record);
        this.save();
        return record;
    },

    update(table, id, updates) {
        const idx = this.data[table].findIndex(r => r.id == id);
        if (idx !== -1) {
            this.data[table][idx] = { ...this.data[table][idx], ...updates };
            this.save();
            return this.data[table][idx];
        }
        return null;
    },

    delete(table, id) {
        this.data[table] = this.data[table].filter(r => r.id != id);
        this.save();
    },

    find(table, id) {
        return this.data[table].find(r => r.id == id);
    },

    findBy(table, field, value) {
        return this.data[table].filter(r => r[field] == value);
    },

    query(table) {
        return this.data[table];
    }
};

export default Database;