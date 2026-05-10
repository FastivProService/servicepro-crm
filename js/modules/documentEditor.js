import Database from './database.js';
import Auth from './auth.js';
import { Toast } from './ui.js';

const VARIABLE_GROUPS = [
    {
        id: 'company',
        label: 'Компанія',
        icon: 'fa-building',
        variables: [
            { id: 'company.name', label: 'Назва компанії' },
            { id: 'company.address', label: 'Адреса' },
            { id: 'company.phone', label: 'Телефон' },
            { id: 'company.edrpou', label: 'ЄДРПОУ' }
        ]
    },
    {
        id: 'order',
        label: 'Замовлення',
        icon: 'fa-clipboard-list',
        variables: [
            { id: 'order.number', label: 'Номер замовлення' },
            { id: 'order.date', label: 'Дата замовлення' },
            { id: 'order.device', label: 'Пристрій' },
            { id: 'order.serial', label: 'Серійний номер' },
            { id: 'order.issue', label: 'Опис проблеми' }
        ]
    },
    {
        id: 'client',
        label: 'Клієнт',
        icon: 'fa-user',
        variables: [
            { id: 'client.name', label: 'Ім\'я клієнта' },
            { id: 'client.phone', label: 'Телефон' },
            { id: 'client.email', label: 'Email' }
        ]
    },
    {
        id: 'finance',
        label: 'Фінанси',
        icon: 'fa-wallet',
        variables: [
            { id: 'order.total', label: 'Сума замовлення' },
            { id: 'order.prepayment', label: 'Аванс' },
            { id: 'order.balance', label: 'До сплати' },
            { id: 'order.parts_table', label: 'Таблиця запчастин' },
            { id: 'order.services_table', label: 'Таблиця послуг' }
        ]
    },
    {
        id: 'employee',
        label: 'Співробітники',
        icon: 'fa-user-tie',
        variables: [
            { id: 'executor.name', label: 'Виконавець' },
            { id: 'executor.role', label: 'Посада' }
        ]
    },
    {
        id: 'date',
        label: 'Дата',
        icon: 'fa-calendar',
        variables: [
            { id: 'date.today', label: 'Дата сьогодні' },
            { id: 'time.now', label: 'Час зараз' }
        ]
    },
    {
        id: 'image',
        label: 'Зображення',
        icon: 'fa-image',
        variables: [
            { id: 'company.logo', label: 'Логотип компанії' }
        ]
    }
];

const DEFAULT_DOCUMENT_HTML = `
<div style="text-align: center; margin-bottom: 24px;">
    <p style="font-size: 18px; font-weight: bold;">{{company.name}}</p>
    <p style="font-size: 12px; color: #666;">{{company.address}}</p>
    <p style="font-size: 12px;">{{company.phone}}</p>
</div>
<h2 style="text-align: center; margin-bottom: 20px;">ТОВАРНИЙ ЧЕК</h2>
<p><strong>Номер замовлення:</strong> {{order.number}}</p>
<p><strong>Дата:</strong> {{order.date}}</p>
<p><strong>Клієнт:</strong> {{client.name}}</p>
<p><strong>Телефон:</strong> {{client.phone}}</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
        <tr style="background: #f3f4f6;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Позиція</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Ціна</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Кількість</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Сума</th>
        </tr>
    </thead>
    <tbody>
        {{order.parts_table}}
        {{order.services_table}}
    </tbody>
</table>
<p><strong>Всього:</strong> {{order.total}} грн</p>
<p><strong>Аванс:</strong> {{order.prepayment}} грн</p>
<p><strong>До сплати:</strong> {{order.balance}} грн</p>
<p style="margin-top: 40px; font-size: 11px; color: #888;">Дата друку: {{date.today}} {{time.now}}</p>
`;

function ensureDocumentTemplates() {
    const dt = Database.data.documentTemplates;
    if (!dt || !Array.isArray(dt) || dt.length === 0) {
        Database.data.documentTemplates = [
            { id: 'doc_' + Date.now(), name: 'Товарний чек', html: DEFAULT_DOCUMENT_HTML, updatedAt: new Date().toISOString() }
        ];
        Database.save();
    }
    return Database.data.documentTemplates;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const DocumentEditorModule = {
    editingId: null,
    tinymceInstance: null,

    getTemplates() {
        return ensureDocumentTemplates();
    },

    getTemplate(id) {
        return this.getTemplates().find(t => t.id === id);
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
        }

        const id = this.editingId;
        if (id) {
            return this.renderEditor(id);
        }

        const templates = this.getTemplates();
        return `
            <div class="max-w-4xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Редактор документів</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Шаблони актів, чеків та інших документів</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 class="font-semibold text-lg text-blue-400"><i class="fas fa-file-alt mr-2"></i>Документи</h3>
                        <button onclick="window.DocumentEditor.addNew()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                            <i class="fas fa-plus"></i> Новий документ
                        </button>
                    </div>
                    <div class="p-4 md:p-6">
                        <div class="space-y-3" id="documentTemplatesList">
                            ${templates.map(t => `
                                <div class="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors group">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <i class="fas fa-file-invoice text-blue-400"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium">${escapeHtml(t.name)}</div>
                                            <div class="text-xs text-gray-500">Оновлено: ${new Date(t.updatedAt || t.id).toLocaleDateString('uk-UA')}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button onclick="window.DocumentEditor.openEditor('${t.id}')" class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg" title="Редагувати">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        ${templates.length > 1 ? `
                                        <button onclick="window.DocumentEditor.deleteDoc('${t.id}')" data-doc-name="${escapeHtml(t.name || '')}" class="p-2 text-red-400 hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Видалити">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderEditor(docId) {
        const doc = this.getTemplate(docId);
        if (!doc) return this.render();

        const variablePanelHtml = VARIABLE_GROUPS.map(g => `
            <div class="border border-gray-700 rounded-lg mb-2 overflow-hidden">
                <button type="button" onclick="window.DocumentEditor.toggleVariableGroup('${g.id}')" 
                    class="w-full flex items-center justify-between px-4 py-3 bg-gray-800/80 hover:bg-gray-700/80 transition-colors text-left">
                    <span class="flex items-center gap-2 text-gray-200">
                        <i class="fas ${g.icon} text-blue-400 w-4"></i>
                        ${g.label}
                    </span>
                    <i class="fas fa-chevron-down text-gray-500 transition-transform" id="chevron-${g.id}"></i>
                </button>
                <div id="vars-${g.id}" class="hidden border-t border-gray-700 p-3 space-y-2">
                    ${g.variables.map(v => `
                        <button type="button" onclick="window.DocumentEditor.insertVariable('${v.id}')" 
                            class="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors">
                            ${v.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');

        return `
            <div class="fixed inset-0 z-40 flex flex-col bg-gray-900" id="documentEditorFullscreen">
                <div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <div class="flex items-center gap-4">
                        <button onclick="window.DocumentEditor.closeEditor()" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <h2 class="text-lg font-bold">${escapeHtml(doc.name)}</h2>
                            <p class="text-xs text-gray-500">Налаштування / Документи</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.DocumentEditor.saveDocument()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                            <i class="fas fa-save"></i> Зберегти
                        </button>
                        <button onclick="window.DocumentEditor.closeEditor()" class="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">
                            Скасувати
                        </button>
                    </div>
                </div>

                <div class="flex-1 flex overflow-hidden">
                    <div class="flex-1 overflow-auto p-4 bg-gray-800/30">
                        <div class="max-w-4xl mx-auto">
                            <div class="bg-white rounded-lg shadow-xl min-h-[600px] p-8 text-gray-900" id="docEditorContainer">
                                <textarea id="docEditorTextarea" class="w-full min-h-[550px] border-0 p-0 resize-none focus:outline-none focus:ring-0" style="font-family: inherit;">${escapeHtml(doc.html || '')}</textarea>
                            </div>
                        </div>
                    </div>

                    <aside class="w-72 lg:w-80 border-l border-gray-700 bg-gray-800/50 overflow-y-auto flex flex-col">
                        <div class="p-4 border-b border-gray-700">
                            <h3 class="font-semibold text-gray-200 mb-1">Вставити змінну</h3>
                            <p class="text-xs text-gray-500">Клікніть для вставки в документ</p>
                        </div>
                        <div class="p-4 flex-1">
                            ${variablePanelHtml}
                        </div>
                    </aside>
                </div>
            </div>
        `;
    },

    closeEditor() {
        this.editingId = null;
        if (this.tinymceInstance) {
            try { this.tinymceInstance.remove(); } catch (e) {}
            this.tinymceInstance = null;
        }
        document.getElementById('contentArea').innerHTML = this.render();
    },

    toggleVariableGroup(groupId) {
        const el = document.getElementById('vars-' + groupId);
        const chevron = document.getElementById('chevron-' + groupId);
        if (!el) return;
        el.classList.toggle('hidden');
        if (chevron) chevron.style.transform = el.classList.contains('hidden') ? '' : 'rotate(180deg)';
    },

    insertVariable(varId) {
        const placeholder = '{{' + varId + '}}';
        const ed = this.tinymceInstance || (typeof tinymce !== 'undefined' ? tinymce.activeEditor : null);
        if (ed) {
            if (ed.insertContent) ed.insertContent(placeholder);
            else ed.execCommand('mceInsertContent', false, placeholder);
            ed.focus();
        }
    },

    async initTinyMCE() {
        const textarea = document.getElementById('docEditorTextarea');
        if (!textarea || typeof tinymce === 'undefined') {
            setTimeout(() => this.initTinyMCE(), 100);
            return;
        }

        if (this.tinymceInstance) {
            try { this.tinymceInstance.remove(); } catch (e) {}
            this.tinymceInstance = null;
        }

        textarea.id = textarea.id || 'docEditorTextarea';
        const editors = await tinymce.init({
            selector: '#' + textarea.id,
            height: 550,
            menubar: true,
            plugins: 'lists link table code',
            toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | table | link | code',
            content_style: 'body { font-family: Inter, sans-serif; font-size: 14px; padding: 0; }',
            promotion: false,
            branding: false,
            resize: false,
            table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol'
        });
        this.tinymceInstance = (editors && editors[0]) || (typeof tinymce !== 'undefined' ? tinymce.get(textarea?.id) : null) || null;
    },

    saveDocument() {
        const doc = this.getTemplate(this.editingId);
        if (!doc) return;

        let html = '';
        if (this.tinymceInstance) {
            html = this.tinymceInstance.getContent();
        } else {
            const ta = document.getElementById('docEditorTextarea');
            if (ta) html = ta.value;
        }

        doc.html = html;
        doc.updatedAt = new Date().toISOString();
        Database.save();
        Toast.show('Документ збережено', 'success');
        this.closeEditor();
    },

    addNew() {
        const newDoc = {
            id: 'doc_' + Date.now(),
            name: 'Новий документ',
            html: DEFAULT_DOCUMENT_HTML,
            updatedAt: new Date().toISOString()
        };
        ensureDocumentTemplates();
        Database.data.documentTemplates.push(newDoc);
        Database.save();
        Toast.show('Документ створено', 'success');
        this.openEditor(newDoc.id);
    },

    deleteDoc(id) {
        const doc = this.getTemplate(id);
        const name = doc?.name || 'Документ';
        if (!confirm(`Видалити документ «${name}»?`)) return;
        Database.data.documentTemplates = Database.data.documentTemplates.filter(t => t.id !== id);
        Database.save();
        Toast.show('Документ видалено', 'info');
        document.getElementById('contentArea').innerHTML = this.render();
    }
};

DocumentEditorModule.openEditor = function(id) {
    DocumentEditorModule.editingId = id;
    document.getElementById('contentArea').innerHTML = DocumentEditorModule.render();
    setTimeout(() => {
        VARIABLE_GROUPS.forEach(g => {
            const el = document.getElementById('vars-' + g.id);
            if (el) el.classList.remove('hidden');
            const chevron = document.getElementById('chevron-' + g.id);
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        });
    }, 100);
    DocumentEditorModule.initTinyMCE();
};

window.DocumentEditor = DocumentEditorModule;

export default DocumentEditorModule;
