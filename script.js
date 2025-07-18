const form = document.getElementById('dreamForm');
const dreamList = document.getElementById('dreamList');

let dreams = JSON.parse(localStorage.getItem('dreams')) || [];

// Only run if the form exists (on new-entry.html)
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newDream = {
      date: document.getElementById('date').value,
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      tags: document.getElementById('tags').value.trim()
    };

    dreams.unshift(newDream); // Add to the beginning
    localStorage.setItem('dreams', JSON.stringify(dreams));
    alert('Dream saved successfully!');
    window.location.href = 'index.html'; // Go back to main page
  });
}

// Only run if the list exists (on index.html)
if (dreamList) {
  renderDreams();
}

function renderDreams() {
  dreamList.innerHTML = '';

  const topDreams = dreams.slice(0, 5); // show only latest 5
  topDreams.forEach((dream, index) => {
    const div = document.createElement('div');
    div.className = 'dream-entry';
    div.innerHTML = `
      <strong>${dream.date} — ${dream.title}</strong>
      <p>${dream.description}</p>
      <small>Tags: ${dream.tags}</small>
    `;
    dreamList.appendChild(div);
  });
}
