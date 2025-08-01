document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".technique-index a");
    const panels = document.querySelectorAll(".tab-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", e => {
            e.preventDefault();

            // Remove active class from all panels
            panels.forEach(panel => panel.classList.remove("active"));

            // Get target panel ID from href
            const targetId = tab.getAttribute("href").substring(1);
            const targetPanel = document.getElementById(targetId);

            if (targetPanel) {
                // Add active to target panel
                targetPanel.classList.add("active");
                // Optionally, update focus or aria attributes here
            }
        });
    });
});