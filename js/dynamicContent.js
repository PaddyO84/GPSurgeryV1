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

        const headerNowdoc = document.getElementById('header-nowdoc');
        if (headerNowdoc && siteData.contact.nowDoc) {
            headerNowdoc.textContent = siteData.contact.nowDoc;
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

        const contactAddress = document.getElementById('contact-address');
        if (contactAddress && siteData.contact.address) {
            contactAddress.textContent = siteData.contact.address;
        }

        const contactPhone = document.getElementById('contact-phone');
        if (contactPhone && siteData.contact.phone) {
            contactPhone.textContent = siteData.contact.phone;
            if (siteData.contact.phoneLink) {
                contactPhone.href = siteData.contact.phoneLink;
            }
        }

        const contactEmail = document.getElementById('contact-email');
        if (contactEmail && siteData.contact.email) {
            contactEmail.textContent = siteData.contact.email;
            if (siteData.contact.emailLink) {
                contactEmail.href = siteData.contact.emailLink;
            }
        }

        const contactNowdoc = document.getElementById('contact-nowdoc');
        if (contactNowdoc && siteData.contact.nowDoc) {
            contactNowdoc.textContent = siteData.contact.nowDoc;
            if (siteData.contact.nowDocLink) {
                contactNowdoc.href = siteData.contact.nowDocLink;
            }
        }
    }

    function populateHours() {
        if (typeof siteData === 'undefined' || !siteData.hours) return;

        const weekdayEl = document.getElementById('hours-weekday');
        if (weekdayEl) {
            weekdayEl.textContent = siteData.hours.morning || siteData.hours.weekday || '9:00am - 12:30pm';
        }

        const afternoonEl = document.getElementById('hours-afternoon');
        if (afternoonEl && siteData.hours.afternoon) {
            afternoonEl.textContent = siteData.hours.afternoon;
        }

        const weekendEl = document.getElementById('hours-weekend');
        if (weekendEl && siteData.hours.weekend) {
            weekendEl.textContent = siteData.hours.weekend;
        }
    }

    function populateAll() {
        populateHeader();
        populateFooter();
        populateHours();
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
