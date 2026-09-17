// Global configuration for the application
const CONFIG = {
    // Live deployment flag: when false/unset, appointments and forms operate in demo mode
    LIVE_DEPLOYMENT: (typeof window !== 'undefined' && window.CONFIG && typeof window.CONFIG.LIVE_DEPLOYMENT !== 'undefined') ? window.CONFIG.LIVE_DEPLOYMENT : false,
    // The deployed Google Apps Script Web App URL (must be provided by operators during live deployment)
    SCRIPT_WEB_APP_URL: (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.SCRIPT_WEB_APP_URL) ? window.CONFIG.SCRIPT_WEB_APP_URL : "",
    // Public client-side submission token for casual-abuse deterrence (must match Apps Script Script Properties during live deployment)
    SUBMISSION_TOKEN: (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.SUBMISSION_TOKEN) ? window.CONFIG.SUBMISSION_TOKEN : ""
};
