const tabs = document.querySelectorAll('.technique-tabs .tab');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active state from all tabs & panels
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        panels.forEach(panel => panel.classList.remove('active'));

        // Activate clicked tab and corresponding panel
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const targetPanel = document.getElementById(tab.getAttribute('aria-controls'));
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    });
});
