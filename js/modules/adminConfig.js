import Database from './database.js';
import Auth from './auth.js';
import ActivityLog from './activityLog.js';
import { Toast } from './ui.js';

const AdminConfigModule = {
    getConfig() {
        return Database.data?.adminConfig || {
            tariffs: { diagnosticFee: 300, urgentMultiplier: 1.2, warrantyDays: 30 },
            pricing: { taxPercent: 0, markupPercent: 0 },
            branding: { companyName: 'ServicePro', companyTagline: 'CRM для сервісного центру', logoText: 'SP', accentColor: '#2563eb' },
            audit: { enabled: true, retentionDays: 365 }
        };
    },

    saveConfig(cfg) {
        Database.data.adminConfig = cfg;
        Database.save();
        ActivityLog.add('admin_config_update', {
            tariffs: cfg?.tariffs,
            pricing: cfg?.pricing,
            branding: { companyName: cfg?.branding?.companyName, accentColor: cfg?.branding?.accentColor },
            audit: cfg?.audit
        });
    },

    render() {
        if (!Auth.hasAccess('settings') && Auth.currentUser?.role !== 'admin') {
            return `<div class="text-center py-20 text-gray-500">Немає доступу</div>`;
        }

        const admin = this.getConfig();
        const tariffs = admin.tariffs || {};
        const pricing = admin.pricing || {};
        const branding = admin.branding || {};
        const audit = admin.audit || {};

        return `
            <div class="max-w-5xl fade-in pb-20 md:pb-8">
                <div class="flex items-center gap-4 mb-6">
                    <button onclick="window.navigateTo('settings')" class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold">Адмін-конфігурація</h2>
                        <p class="text-sm text-gray-500 mt-0.5">Тарифи, податки/націнки, брендинг, аудит</p>
                    </div>
                </div>

                <div class="glass rounded-xl overflow-hidden border-l-4 border-emerald-500">
                    <div class="p-4 md:p-6 space-y-5">
                        <div>
                            <div class="text-xs uppercase tracking-wide text-gray-400 mb-2">Тарифи</div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input id="cfgDiagnosticFee" type="number" min="0" step="0.01" value="${Number(tariffs.diagnosticFee || 0)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Діагностика, грн">
                                <input id="cfgUrgentMultiplier" type="number" min="1" step="0.01" value="${Number(tariffs.urgentMultiplier || 1.2)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Коеф. терміновості">
                                <input id="cfgWarrantyDays" type="number" min="0" step="1" value="${Number(tariffs.warrantyDays || 30)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Гарантія, днів">
                            </div>
                        </div>
                        <div>
                            <div class="text-xs uppercase tracking-wide text-gray-400 mb-2">Податки / Націнки</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input id="cfgTaxPercent" type="number" min="0" step="0.01" value="${Number(pricing.taxPercent || 0)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Податок, %">
                                <input id="cfgMarkupPercent" type="number" min="0" step="0.01" value="${Number(pricing.markupPercent || 0)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Націнка, %">
                            </div>
                        </div>
                        <div>
                            <div class="text-xs uppercase tracking-wide text-gray-400 mb-2">Брендинг</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input id="cfgCompanyName" type="text" value="${(branding.companyName || '').replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Назва компанії">
                                <input id="cfgCompanyTagline" type="text" value="${(branding.companyTagline || '').replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Слоган">
                                <input id="cfgLogoText" type="text" value="${(branding.logoText || '').replace(/"/g, '&quot;')}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Текст логотипу">
                                <input id="cfgAccentColor" type="color" value="${branding.accentColor || '#2563eb'}" class="bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 h-10">
                            </div>
                        </div>
                        <div>
                            <div class="text-xs uppercase tracking-wide text-gray-400 mb-2">Аудит</div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                                <label class="flex items-center gap-2 text-sm"><input id="cfgAuditEnabled" type="checkbox" ${audit.enabled !== false ? 'checked' : ''}> Увімкнути повний аудит</label>
                                <input id="cfgAuditRetentionDays" type="number" min="1" step="1" value="${Number(audit.retentionDays || 365)}" class="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2" placeholder="Зберігати лог, днів">
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="window.saveAdminConfig()" class="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold">Зберегти адмін-конфіг</button>
                            <button onclick="window.navigateTo('activityLog')" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-semibold">Перейти до аудиту</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    saveFromUI() {
        const cfg = this.getConfig();
        cfg.tariffs = {
            diagnosticFee: Math.max(0, Number(document.getElementById('cfgDiagnosticFee')?.value || 0)),
            urgentMultiplier: Math.max(1, Number(document.getElementById('cfgUrgentMultiplier')?.value || 1.2)),
            warrantyDays: Math.max(0, Number(document.getElementById('cfgWarrantyDays')?.value || 30))
        };
        cfg.pricing = {
            taxPercent: Math.max(0, Number(document.getElementById('cfgTaxPercent')?.value || 0)),
            markupPercent: Math.max(0, Number(document.getElementById('cfgMarkupPercent')?.value || 0))
        };
        cfg.branding = {
            companyName: String(document.getElementById('cfgCompanyName')?.value || '').trim() || 'ServicePro',
            companyTagline: String(document.getElementById('cfgCompanyTagline')?.value || '').trim(),
            logoText: String(document.getElementById('cfgLogoText')?.value || '').trim() || 'SP',
            accentColor: String(document.getElementById('cfgAccentColor')?.value || '#2563eb')
        };
        cfg.audit = {
            enabled: !!document.getElementById('cfgAuditEnabled')?.checked,
            retentionDays: Math.max(1, Number(document.getElementById('cfgAuditRetentionDays')?.value || 365))
        };
        this.saveConfig(cfg);
        Toast.show('Адмін-конфігурацію збережено', 'success');
        import('./router.js').then(m => m.default.navigate('adminConfig'));
    }
};

window.saveAdminConfig = () => AdminConfigModule.saveFromUI();

export default AdminConfigModule;
