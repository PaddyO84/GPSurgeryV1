(function() {
    // Check if the user has already seen the welcome message
    if (localStorage.getItem('demo_welcome_seen') === 'true') {
        return;
    }

    // Create the modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'demo-welcome-modal';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '9999';
    modalOverlay.style.padding = '20px';

    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.padding = '30px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.textAlign = 'center';
    modalContent.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    modalContent.style.fontFamily = '"Segoe UI", system-ui, sans-serif';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Welcome to the Demo Site';
    title.style.color = '#d32f2f'; // Warning red
    title.style.marginTop = '0';

    // Message
    const message = document.createElement('div');
    message.innerHTML = `
        <p>This is a <strong>demonstration website</strong> and is not a real medical practice.</p>
        <p>The prescription ordering system and sick note forms are <strong>NOT LIVE</strong>. No requests will be processed.</p>
        <p style="margin-top: 20px;">If you require medical assistance or need to order a real prescription, please <strong>contact your healthcare provider directly</strong>.</p>
    `;
    message.style.lineHeight = '1.6';
    message.style.color = '#333';

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'I Understand';
    closeBtn.style.backgroundColor = '#106b40'; // Primary green
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.padding = '12px 24px';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.fontWeight = 'bold';

    closeBtn.addEventListener('click', function() {
        localStorage.setItem('demo_welcome_seen', 'true');
        modalOverlay.style.display = 'none';
        modalOverlay.remove();
    });

    closeBtn.addEventListener('mouseover', function() {
        closeBtn.style.backgroundColor = '#05220e';
    });
    closeBtn.addEventListener('mouseout', function() {
        closeBtn.style.backgroundColor = '#106b40';
    });

    // Assemble
    modalContent.appendChild(title);
    modalContent.appendChild(message);
    modalContent.appendChild(closeBtn);
    modalOverlay.appendChild(modalContent);

    // Add to DOM
    document.body.appendChild(modalOverlay);
})();
