(function() {
    let navInitialized = false;

    function initNav() {
        const menuToggle = document.querySelector('.menu-toggle');
        const nav = document.querySelector('#main-nav') || document.querySelector('nav');
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
                const focusScope = document.querySelector('.nav-container') || nav;
                const focusableElements = Array.from(focusScope.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])'))
                    .filter(el => !el.disabled && el.offsetParent !== null);
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement || !focusScope.contains(document.activeElement)) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement || !focusScope.contains(document.activeElement)) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });

        // Mobile Dropdown Functionality
        const dropdowns = document.querySelectorAll('nav .dropdown > a');
        dropdowns.forEach(dropdown => {
            dropdown.setAttribute('aria-expanded', 'false');
            dropdown.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.innerWidth <= 768) {
                    const parent = dropdown.parentElement;
                    if (parent) {
                        const isOpen = parent.classList.toggle('open');
                        dropdown.setAttribute('aria-expanded', isOpen);
                    }
                }
            });
        });

        // Close mobile menu, reset open dropdowns, and clear body overflow lock if viewport resizes beyond 768px
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                if (nav.classList.contains('show')) {
                    nav.classList.remove('show');
                    if (navOverlay) navOverlay.classList.remove('show');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    menuToggle.textContent = '☰';
                }
                dropdowns.forEach(dropdown => {
                    const parent = dropdown.parentElement;
                    if (parent) {
                        parent.classList.remove('open');
                    }
                    dropdown.setAttribute('aria-expanded', 'false');
                });
                document.body.style.overflow = '';
            }
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

function initAccordions() {
    // Accordion Functionality - closes open accordions when one is opened
    const accordions = document.getElementsByClassName("accordion");
    for (let i = 0; i < accordions.length; i++) {
        const accordion = accordions[i];
        const panel = accordion.nextElementSibling;
        if (!panel) continue;

        const panelId = `panel-${i}`;
        panel.setAttribute('id', panelId);
        panel.inert = true;
        accordion.setAttribute('aria-controls', panelId);
        accordion.setAttribute('aria-expanded', 'false');

        accordion.addEventListener("click", function() {
            const isCurrentlyActive = this.classList.contains("active");

            // Close all accordions
            for (let j = 0; j < accordions.length; j++) {
                const otherAcc = accordions[j];
                const otherPanel = otherAcc.nextElementSibling;
                otherAcc.classList.remove("active");
                otherAcc.setAttribute('aria-expanded', 'false');
                if (otherPanel) {
                    otherPanel.style.maxHeight = null;
                    otherPanel.inert = true;
                }
            }

            // If it wasn't active before, open it
            if (!isCurrentlyActive) {
                this.classList.add("active");
                this.setAttribute('aria-expanded', 'true');
                panel.inert = false;
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordions);
} else {
    initAccordions();
}
