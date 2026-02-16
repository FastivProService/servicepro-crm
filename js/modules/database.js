// Модуль роботи з локальною базою даних
const Database = {
    data: {
        clients: [],
        orders: [],
        inventory: [],
        services: [],
        transactions: [],
        user: null
    },

    init() {
        const saved = localStorage.getItem('servicePro_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.data = {
                clients: parsed.clients ?? [],
                orders: parsed.orders ?? [],
                inventory: parsed.inventory ?? [],
                services: parsed.services ?? [],
                transactions: parsed.transactions ?? [],
                user: parsed.user ?? null
            };
        } else {
            this.seedData();
        }
    },

    save() {
        localStorage.setItem('servicePro_v2', JSON.stringify(this.data));
    },

    seedData() {
        this.data.clients = [
            { id: 1, name: "Петренко О.В.", phone: "+380671234567", email: "", orders: 2 },
            { id: 2, name: "Іваненко М.С.", phone: "+380501112233", email: "", orders: 1 }
        ];
        
        this.data.inventory = [
            { id: 1, name: "Дисплей iPhone 12", sku: "IP12-DISP", category: "Дисплеї", qty: 5, cost: 2200, price: 2800 },
            { id: 2, name: "Батарея ASUS", sku: "ASUS-BAT", category: "АКБ", qty: 3, cost: 900, price: 1200 },
            { id: 3, name: "Клавіатура HP", sku: "HP-KB", category: "Клавіатури", qty: 10, cost: 600, price: 800 }
        ];

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
                status: "in_repair",
                priority: "high",
                prepayment: 1000,
                createdAt: new Date().toISOString(),
                parts: [{ partId: 1, qty: 1, price: 2800, name: "Дисплей iPhone 12" }],
                services: [{ serviceId: 2, price: 500, name: "Заміна дисплея" }]
            }
        ];

        this.save();
    },

    export() {
        const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `servicepro_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    },

    // CRUD операції
    create(table, record) {
        record.id = Date.now();
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