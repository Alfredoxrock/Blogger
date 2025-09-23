// Blog functionality for Ink & Pages
class BlogManager {
    constructor() {
        this.LS_KEY = 'ink-pages-posts-v2';
        this.posts = this.loadPosts();
        this.currentFilter = '';
        this.currentCategory = '';
        this.init();
    }

    // Sample posts with more comprehensive data
    getSamplePosts() {
        return [
            {
                id: 'p1',
                title: 'A Small Wake',
                date: '2025-09-10',
                category: 'fiction',
                tags: ['flash', 'fiction', 'literary'],
                excerpt: 'The river kept its secrets. I kept mine. Between the reed and the bridge, a coin shone like a sliver of moon.',
                body: `The river kept its secrets. I kept mine. Between the reed and the bridge, a coin shone like a sliver of moon.

Margaret had thrown it there on a Tuesday, when the water was high and her patience was low. "Make a wish," she'd said to herself, but the words felt hollow even as they left her lips.

Three weeks later, I found myself standing at the same spot, watching the current carry leaves downstream. The coin was still there, caught between two stones, refusing to be carried away.

Some things are meant to stay put, I thought. Some wishes are meant to wait.

I reached into my pocket and felt the smooth edge of another coin. The morning sun caught its surface as I held it up, then let it fall into the water beside Margaret's.

Two wishes now. Two secrets the river would keep.

The water flowed on, indifferent to our hopes, our dreams, our small gestures of faith. But somehow, that felt right. Some things should be beyond our control.

I walked home with empty pockets and a lighter heart.`,
                readTime: 2,
                featured: true
            },
            {
                id: 'p2',
                title: 'Notes on Dialogue',
                date: '2025-08-29',
                category: 'craft',
                tags: ['craft', 'advice', 'writing-tips'],
                excerpt: 'Dialogue should feel like motion: short, interruptible, and useful. Read your lines aloud.',
                body: `Dialogue should feel like motion: short, interruptible, and useful. Read your lines aloud.

Good dialogue does three things simultaneously:
1. Reveals character
2. Advances plot
3. Feels natural when spoken

The best dialogue is subtext. Characters rarely say exactly what they mean. They hint, deflect, reveal themselves accidentally.

"I'm fine," Sarah said, but her hands were shaking.

Notice how the action contradicts the words. That's where truth lives—in the space between what's said and what's shown.

Tips for sharper dialogue:
• Cut small talk unless it serves a purpose
• Use contractions (people say "can't" not "cannot")
• Interrupt yourself mid-sentence sometimes
• Let characters speak over each other
• End scenes mid-conversation

Read everything aloud. If you stumble, your reader will too.

Your ear knows good dialogue before your brain does. Trust it.`,
                readTime: 3,
                featured: false
            },
            {
                id: 'p3',
                title: 'Prompt: The Empty Chair',
                date: '2025-07-17',
                category: 'prompts',
                tags: ['prompt', 'exercise', 'character'],
                excerpt: 'Write a scene where a chair in a cafe is always empty for one person — why? Who waits? What changes when someone sits?',
                body: `Write a scene where a chair in a cafe is always empty for one person — why? Who waits? What changes when someone sits?

Consider these angles:

**The Regular**
Someone comes every day at the same time, sits in the same chair. What's their routine? What happens when they don't show up?

**The Memorial**
The chair represents someone who's gone. Who keeps it empty? What would it mean for someone else to sit there?

**The Reservation**
Someone important is expected. A job interview? A first date? A difficult conversation? What's at stake?

**The Superstition**
Maybe it's not about one person—maybe it's about luck, tradition, or an old story the cafe staff tells.

**Variations to explore:**
• Write it from the perspective of a barista
• Write it from someone who doesn't know the chair's significance
• Write it from the person the chair is meant for
• Write the day someone finally sits there

Set a timer for 15 minutes and see where the prompt takes you. Don't overthink it—just follow the story.`,
                readTime: 2,
                featured: false
            },
            {
                id: 'p4',
                title: 'The Weight of Words',
                date: '2025-06-22',
                category: 'essays',
                tags: ['writing', 'philosophy', 'craft'],
                excerpt: 'Every word carries weight. The trick is knowing which ones to carry and which to leave behind.',
                body: `Every word carries weight. The trick is knowing which ones to carry and which to leave behind.

I used to think more words meant more impact. If I could say something in ten words, saying it in twenty would be twice as powerful. I was wrong.

The best writing is sculpture, not architecture. You don't add beauty—you remove everything that isn't beautiful.

Hemingway knew this. So did Carver. They understood that silence can be louder than noise, that space can be more powerful than substance.

Consider this sentence: "She was sad."

Now consider: "She stared at her coffee until it grew cold."

The second doesn't mention sadness, but you feel it more deeply. That's the magic of showing over telling, but it's also something more: the faith that readers are smart enough to understand what you're not saying.

Good writing trusts its audience.

Bad writing explains everything, afraid the reader won't "get it." Good writing leaves room for interpretation, for the reader to fill in the spaces with their own experience.

When you edit, ask yourself: "What can I remove?" More often than not, the answer is "more than you think."

Trust the weight of fewer words. Trust your reader to carry the rest.`,
                readTime: 3,
                featured: true
            }
        ];
    }

    // Load posts from localStorage with fallback to samples
    loadPosts() {
        try {
            const raw = localStorage.getItem(this.LS_KEY);
            if (!raw) return this.getSamplePosts();
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) return this.getSamplePosts();
            return parsed;
        } catch (e) {
            console.warn('Error loading posts from localStorage:', e);
            return this.getSamplePosts();
        }
    }

    // Save posts to localStorage
    savePosts() {
        try {
            localStorage.setItem(this.LS_KEY, JSON.stringify(this.posts));
        } catch (e) {
            console.error('Error saving posts to localStorage:', e);
        }
    }

    // Initialize the blog
    init() {
        this.setupEventListeners();
        this.renderPosts();
        this.updatePostCount();
    }

    // Set up event listeners
    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('q');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Newsletter subscription
        const subBtn = document.getElementById('subBtn');
        if (subBtn) {
            subBtn.addEventListener('click', () => this.handleSubscription());
        }

        // Close modal on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // Close modal on outside click
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal();
            });
        }

        // Close button
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
    }

    // Handle search
    handleSearch() {
        const searchInput = document.getElementById('q');
        if (searchInput) {
            this.currentFilter = searchInput.value.trim();
            this.renderPosts();
        }
    }

    // Filter posts based on search query and category
    getFilteredPosts() {
        let filtered = [...this.posts];

        // Apply text search filter
        if (this.currentFilter) {
            const query = this.currentFilter.toLowerCase();
            filtered = filtered.filter(post =>
                post.title.toLowerCase().includes(query) ||
                post.body.toLowerCase().includes(query) ||
                post.excerpt?.toLowerCase().includes(query) ||
                (post.tags || []).some(tag => tag.toLowerCase().includes(query)) ||
                post.category?.toLowerCase().includes(query)
            );
        }

        // Apply category filter
        if (this.currentCategory) {
            filtered = filtered.filter(post => post.category === this.currentCategory);
        }

        // Sort by date (newest first)
        return filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }

    // Render posts to the page
    renderPosts(container = 'posts') {
        const postsContainer = document.getElementById(container);
        if (!postsContainer) return;

        const filtered = this.getFilteredPosts();
        postsContainer.innerHTML = '';

        if (filtered.length === 0) {
            postsContainer.innerHTML = `
        <div class="post" style="text-align: center; color: var(--muted);">
          <h3>No posts found</h3>
          <p>Try adjusting your search terms or browse all posts.</p>
        </div>
      `;
            return;
        }

        filtered.forEach(post => {
            const postCard = this.createPostCard(post);
            postsContainer.appendChild(postCard);
        });

        this.updatePostCount(filtered.length);
    }

    // Create a post card element
    createPostCard(post) {
        const card = document.createElement('article');
        card.className = 'post';
        card.setAttribute('data-id', post.id);

        const excerpt = post.excerpt || this.truncate(post.body, 120);
        const readTime = post.readTime || this.calculateReadTime(post.body);
        const tags = (post.tags || []).map(tag =>
            `<span class="tag">${this.escapeHtml(tag)}</span>`
        ).join('');

        card.innerHTML = `
      <h3>${this.escapeHtml(post.title)}</h3>
      <div class="meta">
        ${this.formatDate(post.date)} · ${readTime} min read
        ${post.category ? ` · <span class="category">${this.escapeHtml(post.category)}</span>` : ''}
      </div>
      <p style="flex:1; margin:8px 0 0; color:var(--muted); line-height: 1.5;">
        ${this.escapeHtml(excerpt)}
      </p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:var(--spacing-xs);">
        <div class="tags">${tags}</div>
        <div style="display:flex; gap:8px;">
          <button class="btn" onclick="blogManager.viewPost('${post.id}')">Read</button>
          ${this.isAdminPage() ? `<button class="btn" onclick="blogManager.editPost('${post.id}')">Edit</button>` : ''}
          ${this.isAdminPage() ? `<button class="close" onclick="blogManager.deletePost('${post.id}')">Delete</button>` : ''}
        </div>
      </div>
    `;

        // Add click handler to the card
        card.addEventListener('click', (e) => {
            if (!e.target.matches('button, .btn, .close')) {
                this.viewPost(post.id);
            }
        });

        return card;
    }

    // Check if we're on the admin page
    isAdminPage() {
        return window.location.pathname.includes('admin.html');
    }

    // View a single post
    viewPost(id) {
        const post = this.posts.find(p => p.id === id);
        if (!post) return;

        const overlay = document.getElementById('overlay');
        const modal = overlay?.querySelector('.modal');
        if (!overlay || !modal) return;

        const readTime = post.readTime || this.calculateReadTime(post.body);
        const tags = (post.tags || []).join(', ');

        modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; gap:var(--spacing-sm); margin-bottom:var(--spacing-sm);">
        <div style="flex: 1;">
          <h1 style="margin: 0 0 var(--spacing-xs); font-size: 24px; line-height: 1.3;">${this.escapeHtml(post.title)}</h1>
          <div class="meta" style="font-size: 14px;">
            ${this.formatDate(post.date)} · ${readTime} min read
            ${post.category ? ` · ${this.escapeHtml(post.category)}` : ''}
            ${tags ? ` · ${tags}` : ''}
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-shrink: 0;">
          ${this.isAdminPage() ? `<button class="btn" onclick="blogManager.editPost('${post.id}')">Edit</button>` : ''}
          <button class="close" onclick="blogManager.closeModal()">Close</button>
        </div>
      </div>
      <article style="white-space:pre-wrap; color:var(--text-light); line-height: 1.7; font-size: 16px;">
        ${this.escapeHtml(post.body)}
      </article>
    `;

        overlay.classList.add('show');
        modal.scrollTop = 0;
    }

    // Close the modal
    closeModal() {
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    // Edit a post (redirect to admin if not already there)
    editPost(id) {
        if (!this.isAdminPage()) {
            window.location.href = `admin.html?edit=${id}`;
            return;
        }
        // If we're already on admin page, this will be handled by admin.js
        if (window.adminManager) {
            window.adminManager.editPost(id);
        }
    }

    // Delete a post
    deletePost(id) {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        this.posts = this.posts.filter(p => p.id !== id);
        this.savePosts();
        this.renderPosts();
        this.closeModal();
    }

    // Add a new post
    addPost(postData) {
        const newPost = {
            id: this.generateId(),
            ...postData,
            date: postData.date || new Date().toISOString().slice(0, 10)
        };

        this.posts.unshift(newPost);
        this.savePosts();
        return newPost;
    }

    // Update an existing post
    updatePost(id, postData) {
        const index = this.posts.findIndex(p => p.id === id);
        if (index === -1) return null;

        this.posts[index] = { ...this.posts[index], ...postData };
        this.savePosts();
        return this.posts[index];
    }

    // Get post by ID
    getPost(id) {
        return this.posts.find(p => p.id === id);
    }

    // Get posts by category
    getPostsByCategory(category) {
        return this.posts.filter(p => p.category === category);
    }

    // Get featured posts
    getFeaturedPosts() {
        return this.posts.filter(p => p.featured === true);
    }

    // Get recent posts
    getRecentPosts(limit = 5) {
        return [...this.posts]
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, limit);
    }

    // Get all categories
    getCategories() {
        const categories = [...new Set(this.posts.map(p => p.category).filter(Boolean))];
        return categories.sort();
    }

    // Get all tags
    getTags() {
        const allTags = this.posts.flatMap(p => p.tags || []);
        const uniqueTags = [...new Set(allTags)];
        return uniqueTags.sort();
    }

    // Set category filter
    setCategoryFilter(category) {
        this.currentCategory = category;
        this.renderPosts();
    }

    // Clear filters
    clearFilters() {
        this.currentFilter = '';
        this.currentCategory = '';
        const searchInput = document.getElementById('q');
        if (searchInput) searchInput.value = '';
        this.renderPosts();
    }

    // Handle newsletter subscription
    handleSubscription() {
        const emailInput = document.getElementById('email');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email || !this.isValidEmail(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        // In a real implementation, you'd send this to your newsletter service
        localStorage.setItem('ink-pages-subscriber', email);
        alert('Thanks for subscribing! You\'ll receive occasional writing notes and updates.');
        emailInput.value = '';
    }

    // Update post count display
    updatePostCount(count = null) {
        const countElement = document.getElementById('count');
        if (countElement) {
            const displayCount = count !== null ? count : this.getFilteredPosts().length;
            countElement.textContent = displayCount;
        }
    }

    // Utility functions
    generateId() {
        return 'post_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    }

    truncate(str, length) {
        if (!str) return '';
        return str.length > length ? str.slice(0, length - 1) + '…' : str;
    }

    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    calculateReadTime(text) {
        if (!text) return 1;
        const wordsPerMinute = 200;
        const wordCount = text.split(/\s+/).length;
        return Math.max(1, Math.round(wordCount / wordsPerMinute));
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Export posts as JSON
    exportPosts() {
        const dataStr = JSON.stringify(this.posts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ink-pages-posts.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import posts from JSON
    importPosts(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedPosts = JSON.parse(e.target.result);
                if (Array.isArray(importedPosts)) {
                    this.posts = importedPosts;
                    this.savePosts();
                    this.renderPosts();
                    alert(`Successfully imported ${importedPosts.length} posts.`);
                } else {
                    alert('Invalid file format. Expected an array of posts.');
                }
            } catch (error) {
                alert('Error reading file. Please ensure it\'s a valid JSON file.');
            }
        };
        reader.readAsText(file);
    }

    // Generate RSS feed
    generateRSS() {
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
        const items = this.posts.map(post => `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${baseUrl}blog.html?post=${post.id}</link>
        <guid>${post.id}</guid>
        <pubDate>${new Date(post.date).toUTCString()}</pubDate>
        <description><![CDATA[${post.excerpt || this.truncate(post.body, 200)}]]></description>
        ${post.category ? `<category>${post.category}</category>` : ''}
      </item>
    `).join('');

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ink &amp; Pages</title>
    <description>Short fiction, craft notes, and writing prompts</description>
    <link>${baseUrl}</link>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

        const blob = new Blob([rss], { type: 'application/rss+xml' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

// Initialize blog manager when DOM is loaded
let blogManager;
document.addEventListener('DOMContentLoaded', () => {
    blogManager = new BlogManager();

    // Make it globally available for onclick handlers
    window.blogManager = blogManager;
});