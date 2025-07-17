const form = document.getElementById('dreamForm');
const dreamList = document.getElementById('dreamList');

let dreams = JSON.parse(localStorage.getItem('dreams')) || [];

function renderDreams() {
  dreamList.innerHTML = '';
  dreams.forEach((dream, index) => {
    const div = document.createElement('div');
    div.className = 'dream-entry';
    div.innerHTML = `
      <strong>${dream.date} - ${dream.title}</strong>
      <p>${dream.description}</p>
      <small>Tags: ${dream.tags}</small><br/>
      <button onclick="editDream(${index})">Edit</button>
      <button onclick="deleteDream(${index})">Delete</button>
    `;
    dreamList.appendChild(div);
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const newDream = {
    date: document.getElementById('date').value,
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    tags: document.getElementById('tags').value
  };
  dreams.push(newDream);
  localStorage.setItem('dreams', JSON.stringify(dreams));
  form.reset();
  renderDreams();
});

function deleteDream(index) {
  dreams.splice(index, 1);
  localStorage.setItem('dreams', JSON.stringify(dreams));
  renderDreams();
}

function editDream(index) {
  const dream = dreams[index];
  document.getElementById('date').value = dream.date;
  document.getElementById('title').value = dream.title;
  document.getElementById('description').value = dream.description;
  document.getElementById('tags').value = dream.tags;
  dreams.splice(index, 1);
  localStorage.setItem('dreams', JSON.stringify(dreams));
  renderDreams();
}

// Initial render
renderDreams();
