document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navUl = document.querySelector('nav ul');

    if (menuToggle && navUl) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = navUl.classList.toggle('show');
            menuToggle.setAttribute('aria-expanded', isExpanded);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navUl.classList.contains('show') && !navUl.contains(e.target) && !menuToggle.contains(e.target)) {
                navUl.classList.remove('show');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Accordion Functionality
    const accordions = document.getElementsByClassName("accordion");
    for (const accordion of accordions) {
        accordion.addEventListener("click", function() {
            this.classList.toggle("active");
            const panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }

    // Mobile Dropdown Interactions
    const dropdownTriggers = document.querySelectorAll('.dropdown-trigger');
    dropdownTriggers.forEach(trigger => {
        if (!trigger.hasAttribute('aria-expanded')) {
            trigger.setAttribute('aria-expanded', 'false');
        }

        trigger.addEventListener('click', (e) => {
            // Only toggle on mobile or keyboard interaction
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const content = trigger.nextElementSibling;
                // Close other dropdowns
                document.querySelectorAll('.dropdown-content').forEach(d => {
                    if (d !== content) {
                        d.classList.remove('show');
                        const prev = d.previousElementSibling;
                        if (prev && prev.classList.contains('dropdown-trigger')) {
                            prev.setAttribute('aria-expanded', 'false');
                        }
                    }
                });

                if (content) {
                    const isExpanded = content.classList.toggle('show');
                    trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                }
            }
        });

        // Keyboard support
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const content = trigger.nextElementSibling;
                if (content) {
                    const isExpanded = content.classList.toggle('show');
                    trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                }
            }
        });
    });
});
