document.addEventListener('DOMContentLoaded', () => {
    // Off-Canvas Mobile Menu
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    let navOverlay = document.querySelector('.nav-overlay');

    // Create overlay if it doesn't exist
    if (!navOverlay) {
        navOverlay = document.createElement('div');
        navOverlay.className = 'nav-overlay';
        document.body.appendChild(navOverlay);
    }

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Toggle function
    function toggleMenu() {
        const isExpanded = nav.classList.toggle('show');
        navOverlay.classList.toggle('show');
        menuToggle.setAttribute('aria-expanded', isExpanded);
        menuToggle.textContent = isExpanded ? '✕' : '☰';
        document.body.style.overflow = isExpanded ? 'hidden' : '';
    }

    // Close menu when clicking overlay or pressing Esc
    navOverlay.addEventListener('click', toggleMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('show')) {
            toggleMenu();
        }
    });


    // Mobile Dropdown Functionality
    const dropdowns = document.querySelectorAll('nav .dropdown > a');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const parent = dropdown.parentElement;
                parent.classList.toggle('open');
            }
        });
    });


    // Accordion Functionality
    const accordions = document.getElementsByClassName("accordion");
    for (let i = 0; i < accordions.length; i++) {
        const accordion = accordions[i];
        const panel = accordion.nextElementSibling;
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
