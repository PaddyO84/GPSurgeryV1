document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navUl = document.querySelector('nav ul');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navUl.classList.toggle('show');
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
});
