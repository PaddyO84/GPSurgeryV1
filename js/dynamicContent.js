(function() {
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

    document.addEventListener('componentLoaded', (e) => {
        if (e.detail && e.detail.elementId === 'footer-placeholder') {
            populateFooter();
        }
    });

    document.addEventListener('componentsLoaded', populateFooter);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', populateFooter);
    } else {
        populateFooter();
    }
})();
