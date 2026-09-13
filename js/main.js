(function() {
    let navInitialized = false;

    function initNav() {
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = document.querySelector('nav');
        if (!menuToggle || !nav) return;
        if (navInitialized) return;
        navInitialized = true;

        let navOverlay = document.querySelector('.nav-overlay');
        if (!navOverlay) {
            navOverlay = document.createElement('div');
            navOverlay.className = 'nav-overlay';
            document.body.appendChild(navOverlay);
        }

        function toggleMenu() {
            if (!nav || !navOverlay || !menuToggle) return;
            const isExpanded = nav.classList.toggle('show');
            navOverlay.classList.toggle('show');
            menuToggle.setAttribute('aria-expanded', isExpanded);
            menuToggle.textContent = isExpanded ? '✕' : '☰';
            document.body.style.overflow = isExpanded ? 'hidden' : '';

            if (isExpanded) {
                const firstFocusable = nav.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            } else {
                menuToggle.focus();
            }
        }

        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Close menu when clicking overlay or pressing Esc
        navOverlay.addEventListener('click', toggleMenu);
        document.addEventListener('keydown', (e) => {
            if (!nav || !nav.classList.contains('show')) return;

            if (e.key === 'Escape') {
                toggleMenu();
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = Array.from(nav.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])'))
                    .filter(el => !el.disabled && el.offsetParent !== null);
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement || !nav.contains(document.activeElement)) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement || !nav.contains(document.activeElement)) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });

        // Mobile Dropdown Functionality
        const dropdowns = document.querySelectorAll('nav .dropdown > a');
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    const parent = dropdown.parentElement;
                    if (parent) parent.classList.toggle('open');
                }
            });
        });
    }

    document.addEventListener('componentLoaded', (e) => {
        if (e.detail && e.detail.elementId === 'header-placeholder') {
            initNav();
        }
    });
    document.addEventListener('componentsLoaded', initNav);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // Accordion Functionality
    const accordions = document.getElementsByClassName("accordion");
    for (let i = 0; i < accordions.length; i++) {
        const accordion = accordions[i];
        const panel = accordion.nextElementSibling;
        if (!panel) continue;

        const panelId = `panel-${i}`;
        panel.setAttribute('id', panelId);
        accordion.setAttribute('aria-controls', panelId);
        accordion.setAttribute('aria-expanded', 'false');

        accordion.addEventListener("click", function() {
            this.classList.toggle("active");
            const isExpanded = this.classList.contains("active");
            this.setAttribute('aria-expanded', isExpanded);
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
});
