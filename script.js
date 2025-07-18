const form = document.getElementById('dreamForm');
const dreamList = document.getElementById('dreamList');
const carouselContainer = document.querySelector('.dream-carousel');

let dreams = JSON.parse(localStorage.getItem('dreams')) || [];

// 📝 1. Save Dream Entry
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const newDream = {
      date: new Date().toLocaleDateString(), // e.g. "7/18/2025"
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      tags: document.getElementById('tags').value.trim(),
      image: '',
    };

    const imageInput = document.getElementById('image');
    if (imageInput.files && imageInput.files[0]) {
      const file = imageInput.files[0];
      const reader = new FileReader();

      reader.onloadend = function () {
        newDream.image = reader.result;
        dreams.unshift(newDream);
        localStorage.setItem('dreams', JSON.stringify(dreams));
        alert('Dream saved successfully!');
        window.location.href = 'index.html';
      };

      reader.readAsDataURL(file);
    } else {
      dreams.unshift(newDream);
      localStorage.setItem('dreams', JSON.stringify(dreams));
      alert('Dream saved successfully!');
      window.location.href = 'index.html';
    }
  });
}

// 📜 2. Render dream list (index.html)
if (dreamList) {
  renderDreams();
}

function renderDreams() {
  dreamList.innerHTML = '';

  const topDreams = dreams.slice(0, 5);
  topDreams.forEach((dream, index) => {
    const div = document.createElement('div');
    div.className = 'dream-entry';
    div.innerHTML = `<img src="${dream.image}" alt="Dream Image" class="dream-image">`;
    dreamList.appendChild(div);
  });
}

// 🎠 3. Render carousel (optional page or same page)
if (carouselContainer) {
  renderCarouselDreams();
}

function renderCarouselDreams() {
  carouselContainer.innerHTML = '';

  dreams.slice(0, 10).forEach((dream, index) => {
    if (dream.image) {
      const item = document.createElement('div');
      item.className = 'carousel-item';

      const img = document.createElement('img');
      img.src = dream.image;
      img.alt = dream.title || `Dream ${index + 1}`;

      item.appendChild(img);
      carouselContainer.appendChild(item);
    }
  });
}
