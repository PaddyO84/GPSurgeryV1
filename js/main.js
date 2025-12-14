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
    for (let i = 0; i < accordions.length; i++) {
        accordions[i].addEventListener("click", function() {
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
        trigger.addEventListener('click', (e) => {
            // Only toggle on mobile or keyboard interaction
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const content = trigger.nextElementSibling;
                // Close other dropdowns
                document.querySelectorAll('.dropdown-content').forEach(d => {
                    if (d !== content) d.style.display = 'none';
                });

                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });

        // Keyboard support
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const content = trigger.nextElementSibling;
                content.style.display = content.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
});
