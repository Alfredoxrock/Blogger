// Main application initialization and page-specific functionality

document.addEventListener('DOMContentLoaded', function () {
    // Initialize smooth scrolling for anchor links
    initSmoothScrolling();

    // Initialize responsive navigation
    initMobileNav();

    // Initialize search functionality
    initSearch();

    // Initialize theme handling
    initTheme();

    // Page-specific initialization
    const currentPage = getCurrentPage();
    initPageSpecific(currentPage);
});

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('blog.html')) return 'blog';
    if (path.includes('admin.html')) return 'admin';
    if (path.includes('categories.html')) return 'categories';
    if (path.includes('about.html')) return 'about';
    if (path.includes('contact.html')) return 'contact';
    if (path.includes('archive.html')) return 'archive';
    return 'home';
}

function initPageSpecific(page) {
    switch (page) {
        case 'home':
            initHomePage();
            break;
        case 'blog':
            initBlogPage();
            break;
        case 'categories':
            initCategoriesPage();
            break;
        case 'archive':
            initArchivePage();
            break;
        default:
            break;
    }
}

function initHomePage() {
    // Show featured posts and recent posts
    if (window.blogManager) {
        const featuredPosts = blogManager.getFeaturedPosts().slice(0, 3);
        const recentPosts = blogManager.getRecentPosts(6);

        // Update the posts display to show recent posts
        blogManager.renderPosts();
    }
}

function initBlogPage() {
    // Initialize blog listing with pagination and filtering
    if (window.blogManager) {
        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const tag = urlParams.get('tag');
        const search = urlParams.get('search');

        if (category) {
            blogManager.setCategoryFilter(category);
        }
        if (search) {
            const searchInput = document.getElementById('q');
            if (searchInput) {
                searchInput.value = search;
                blogManager.currentFilter = search;
            }
        }

        blogManager.renderPosts();
    }
}

function initCategoriesPage() {
    // Initialize categories view
    if (window.blogManager) {
        const categories = blogManager.getCategories();
        renderCategoryList(categories);
    }
}

function initArchivePage() {
    // Initialize archive view with posts grouped by date
    if (window.blogManager) {
        renderArchive();
    }
}

function renderCategoryList(categories) {
    const container = document.getElementById('categories-list');
    if (!container) return;

    container.innerHTML = '';

    categories.forEach(category => {
        const posts = blogManager.getPostsByCategory(category);
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.innerHTML = `
      <h3><a href="blog.html?category=${encodeURIComponent(category)}">${blogManager.escapeHtml(category)}</a></h3>
      <p>${posts.length} post${posts.length !== 1 ? 's' : ''}</p>
      <div class="category-posts">
        ${posts.slice(0, 3).map(post => `
          <div class="category-post">
            <a href="blog.html" onclick="blogManager.viewPost('${post.id}')">${blogManager.escapeHtml(post.title)}</a>
            <span class="post-date">${blogManager.formatDate(post.date)}</span>
          </div>
        `).join('')}
        ${posts.length > 3 ? `<div class="more-posts"><a href="blog.html?category=${encodeURIComponent(category)}">View all ${posts.length} posts</a></div>` : ''}
      </div>
    `;
        container.appendChild(categoryCard);
    });
}

function renderArchive() {
    const container = document.getElementById('archive-list');
    if (!container) return;

    const postsByYear = {};
    blogManager.posts.forEach(post => {
        const year = new Date(post.date).getFullYear();
        if (!postsByYear[year]) postsByYear[year] = [];
        postsByYear[year].push(post);
    });

    container.innerHTML = '';

    Object.keys(postsByYear)
        .sort((a, b) => b - a)
        .forEach(year => {
            const yearSection = document.createElement('div');
            yearSection.className = 'archive-year';
            yearSection.innerHTML = `
        <h3>${year}</h3>
        <div class="archive-posts">
          ${postsByYear[year].map(post => `
            <div class="archive-post">
              <span class="post-date">${blogManager.formatDate(post.date)}</span>
              <a href="blog.html" onclick="blogManager.viewPost('${post.id}')">${blogManager.escapeHtml(post.title)}</a>
              <div class="post-tags">
                ${(post.tags || []).map(tag => `<span class="tag">${blogManager.escapeHtml(tag)}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
            container.appendChild(yearSection);
        });
}

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function initMobileNav() {
    // Add mobile menu toggle if needed
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // Add responsive behavior for smaller screens
    window.addEventListener('resize', () => {
        // Handle nav responsiveness
    });
}

function initSearch() {
    const searchForm = document.querySelector('.search');
    const searchInput = document.getElementById('q');

    if (searchInput) {
        // Add search suggestions (could be expanded)
        searchInput.addEventListener('input', debounce(() => {
            const query = searchInput.value.trim();
            if (query.length > 2 && window.blogManager) {
                // Could add search suggestions here
            }
        }, 300));
    }
}

function initTheme() {
    // Handle theme switching if implemented
    // For now, we're using a fixed dark theme
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        if (!timeout) {
            timeout = setTimeout(() => {
                timeout = null;
                func(...args);
            }, wait);
        }
    };
}

// Global utilities
window.utils = {
    debounce,
    throttle,
    getCurrentPage,
    scrollToTop: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }
};
