// Global configuration for the application
(function() {
    const existing = (typeof window !== 'undefined' && window.CONFIG && typeof window.CONFIG === 'object')
        ? window.CONFIG
        : ((typeof globalThis !== 'undefined' && globalThis.CONFIG && typeof globalThis.CONFIG === 'object') ? globalThis.CONFIG : {});
    const parseBool = (val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const trimmed = val.trim().toLowerCase();
            return trimmed === 'true' || trimmed === '1' || trimmed === 'yes';
        }
        return Boolean(val);
    };

    const isLive = typeof existing.LIVE_DEPLOYMENT !== 'undefined'
        ? parseBool(existing.LIVE_DEPLOYMENT)
        : (typeof existing.IS_LIVE !== 'undefined' ? parseBool(existing.IS_LIVE) : false);

    const resolvedConfig = {
        ...existing,
        // Live deployment flag: when false/unset, appointments and forms operate in demo mode
        LIVE_DEPLOYMENT: isLive,
        // The deployed Google Apps Script Web App URL (must be provided by operators during live deployment)
        SCRIPT_WEB_APP_URL: existing.SCRIPT_WEB_APP_URL || "",
        // Public client-side submission token for casual-abuse deterrence (must match Apps Script Script Properties during live deployment)
        SUBMISSION_TOKEN: existing.SUBMISSION_TOKEN || ""
    };

    if (typeof window !== 'undefined') {
        window.CONFIG = resolvedConfig;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.CONFIG = resolvedConfig;
    }
})();
