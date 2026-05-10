import Database from './database.js';
import Auth from './auth.js';
import { Modal, Toast } from './ui.js';

// Стандартні поля для шаблонів (id → { label, type: order|system })
const STANDARD_FIELDS = [
    { id: 'executor', label: 'Виконавець', type: 'system' },
    { id: 'client', label: 'Замовник', type: 'order' },
    { id: 'device', label: 'Пристрій', type: 'order' },
    { id: 'serial', label: 'S/N', type: 'order' },
    { id: 'issue', label: 'Опис проблеми', type: 'order' },
    { id: 'parts', label: 'Запчастини', type: 'order' },
    { id: 'services', label: 'Послуги', type: 'order' },
    { id: 'total', label: 'Всього', type: 'order' },
    { id: 'prepayment', label: 'Аванс', type: 'order' },
    { id: 'balance', label: 'До сплати', type: 'order' },
    { id: 'signatures', label: 'Підписи', type: 'system' }
];

function makeTemplate(id, name, docTitle, enabledIds) {
    var fields = [];
    for (var i = 0; i < STANDARD_FIELDS.length; i++) {
        var f = STANDARD_FIELDS[i];
        var enabled = enabledIds.indexOf(f.id) >= 0;
        fields.push({ id: f.id, label: f.label, type: f.type, enabled: enabled });
    }
    return { id: id, name: name, documentTitle: docTitle, fields: fields };
}


const DEFAULT_TEMPLATES = [
    makeTemplate('priymalna', 'Приймальна', 'ПРИЙМАЛЬНИЙ АКТ', ['executor', 'client', 'device', 'serial', 'issue', 'parts', 'services', 'total', 'prepayment', 'balance', 'signatures']),
    makeTemplate('garantiyna', 'Гарантійна', 'ГАРАНТІЙНИЙ ТАЛОН', ['executor', 'client', 'device', 'serial', 'issue', 'signatures']),
    makeTemplate('vidatkova', 'Видаткова', 'ВИДАТКОВИЙ АКТ', ['executor', 'client', 'device', 'serial', 'parts', 'services', 'total', 'prepayment', 'balance', 'signatures'])
];

function ensureTemplates(cfg) {
    if (!cfg.templates || cfg.templates.length === 0) {
        cfg.templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        cfg.defaultTemplateId = 'priymalna';
    }
    if (!cfg.defaultTemplateId) cfg.defaultTemplateId = cfg.templates[0]?.id || 'priymalna';
    return cfg;
}

const PrintEditorModule = {
    editingTemplateId: null,

    getConfig() {
        const cfg = Database.data?.printConfig || {};
        return ensureTemplates({
            format: cfg.format || 'a4',
            companyName: cfg.companyName || 'ТОВ "ServicePro"',
            companyAddress: cfg.companyAddress || '',
            companyPhone: cfg.companyPhone || '',
            templates: cfg.templates,
            defaultTemplateId: cfg.defaultTemplateId
        });
    },

    getTemplate(id) {
        const cfg = this.getConfig();
        return cfg.templates?.find(t => t.id === id);
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу до налаштувань</div>`;
        }

        const cfg = this.getConfig();
        const templates = cfg.templates || [];

        return `
            <div class="max-w-3xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Редактор полів для друку</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Квітанції, шаблони та поля для друку</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden mb-6">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700">
                        <h3 class="font-semibold text-lg text-orange-400"><i class="fas fa-building mr-2"></i>Дані компанії</h3>
                    </div>
                    <div class="p-4 md:p-6 space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Назва компанії</label>
                                <input type="text" id="printCompanyName" value="${(cfg.companyName || '').replace(/"/g, '&quot;')}"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Формат паперу</label>
                                <select id="printFormat" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                                    <option value="a4" ${cfg.format === 'a4' ? 'selected' : ''}>А4</option>
                                    <option value="58mm" ${cfg.format === '58mm' ? 'selected' : ''}>58 мм</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Адреса</label>
                                <input type="text" id="printCompanyAddress" value="${(cfg.companyAddress || '').replace(/"/g, '&quot;')}"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Телефон</label>
                                <input type="text" id="printCompanyPhone" value="${(cfg.companyPhone || '').replace(/"/g, '&quot;')}"
                                    class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                            </div>
                        </div>
                        <button onclick="window.savePrintEditorCompany()" class="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium">Зберегти дані компанії</button>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 class="font-semibold text-lg text-orange-400"><i class="fas fa-file-invoice mr-2"></i>Шаблони квітанцій</h3>
                        <button onclick="window.openAddTemplateModal()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                            <i class="fas fa-plus"></i> Додати квітанцію
                        </button>
                    </div>
                    <div class="p-4 md:p-6">
                        <div class="space-y-3" id="printTemplatesList">
                            ${templates.map(t => `
                                <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                    <div>
                                        <div class="font-medium">${t.name}</div>
                                        <div class="text-sm text-gray-500">${t.documentTitle || t.name}</div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        ${cfg.defaultTemplateId === t.id 
                                            ? '<span class="text-xs text-orange-400"><i class="fas fa-star mr-1"></i>За замовчуванням</span>'
                                            : `<button onclick="window.setDefaultTemplate('${t.id}')" class="text-xs text-gray-400 hover:text-orange-400">Зробити за замовчуванням</button>`
                                        }
                                        <button onclick="window.openEditTemplateModal('${t.id}')" class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg" title="Редагувати"><i class="fas fa-edit"></i></button>
                                        ${templates.length > 1 ? `<button onclick="window.deletePrintTemplate('${t.id}', '${(t.name || '').replace(/'/g, "\\'")}')" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg" title="Видалити"><i class="fas fa-trash"></i></button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    saveCompany() {
        const cfg = this.getConfig();
        cfg.format = document.getElementById('printFormat')?.value || 'a4';
        cfg.companyName = (document.getElementById('printCompanyName')?.value || 'ТОВ "ServicePro"').trim();
        cfg.companyAddress = (document.getElementById('printCompanyAddress')?.value || '').trim();
        cfg.companyPhone = (document.getElementById('printCompanyPhone')?.value || '').trim();
        Database.data.printConfig = cfg;
        Database.save();
        Toast.show('Дані компанії збережено', 'success');
    },

    setDefaultTemplate(id) {
        const cfg = this.getConfig();
        cfg.defaultTemplateId = id;
        Database.data.printConfig = cfg;
        Database.save();
        Toast.show(`"${cfg.templates.find(t => t.id === id)?.name}" — тепер за замовчуванням`, 'success');
        document.getElementById('contentArea').innerHTML = this.render();
    },

    openAddTemplateModal() {
        const newId = 'tpl_' + Date.now();
        const newTemplate = {
            id: newId,
            name: 'Нова квітанція',
            documentTitle: 'ДОКУМЕНТ',
            fields: STANDARD_FIELDS.map(f => ({ ...f, enabled: ['executor', 'client', 'device', 'issue', 'total', 'signatures'].includes(f.id) }))
        };
        this.showTemplateEditorModal(newTemplate, true);
    },

    openEditTemplateModal(id) {
        const t = this.getTemplate(id);
        if (!t) return;
        this.showTemplateEditorModal(JSON.parse(JSON.stringify(t)), false);
    },

    showTemplateEditorModal(template, isNew) {
        const fieldsHtml = (template.fields || STANDARD_FIELDS).map((f, i) => `
            <div class="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700" data-field-id="${f.id}">
                <input type="checkbox" ${f.enabled !== false ? 'checked' : ''} data-field="${f.id}" class="rounded border-gray-600 text-orange-500">
                <input type="text" value="${(f.label || '').replace(/"/g, '&quot;')}" data-field-label="${f.id}"
                    class="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-orange-500 focus:outline-none">
                <div class="flex gap-1">
                    <button type="button" onclick="window.moveTemplateField('${f.id}', -1)" class="p-1.5 text-gray-400 hover:text-white rounded" title="Вгору"><i class="fas fa-chevron-up"></i></button>
                    <button type="button" onclick="window.moveTemplateField('${f.id}', 1)" class="p-1.5 text-gray-400 hover:text-white rounded" title="Вниз"><i class="fas fa-chevron-down"></i></button>
                </div>
            </div>
        `).join('');

        Modal.open(`
            <div class="p-6 max-h-[85vh] overflow-y-auto">
                <h3 class="text-xl font-bold mb-4">${isNew ? 'Нова квітанція' : 'Редагувати шаблон'}</h3>
                <div class="space-y-4 mb-6">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Назва квітанції</label>
                        <input type="text" id="tplName" value="${(template.name || '').replace(/"/g, '&quot;')}" placeholder="Приймальна"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Заголовок документа</label>
                        <input type="text" id="tplDocTitle" value="${(template.documentTitle || '').replace(/"/g, '&quot;')}" placeholder="ПРИЙМАЛЬНИЙ АКТ"
                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-orange-500 focus:outline-none">
                    </div>
                </div>
                <div class="mb-4">
                    <div class="text-sm font-medium text-orange-400 mb-2">Поля на документі (перетягніть або використовуйте стрілки)</div>
                    <div id="templateFieldsList" class="space-y-2">${fieldsHtml}</div>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.saveTemplateEditor('${template.id}', ${isNew})" class="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium">Зберегти</button>
                    <button onclick="window.Modal.close()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Скасувати</button>
                </div>
            </div>
        `);
        window._printEditorCurrentTemplate = template;
    },

    saveTemplateEditor(templateId, isNew) {
        const name = (document.getElementById('tplName')?.value || 'Документ').trim();
        const documentTitle = (document.getElementById('tplDocTitle')?.value || name.toUpperCase()).trim();
        const container = document.getElementById('templateFieldsList');
        if (!container) return;

        const fields = [];
        container.querySelectorAll('[data-field-id]').forEach(row => {
            const id = row.dataset.fieldId;
            const label = row.querySelector(`[data-field-label="${id}"]`)?.value || id;
            const enabled = row.querySelector(`input[data-field="${id}"]`)?.checked !== false;
            const def = STANDARD_FIELDS.find(f => f.id === id) || { id, label, type: 'order' };
            fields.push({ id, label, type: def.type, enabled });
        });

        const cfg = this.getConfig();
        if (isNew) {
            cfg.templates.push({ id: templateId, name, documentTitle, fields });
            if (!cfg.defaultTemplateId) cfg.defaultTemplateId = templateId;
        } else {
            const t = cfg.templates.find(t => t.id === templateId);
            if (t) {
                t.name = name;
                t.documentTitle = documentTitle;
                t.fields = fields;
            }
        }
        Database.data.printConfig = cfg;
        Database.save();
        Modal.close();
        Toast.show(isNew ? 'Квітанцію додано' : 'Шаблон оновлено', 'success');
        document.getElementById('contentArea').innerHTML = this.render();
    },

    moveTemplateField(fieldId, direction) {
        const container = document.getElementById('templateFieldsList');
        if (!container) return;
        const rows = Array.from(container.querySelectorAll('[data-field-id]'));
        const idx = rows.findIndex(r => r.dataset.fieldId === fieldId);
        if (idx < 0) return;
        const newIdx = Math.max(0, Math.min(rows.length - 1, idx + direction));
        if (newIdx === idx) return;
        const moved = rows[idx];
        const target = rows[newIdx];
        if (direction < 0) container.insertBefore(moved, target);
        else container.insertBefore(moved, target.nextSibling);
    },

    deleteTemplate(id, name) {
        if (!confirm(`Видалити квітанцію «${name}»?`)) return;
        const cfg = this.getConfig();
        cfg.templates = cfg.templates.filter(t => t.id !== id);
        if (cfg.defaultTemplateId === id) cfg.defaultTemplateId = cfg.templates[0]?.id;
        Database.data.printConfig = cfg;
        Database.save();
        Toast.show('Квітанцію видалено', 'info');
        document.getElementById('contentArea').innerHTML = this.render();
    }
};

window.savePrintEditorCompany = () => PrintEditorModule.saveCompany();
window.openAddTemplateModal = () => PrintEditorModule.openAddTemplateModal();
window.openEditTemplateModal = (id) => PrintEditorModule.openEditTemplateModal(id);
window.saveTemplateEditor = (id, isNew) => PrintEditorModule.saveTemplateEditor(id, isNew);
window.moveTemplateField = (fieldId, dir) => PrintEditorModule.moveTemplateField(fieldId, dir);
window.setDefaultTemplate = (id) => PrintEditorModule.setDefaultTemplate(id);
window.deletePrintTemplate = (id, name) => PrintEditorModule.deleteTemplate(id, name);

export default PrintEditorModule;
export { ensureTemplates, STANDARD_FIELDS, DEFAULT_TEMPLATES };
