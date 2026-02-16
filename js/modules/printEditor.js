import Database from './database.js';
import Auth from './auth.js';
import { Toast } from './ui.js';

const PrintEditorModule = {
    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу до налаштувань</div>`;
        }

        const cfg = Database.data?.printConfig || {};
        const format = cfg.format || 'a4';
        const companyName = cfg.companyName || 'ТОВ "ServicePro"';
        const companyAddress = cfg.companyAddress || '';
        const companyPhone = cfg.companyPhone || '';
        const documentTitle = cfg.documentTitle || 'АКТ ВИКОНАНИХ РОБІТ';

        return `
            <div class="max-w-2xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Редактор полів для друку</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Налаштування печатних документів та актів</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden">
                    <div class="bg-gray-800/50 px-4 md:px-6 py-4 border-b border-gray-700">
                        <h3 class="font-semibold text-lg text-orange-400 flex items-center gap-2">
                            <i class="fas fa-print"></i> Поля для друку
                        </h3>
                        <p class="text-sm text-gray-500 mt-1">Редагуйте текст, що потрапляє на друковані акти та чеки</p>
                    </div>
                    <div class="p-4 md:p-6">
                        <form onsubmit="window.savePrintEditor(event)" class="space-y-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-400 mb-2">Формат паперу</label>
                                <select id="printFormat" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none">
                                    <option value="a4" ${format === 'a4' ? 'selected' : ''}>А4 — стандартний лист</option>
                                    <option value="58mm" ${format === '58mm' ? 'selected' : ''}>58 мм — термопринтер (чеки)</option>
                                </select>
                                <p class="text-xs text-gray-500 mt-2">58 мм — для термопринтерів з вузькою паперовою стрічкою</p>
                            </div>

                            <div class="border-t border-gray-700 pt-6">
                                <div class="text-sm font-medium text-orange-400 mb-4">Дані компанії (виконавця)</div>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs text-gray-500 mb-1">Назва компанії *</label>
                                        <input type="text" id="printCompanyName" required placeholder='ТОВ "ServicePro"'
                                            value="${companyName.replace(/"/g, '&quot;')}"
                                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-500 mb-1">Адреса</label>
                                        <input type="text" id="printCompanyAddress" placeholder="м. Київ, вул. Прикладная 1"
                                            value="${companyAddress.replace(/"/g, '&quot;')}"
                                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-500 mb-1">Телефон компанії</label>
                                        <input type="text" id="printCompanyPhone" placeholder="+380..."
                                            value="${companyPhone.replace(/"/g, '&quot;')}"
                                            class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none">
                                    </div>
                                </div>
                            </div>

                            <div class="border-t border-gray-700 pt-6">
                                <div class="text-sm font-medium text-orange-400 mb-4">Шаблон документа</div>
                                <div>
                                    <label class="block text-xs text-gray-500 mb-1">Заголовок документа</label>
                                    <input type="text" id="printDocTitle" placeholder="АКТ ВИКОНАНИХ РОБІТ"
                                        value="${documentTitle.replace(/"/g, '&quot;')}"
                                        class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 focus:outline-none">
                                </div>
                            </div>

                            <div class="flex gap-3 pt-4">
                                <button type="submit" class="bg-orange-600 hover:bg-orange-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                                    <i class="fas fa-save"></i> Зберегти
                                </button>
                                <button type="button" onclick="window.navigateTo('settings')" class="px-6 py-3 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                                    Скасувати
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    save() {
        const format = document.getElementById('printFormat')?.value || 'a4';
        const companyName = (document.getElementById('printCompanyName')?.value || 'ТОВ "ServicePro"').trim();
        const companyAddress = (document.getElementById('printCompanyAddress')?.value || '').trim();
        const companyPhone = (document.getElementById('printCompanyPhone')?.value || '').trim();
        const documentTitle = (document.getElementById('printDocTitle')?.value || 'АКТ ВИКОНАНИХ РОБІТ').trim();
        Database.data.printConfig = { format, companyName, companyAddress, companyPhone, documentTitle };
        Database.save();
        Toast.show('Налаштування друку збережено', 'success');
    }
};

window.savePrintEditor = (e) => {
    e?.preventDefault?.();
    PrintEditorModule.save();
};

export default PrintEditorModule;
