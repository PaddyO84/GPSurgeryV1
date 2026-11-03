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

    const hasExplicitLiveDeployment = typeof existing.LIVE_DEPLOYMENT !== 'undefined';
    const explicitLiveDeployment = hasExplicitLiveDeployment ? parseBool(existing.LIVE_DEPLOYMENT) : undefined;

    const resolvedConfig = {
        ...existing,
        // Live deployment flag: when false/unset, appointments and forms operate in demo mode
        ...(hasExplicitLiveDeployment ? { LIVE_DEPLOYMENT: explicitLiveDeployment } : {}),
        // The deployed Google Apps Script Web App URL (must be provided by operators during live deployment)
        SCRIPT_WEB_APP_URL: existing.SCRIPT_WEB_APP_URL || "",
        // Public client-side submission token for casual-abuse deterrence (must match Apps Script Script Properties during live deployment)
        SUBMISSION_TOKEN: existing.SUBMISSION_TOKEN || "",
        // Helper to check if live deployment is enabled
        isLive: function() {
            const current = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : resolvedConfig;
            if (typeof current.LIVE_DEPLOYMENT !== 'undefined') {
                return parseBool(current.LIVE_DEPLOYMENT);
            }
            if (typeof current.IS_LIVE !== 'undefined') {
                return parseBool(current.IS_LIVE);
            }
            if (typeof window !== 'undefined' && typeof window.IS_LIVE !== 'undefined') {
                return parseBool(window.IS_LIVE);
            }
            return false;
        },
        // Helper to get verified submission URL or log/alert error
        getSubmissionUrl: function() {
            const current = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : resolvedConfig;
            const url = (current && current.SCRIPT_WEB_APP_URL) ? current.SCRIPT_WEB_APP_URL : '';
            if (!url) {
                console.error('Error: CONFIG.SCRIPT_WEB_APP_URL is not configured.');
                if (typeof alert === 'function') {
                    alert('An error occurred. Please try again or call reception: Submission URL is not configured.');
                }
                return null;
            }
            return url;
        }
    };

    if (typeof window !== 'undefined') {
        window.CONFIG = resolvedConfig;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.CONFIG = resolvedConfig;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = resolvedConfig;
    }
})();
