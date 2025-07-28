const form = document.getElementById('postForm');
const postsContainer = document.getElementById('postsContainer');

let posts = [];

async function fetchPosts() {
  try {
    const res = await fetch('https://dream-api.onrender.com/api/posts');
    if (!res.ok) throw new Error("Failed to fetch posts");
    posts = await res.json();
    displayPosts();
  } catch (err) {
    console.error("Error fetching posts:", err);
  }
}

const postsPerPage = 10;
let currentPage = 1;

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

function displayPosts(page = 1) {
  postsContainer.innerHTML = '';

  const totalPages = Math.ceil(posts.length / postsPerPage);
  if (posts.length === 0) {
    postsContainer.innerHTML = '<p class="no-posts">No posts yet. Be the first to write one!</p>';
    return;
  }

  // Clamp page number
  page = Math.min(Math.max(page, 1), totalPages);
  currentPage = page;

  // Calculate slice indices for pagination (newest posts first)
  const start = (page - 1) * postsPerPage;
  const end = start + postsPerPage;

  const postsToShow = posts.slice(start, end);

  postsToShow.forEach(({ title, content }) => {
    const postElem = document.createElement('article');
    postElem.className = 'post';

    postElem.innerHTML = `
      <h2>${escapeHTML(title)}</h2>
      <p>${escapeHTML(content)}</p>
    `;

    postsContainer.appendChild(postElem);
  });

  displayPagination(totalPages, page);
}

function displayPagination(totalPages, currentPage) {
  // Remove old pagination if exists
  const oldPagination = document.getElementById('pagination');
  if (oldPagination) oldPagination.remove();

  if (totalPages <= 1) return; // No pagination needed

  const pagination = document.createElement('nav');
  pagination.id = 'pagination';
  pagination.style.textAlign = 'center';
  pagination.style.marginTop = '1rem';
  pagination.style.userSelect = 'none';

  // Create Previous arrow
  const prev = document.createElement('button');
  prev.textContent = '←';
  prev.disabled = currentPage === 1;
  prev.style.margin = '0 5px';
  prev.onclick = () => displayPosts(currentPage - 1);
  pagination.appendChild(prev);

  // Show page numbers, but if many pages, show only some for readability
  // For simplicity, show up to 5 pages max, centered around current page

  let startPage = 1;
  let endPage = totalPages;
  if (totalPages > 5) {
    if (currentPage <= 3) {
      startPage = 1;
      endPage = 5;
    } else if (currentPage + 2 >= totalPages) {
      startPage = totalPages - 4;
      endPage = totalPages;
    } else {
      startPage = currentPage - 2;
      endPage = currentPage + 2;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.style.margin = '0 3px';
    pageBtn.disabled = i === currentPage;
    if (!pageBtn.disabled) {
      pageBtn.style.cursor = 'pointer';
      pageBtn.onclick = () => displayPosts(i);
    }
    pagination.appendChild(pageBtn);
  }

  // Create Next arrow
  const next = document.createElement('button');
  next.textContent = '→';
  next.disabled = currentPage === totalPages;
  next.style.margin = '0 5px';
  next.onclick = () => displayPosts(currentPage + 1);
  pagination.appendChild(next);

  postsContainer.after(pagination);
}

form.addEventListener('submit', async e => {
  e.preventDefault();

  const title = form.title.value.trim();
  const content = form.content.value.trim();

  if (title && content) {
    await fetch('https://dream-api.onrender.com/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    form.reset();
    fetchPosts(); // Reload after post
  }
});

fetchPosts();


// Initial render
displayPosts(currentPage);
