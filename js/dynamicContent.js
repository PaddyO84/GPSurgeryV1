(function() {
    function populateHeader() {
        if (typeof siteData === 'undefined' || !siteData.contact) return;

        const headerPhone = document.getElementById('header-phone');
        if (headerPhone && siteData.contact.phone) {
            headerPhone.textContent = siteData.contact.phone;
        }

        const headerAddress = document.getElementById('header-address');
        if (headerAddress && siteData.contact.address) {
            headerAddress.textContent = siteData.contact.address;
        }
    }

    function populateFooter() {
        if (typeof siteData === 'undefined' || !siteData.contact) return;

        const footerAddress = document.getElementById('footer-address');
        if (footerAddress) footerAddress.textContent = siteData.contact.address;

        const footerPhone = document.getElementById('footer-phone');
        if (footerPhone) {
            footerPhone.textContent = siteData.contact.phone;
            footerPhone.href = siteData.contact.phoneLink;
        }

        const footerEmail = document.getElementById('footer-email');
        if (footerEmail) {
            footerEmail.textContent = siteData.contact.email;
            footerEmail.href = siteData.contact.emailLink;
        }

        const footerNowdoc = document.getElementById('footer-nowdoc');
        if (footerNowdoc) {
            footerNowdoc.textContent = siteData.contact.nowDoc;
            footerNowdoc.href = siteData.contact.nowDocLink;
        }
    }

    function populateAll() {
        populateHeader();
        populateFooter();
    }

    document.addEventListener('componentLoaded', (e) => {
        if (e.detail && e.detail.elementId === 'header-placeholder') {
            populateHeader();
        } else if (e.detail && e.detail.elementId === 'footer-placeholder') {
            populateFooter();
        }
    });

    document.addEventListener('componentsLoaded', populateAll);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populateAll);
    } else {
        populateAll();
    }
})();
