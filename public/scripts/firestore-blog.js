// Blog functionality with Firestore integration for Ink & Pages
import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    limit as firestoreLimit,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

class FirestoreBlogManager {
    constructor() {
        this.posts = [];
        this.currentFilter = '';
        this.currentCategory = '';
        this.isOnline = navigator.onLine;
        this.setupOfflineSupport();
        this.init();
    }

    setupOfflineSupport() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    async init() {
        try {
            await this.loadPosts();
            this.setupEventListeners();
            this.renderPosts();
        } catch (error) {
            console.error('Error initializing blog:', error);
            // Fallback to localStorage if Firestore fails
            this.loadFromLocalStorage();
        }
    }

    // Load posts from Firestore
    async loadPosts() {
        try {
            const postsRef = collection(window.db, 'posts');
            // Only load published posts for public pages (index, blog, categories)
            // Admin pages will load all posts
            const isAdminPage = window.location.pathname.includes('admin');
            const q = isAdminPage
                ? query(postsRef, orderBy('date', 'desc'))
                : query(postsRef, where('status', '==', 'published'), orderBy('date', 'desc'));

            // Real-time listener for posts
            const unsubscribe = onSnapshot(q, (snapshot) => {
                this.posts = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    this.posts.push({
                        id: doc.id,
                        ...data,
                        date: data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date
                    });
                });
                this.renderPosts();
            });

            // If no posts exist, create sample posts
            if (this.posts.length === 0) {
                await this.createSamplePosts();
            }

        } catch (error) {
            console.error('Error loading posts from Firestore:', error);
            throw error;
        }
    }

    // Fallback to localStorage
    loadFromLocalStorage() {
        const LS_KEY = 'ink-pages-posts-v2';
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                this.posts = JSON.parse(raw);
            } else {
                this.posts = this.getSamplePosts();
            }
            this.renderPosts();
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            this.posts = this.getSamplePosts();
            this.renderPosts();
        }
    }

    // Sample posts
    getSamplePosts() {
        return [
            {
                id: 'p1',
                title: 'A Small Wake',
                date: '2025-09-10',
                category: 'fiction',
                status: 'published',
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
                status: 'published',
                tags: ['craft', 'advice', 'writing-tips'],
                excerpt: 'Dialogue should feel like motion: short, interruptible, and useful. Read your lines aloud.',
                body: `Dialogue should feel like motion: short, interruptible, and useful. Read your lines aloud.

Good dialogue does three things simultaneously:
1. Reveals character
2. Advances plot  
3. Feels natural when spoken

Characters interrupt each other. They change subjects. They say one thing and mean another.

"I'm fine," she said, which meant she wasn't.

Tag lines should be invisible. Use "said" most of the time. Save the fancy verbs for when they matter.

Write dialogue, then cut it by half. Then cut it again.`,
                readTime: 1,
                featured: false
            }
        ];
    }

    // Create sample posts in Firestore
    async createSamplePosts() {
        const samplePosts = this.getSamplePosts();
        const postsRef = collection(window.db, 'posts');

        for (const post of samplePosts) {
            try {
                const postData = {
                    ...post,
                    date: new Date(post.date),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };
                delete postData.id; // Let Firestore generate the ID

                await addDoc(postsRef, postData);
            } catch (error) {
                console.error('Error creating sample post:', error);
            }
        }
    }

    // Add new post to Firestore
    async addPost(postData) {
        try {
            const postsRef = collection(window.db, 'posts');

            // Get current user info from auth service if available
            let authorInfo = {
                authorId: 'anonymous',
                authorName: 'Anonymous',
                authorEmail: null
            };

            if (window.authService && window.authService.isAuthenticated()) {
                const user = window.authService.currentUser;
                authorInfo = {
                    authorId: user.uid,
                    authorName: user.displayName || user.email.split('@')[0],
                    authorEmail: user.email
                };
            }

            const post = {
                title: postData.title || 'Untitled',
                body: postData.body || '',
                excerpt: postData.excerpt || '',
                category: postData.category || 'uncategorized',
                tags: Array.isArray(postData.tags) ? postData.tags : [],
                date: postData.date ? new Date(postData.date) : new Date(),
                status: postData.status || 'draft',
                readTime: this.calculateReadTime(postData.body || ''),
                featured: postData.featured || false,
                ...authorInfo, // Include author information
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(postsRef, post);
            console.log('Post added with ID:', docRef.id);
            return docRef.id;

        } catch (error) {
            console.error('Error adding post to Firestore:', error);
            // Fallback to localStorage
            this.addToLocalStorage(postData);
            throw error;
        }
    }

    // Update post in Firestore
    async updatePost(postId, updates) {
        try {
            const postRef = doc(window.db, 'posts', postId);
            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            if (updates.date) {
                updateData.date = new Date(updates.date);
            }

            await updateDoc(postRef, updateData);
            console.log('Post updated:', postId);

        } catch (error) {
            console.error('Error updating post in Firestore:', error);
            throw error;
        }
    }

    // Delete post from Firestore
    async deletePost(postId) {
        try {
            const postRef = doc(window.db, 'posts', postId);
            await deleteDoc(postRef);
            console.log('Post deleted:', postId);

        } catch (error) {
            console.error('Error deleting post from Firestore:', error);
            throw error;
        }
    }

    // Sync offline data when coming back online
    async syncOfflineData() {
        const offlineData = localStorage.getItem('offline-posts');
        if (offlineData) {
            try {
                const offlinePosts = JSON.parse(offlineData);
                for (const post of offlinePosts) {
                    await this.addPost(post);
                }
                localStorage.removeItem('offline-posts');
                console.log('Offline data synced');
            } catch (error) {
                console.error('Error syncing offline data:', error);
            }
        }
    }

    // Fallback to localStorage for offline functionality
    addToLocalStorage(postData) {
        const LS_KEY = 'ink-pages-posts-v2';
        try {
            const existingPosts = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            const post = {
                id: 'temp-' + Date.now(),
                ...postData,
                readTime: this.calculateReadTime(postData.body || ''),
                date: postData.date || new Date().toISOString().split('T')[0]
            };
            existingPosts.unshift(post);
            localStorage.setItem(LS_KEY, JSON.stringify(existingPosts));

            // Store for later sync
            const offlinePosts = JSON.parse(localStorage.getItem('offline-posts') || '[]');
            offlinePosts.push(post);
            localStorage.setItem('offline-posts', JSON.stringify(offlinePosts));

        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Calculate reading time
    calculateReadTime(text) {
        const wordsPerMinute = 250;
        const words = text.trim().split(/\s+/).length;
        return Math.max(1, Math.ceil(words / wordsPerMinute));
    }

    // Search posts
    searchPosts(query) {
        if (!query) return this.posts;

        const searchTerm = query.toLowerCase();
        return this.posts.filter(post =>
            post.title.toLowerCase().includes(searchTerm) ||
            post.body.toLowerCase().includes(searchTerm) ||
            post.excerpt.toLowerCase().includes(searchTerm) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm))) ||
            (post.category && post.category.toLowerCase().includes(searchTerm))
        );
    }

    // Filter by category
    filterByCategory(category) {
        if (!category) return this.posts;
        return this.posts.filter(post => post.category === category);
    }

    // Get categories
    getCategories() {
        const categories = new Set();
        this.posts.forEach(post => {
            if (post.category) categories.add(post.category);
        });
        return Array.from(categories).sort();
    }

    // Get all tags
    getTags() {
        const tags = new Set();
        this.posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }

    // Setup event listeners
    setupEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('q');

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // RSS link
        const rssLink = document.getElementById('rssLink');
        if (rssLink) {
            rssLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateRSS();
            });
        }

        // Subscribe functionality
        const subBtn = document.getElementById('subBtn');
        if (subBtn) {
            subBtn.addEventListener('click', () => this.handleSubscribe());
        }

        // About button
        const aboutBtn = document.getElementById('aboutBtn');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'about.html';
            });
        }
    }

    // Handle search
    handleSearch() {
        const query = document.getElementById('q')?.value || '';
        this.currentFilter = query;
        this.renderPosts();
    }

    // Handle subscribe
    async handleSubscribe() {
        const emailInput = document.getElementById('email');
        if (!emailInput) return;

        const email = emailInput.value.trim();
        if (!email) {
            alert('Please enter your email address');
            return;
        }

        try {
            // Save subscriber to Firestore
            const subscribersRef = collection(window.db, 'subscribers');
            await addDoc(subscribersRef, {
                email: email,
                subscribedAt: serverTimestamp(),
                source: 'blog'
            });

            alert('Thanks for subscribing!');
            emailInput.value = '';
        } catch (error) {
            console.error('Error subscribing:', error);
            // Fallback to localStorage
            localStorage.setItem('ink-pages-subscriber', email);
            alert('Thanks for subscribing! (Saved locally)');
            emailInput.value = '';
        }
    }

    // Render posts
    renderPosts() {
        const container = document.getElementById('posts');
        if (!container) return;

        let postsToShow = this.posts;

        // Apply filters
        if (this.currentFilter) {
            postsToShow = this.searchPosts(this.currentFilter);
        }
        if (this.currentCategory) {
            postsToShow = this.filterByCategory(this.currentCategory);
        }

        // Update count
        const countElement = document.getElementById('count');
        if (countElement) {
            countElement.textContent = postsToShow.length;
        }

        if (postsToShow.length === 0) {
            container.innerHTML = '<div class="no-posts">No posts found.</div>';
            return;
        }

        container.innerHTML = postsToShow.map(post => this.createPostHTML(post)).join('');
    }

    // Create post HTML
    createPostHTML(post) {
        const tags = (post.tags || []).map(tag =>
            `<span class="tag">${this.escapeHtml(tag)}</span>`
        ).join('');

        return `
            <article class="post" onclick="blogManager.viewPost('${post.id}')">
                <h3>${this.escapeHtml(post.title)}</h3>
                <div class="meta">
                    ${post.date ? `<span>${this.formatDate(post.date)}</span>` : ''}
                    ${post.category ? `<span class="category">${this.escapeHtml(post.category)}</span>` : ''}
                    <span>${post.readTime || 1} min read</span>
                </div>
                <p class="excerpt">${this.escapeHtml(post.excerpt || '')}</p>
                ${tags ? `<div class="tags">${tags}</div>` : ''}
            </article>
        `;
    }

    // View single post
    viewPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) return;

        const overlay = document.getElementById('overlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalMeta = document.getElementById('modalMeta');
        const modalBody = document.getElementById('modalBody');

        if (overlay && modalTitle && modalMeta && modalBody) {
            modalTitle.textContent = post.title;
            modalMeta.innerHTML = `
                <span>${this.formatDate(post.date)}</span>
                ${post.category ? `<span class="category">${this.escapeHtml(post.category)}</span>` : ''}
                <span>${post.readTime || 1} min read</span>
            `;
            modalBody.textContent = post.body;
            overlay.style.display = 'flex';

            // Setup edit button
            const editBtn = document.getElementById('editBtn');
            if (editBtn) {
                editBtn.onclick = () => {
                    window.location.href = `admin.html?edit=${postId}`;
                };
            }

            // Setup close button
            const closeBtn = document.getElementById('closeBtn');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    overlay.style.display = 'none';
                };
            }

            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            };
        }
    }

    // Generate RSS feed
    generateRSS() {
        const rssItems = this.posts.slice(0, 10).map(post => `
            <item>
                <title><![CDATA[${post.title}]]></title>
                <description><![CDATA[${post.excerpt || post.body.substring(0, 200)}]]></description>
                <link>https://dreamlogtogether.com/#${post.id}</link>
                <guid>https://dreamlogtogether.com/#${post.id}</guid>
                <pubDate>${new Date(post.date).toUTCString()}</pubDate>
            </item>
        `).join('');

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
    <channel>
        <title>Ink &amp; Pages</title>
        <description>Short fiction, craft notes, and writing prompts</description>
        <link>https://dreamlogtogether.com</link>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${rssItems}
    </channel>
</rss>`;

        const blob = new Blob([rss], { type: 'application/rss+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ink-pages-rss.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }
}

// Initialize blog manager when DOM is loaded
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for Firebase to be initialized
        const checkFirebase = () => {
            if (window.db) {
                window.blogManager = new FirestoreBlogManager();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

export default FirestoreBlogManager;