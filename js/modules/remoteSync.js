import Database from './database.js';

const RemoteSyncModule = {
    intervalId: null,
    pushTimer: null,
    syncing: false,
    _savePatched: false,
    _originalSave: null,

    getConfig() {
        const cfg = Database.data?.automationConfig || {};
        return {
            enabled: !!cfg.remoteSyncEnabled,
            url: String(cfg.remoteSyncUrl || '').trim(),
            apiKey: String(cfg.remoteSyncApiKey || '').trim(),
            intervalSec: Math.max(10, Number(cfg.remoteSyncIntervalSec || 30))
        };
    },

    log(type, payload = {}) {
        const list = Database.data.integrationLogs || (Database.data.integrationLogs = []);
        list.push({ id: Date.now() + Math.random(), at: new Date().toISOString(), type, payload });
        if (list.length > 700) list.splice(0, list.length - 700);
        Database.save(false);
    },

    getHeaders() {
        const cfg = this.getConfig();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        if (cfg.apiKey) headers['X-API-Key'] = cfg.apiKey;
        return headers;
    },

    getTs(v) {
        const ts = new Date(v || 0).getTime();
        return Number.isFinite(ts) ? ts : 0;
    },

    async fetchRemoteData() {
        const cfg = this.getConfig();
        if (!cfg.url) return null;
        const res = await fetch(cfg.url, {
            method: 'GET',
            headers: this.getHeaders()
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const json = await res.json();
        if (!json || typeof json !== 'object') throw new Error('Невірний JSON у віддаленому сховищі');
        return json;
    },

    async pushLocalData() {
        const cfg = this.getConfig();
        if (!cfg.url) throw new Error('Не вказано URL синхронізації');
        const body = JSON.stringify(Database.data);
        const res = await fetch(cfg.url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body
        });
        if (!res.ok) throw new Error(`PUT ${res.status}`);
        this.log('remote_sync_push', { url: cfg.url });
        return true;
    },

    applyRemoteData(remoteData) {
        const localDeviceId = Database.data?._sync?.deviceId;
        const currentUser = Database.data?.user || null;
        const merged = {
            ...Database.data,
            ...remoteData
        };
        merged.user = currentUser;
        merged._sync = {
            ...(remoteData?._sync || {}),
            deviceId: localDeviceId || remoteData?._sync?.deviceId || `dev_${Date.now()}`,
            updatedAt: remoteData?._sync?.updatedAt || new Date().toISOString()
        };
        Database.data = merged;
        Database.save(false);
        this.log('remote_sync_pull_apply', { updatedAt: merged._sync.updatedAt });
    },

    async reconcile() {
        const cfg = this.getConfig();
        if (!cfg.enabled || !cfg.url || this.syncing) return;
        this.syncing = true;
        try {
            const remote = await this.fetchRemoteData();
            if (!remote) {
                await this.pushLocalData();
                return;
            }
            const localTs = this.getTs(Database.data?._sync?.updatedAt);
            const remoteTs = this.getTs(remote?._sync?.updatedAt);

            if (remoteTs > localTs) {
                this.applyRemoteData(remote);
            } else if (localTs > remoteTs) {
                await this.pushLocalData();
            }
        } catch (e) {
            this.log('remote_sync_error', { error: String(e?.message || e) });
        } finally {
            this.syncing = false;
        }
    },

    schedulePush() {
        const cfg = this.getConfig();
        if (!cfg.enabled || !cfg.url) return;
        if (this.pushTimer) clearTimeout(this.pushTimer);
        this.pushTimer = setTimeout(() => {
            this.reconcile();
        }, 1200);
    },

    patchDatabaseSave() {
        if (this._savePatched) return;
        this._originalSave = Database.save.bind(Database);
        Database.save = (touchSync = true) => {
            this._originalSave(touchSync);
            if (touchSync) this.schedulePush();
        };
        this._savePatched = true;
    },

    start() {
        this.stop();
        this.patchDatabaseSave();
        this.reconcile();
        const cfg = this.getConfig();
        if (cfg.enabled && cfg.url) {
            this.intervalId = setInterval(() => this.reconcile(), cfg.intervalSec * 1000);
        }
    },

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
        if (this.pushTimer) clearTimeout(this.pushTimer);
        this.pushTimer = null;
    },

    async syncNow() {
        await this.reconcile();
    }
};

window.syncRemoteNow = async () => {
    await RemoteSyncModule.syncNow();
};

export default RemoteSyncModule;
