// Admin functionality with Firestore integration for Ink & Pages
import FirestoreBlogManager from './firestore-blog.js';

class FirestoreAdminManager extends FirestoreBlogManager {
    constructor() {
        super();
        this.currentEditId = null;
        this.autoSaveInterval = null;
        this.setupAdminEventListeners();
        this.setupAutoSave();
        this.initializeForm(); // Initialize form with proper defaults
        this.checkEditMode();
    }

    setupAdminEventListeners() {
        // New post button
        const newPostBtn = document.getElementById('newPostBtn');
        if (newPostBtn) {
            newPostBtn.addEventListener('click', () => this.newPost());
        }

        // Publish button
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishPost());
        }

        // Save draft button
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }

        // Preview button
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewPost());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPosts());
        }

        // Import button
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => this.importPosts(e));
        }

        // Form inputs for auto-save
        const form = document.getElementById('postForm');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.markUnsaved());
            });
        }

        // Close preview modal
        const closePreview = document.getElementById('closePreview');
        if (closePreview) {
            closePreview.addEventListener('click', () => this.closePreview());
        }

        // Delete confirmation
        const confirmDelete = document.getElementById('confirmDelete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => this.confirmDeletePost());
        }

        // Cancel delete
        const cancelDelete = document.getElementById('cancelDelete');
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => this.closeDeleteModal());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.savePost();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.newPost();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.previewPost();
                        break;
                }
            }
        });
    }

    setupAutoSave() {
        // Auto-save every 30 seconds if there are unsaved changes
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.savePost(true); // Silent save
            }
        }, 30000);
    }

    initializeForm() {
        // Set up default form values when admin panel loads
        if (!this.currentEditId) {
            // Only set defaults if we're not editing an existing post
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('postDate').value = today;
            document.getElementById('postStatus').value = 'draft';
            document.getElementById('postCategory').value = 'personal';
        }
    }

    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId) {
            this.editPost(editId);
        }
    }

    async newPost() {
        this.currentEditId = null;
        this.clearForm();
        this.updatePageTitle('New Post');

        // Set default values with proper display
        document.getElementById('postDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('postStatus').value = 'draft';
        document.getElementById('postCategory').value = 'personal'; // Set a default category
        document.getElementById('postTitle').focus();
    }

    async editPost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) {
            alert('Post not found');
            return;
        }

        this.currentEditId = postId;
        this.populateForm(post);
        this.updatePageTitle(`Edit: ${post.title}`);
    }

    cancelEdit() {
        if (this.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }

        // Clear the URL parameter and reload to show posts list
        window.history.replaceState({}, '', window.location.pathname);
        this.newPost();
    }

    populateForm(post) {
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('postBody').value = post.body || '';
        document.getElementById('postExcerpt').value = post.excerpt || '';
        document.getElementById('postCategory').value = post.category || '';
        document.getElementById('postTags').value = Array.isArray(post.tags) ? post.tags.join(', ') : '';
        document.getElementById('postDate').value = post.date || '';
        document.getElementById('postStatus').value = post.status || 'draft';
        document.getElementById('postFeatured').checked = post.featured || false;
    }

    clearForm() {
        document.getElementById('postTitle').value = '';
        document.getElementById('postBody').value = '';
        document.getElementById('postExcerpt').value = '';
        document.getElementById('postCategory').value = 'personal'; // Default to personal category
        document.getElementById('postTags').value = '';
        document.getElementById('postDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('postStatus').value = 'draft'; // Default to draft
        document.getElementById('postFeatured').checked = false;
    }

    async savePost(silent = false) {
        const formData = this.getFormData();

        if (!formData.title.trim()) {
            if (!silent) alert('Please enter a title');
            return;
        }

        try {
            this.showSaveStatus('Saving...');

            if (this.currentEditId) {
                // Update existing post
                await this.updatePost(this.currentEditId, formData);
                if (!silent) {
                    this.showSaveStatus('Post updated!', 'success');
                }
            } else {
                // Create new post
                const postId = await this.addPost(formData);
                this.currentEditId = postId;
                if (!silent) {
                    this.showSaveStatus('Post created!', 'success');
                }
                // Update URL without reload
                const newUrl = `${window.location.pathname}?edit=${postId}`;
                window.history.replaceState({}, '', newUrl);
            }

            this.markSaved();

        } catch (error) {
            console.error('Error saving post:', error);
            this.showSaveStatus('Error saving post', 'error');

            // Show offline notice if appropriate
            if (!navigator.onLine) {
                this.showSaveStatus('Saved locally (offline)', 'warning');
            }
        }
    }

    async publishPost() {
        console.log('publishPost method called');
        const formData = this.getFormData();

        if (!formData.title.trim()) {
            alert('Please enter a title');
            return;
        }

        // Set status to published and ensure publish date is set
        formData.status = 'published';
        if (!formData.date) {
            formData.date = new Date().toISOString().split('T')[0];
        }

        try {
            console.log('Starting to publish post...', formData);
            this.showSaveStatus('Publishing...');

            if (this.currentEditId) {
                // Update existing post
                await this.updatePost(this.currentEditId, formData);
                this.showSaveStatus('Post published!', 'success');
            } else {
                // Create new post
                const postId = await this.addPost(formData);
                this.currentEditId = postId;
                this.showSaveStatus('Post published!', 'success');
                // Update URL without reload
                const newUrl = `${window.location.pathname}?edit=${postId}`;
                window.history.replaceState({}, '', newUrl);
            }

            this.markSaved();

            // Update the status dropdown to reflect published status
            document.getElementById('postStatus').value = 'published';

            // Show success message briefly then redirect
            this.showSaveStatus('Post published! Redirecting...', 'success');

            // Multiple redirect attempts to ensure it works
            console.log('Post published successfully, redirecting to home page...');

            // Immediate redirect after short delay
            setTimeout(() => {
                console.log('Attempting redirect...');
                try {
                    // Try multiple redirect methods
                    window.location.assign('/');
                } catch (e) {
                    console.error('Redirect failed, trying alternative:', e);
                    window.location.href = '/';
                }
            }, 1000);

        } catch (error) {
            console.error('Error publishing post:', error);
            this.showSaveStatus('Error publishing post', 'error');

            // Show offline notice if appropriate
            if (!navigator.onLine) {
                this.showSaveStatus('Saved locally (offline)', 'warning');
            }
        }
    }

    async saveDraft() {
        const formData = this.getFormData();

        if (!formData.title.trim()) {
            alert('Please enter a title');
            return;
        }

        // Set status to draft
        formData.status = 'draft';

        try {
            this.showSaveStatus('Saving draft...');

            if (this.currentEditId) {
                // Update existing post
                await this.updatePost(this.currentEditId, formData);
                this.showSaveStatus('Draft saved!', 'success');
            } else {
                // Create new post
                const postId = await this.addPost(formData);
                this.currentEditId = postId;
                this.showSaveStatus('Draft saved!', 'success');
                // Update URL without reload
                const newUrl = `${window.location.pathname}?edit=${postId}`;
                window.history.replaceState({}, '', newUrl);
            }

            this.markSaved();

            // Update the status dropdown to reflect draft status
            document.getElementById('postStatus').value = 'draft';

        } catch (error) {
            console.error('Error saving draft:', error);
            this.showSaveStatus('Error saving draft', 'error');

            // Show offline notice if appropriate
            if (!navigator.onLine) {
                this.showSaveStatus('Saved locally (offline)', 'warning');
            }
        }
    }

    getFormData() {
        const title = document.getElementById('postTitle').value.trim();
        const body = document.getElementById('postBody').value.trim();
        const excerpt = document.getElementById('postExcerpt').value.trim();
        const category = document.getElementById('postCategory').value.trim();
        const tagsStr = document.getElementById('postTags').value.trim();
        const date = document.getElementById('postDate').value;
        const status = document.getElementById('postStatus').value || 'draft';
        const featured = document.getElementById('postFeatured').checked;

        const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        return {
            title,
            body,
            excerpt: excerpt || this.generateExcerpt(body),
            category: category || 'uncategorized',
            tags,
            date: date || new Date().toISOString().split('T')[0],
            status,
            featured
        };
    }

    generateExcerpt(body, maxLength = 200) {
        if (!body) return '';
        const stripped = body.replace(/[#*_`\[\]]/g, '').trim();
        return stripped.length > maxLength
            ? stripped.substring(0, maxLength) + '...'
            : stripped;
    }

    previewPost() {
        const formData = this.getFormData();
        const previewContent = document.getElementById('previewContent');
        const previewModal = document.getElementById('previewOverlay'); // Fixed: use correct ID

        if (previewContent && previewModal) {
            previewContent.innerHTML = `
                <article class="preview-article">
                    <h1>${this.escapeHtml(formData.title)}</h1>
                    <div class="meta">
                        <span>${this.formatDate(formData.date)}</span>
                        ${formData.category ? `<span class="category">${this.escapeHtml(formData.category)}</span>` : ''}
                        <span>${this.calculateReadTime(formData.body)} min read</span>
                        ${formData.featured ? '<span class="featured">Featured</span>' : ''}
                        <span class="status">Status: ${formData.status}</span>
                    </div>
                    ${formData.excerpt ? `<p class="excerpt"><em>${this.escapeHtml(formData.excerpt)}</em></p>` : ''}
                    <div class="body">${this.formatBody(formData.body)}</div>
                    ${formData.tags.length ? `
                        <div class="tags">
                            ${formData.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </article>
            `;
            previewModal.style.display = 'flex';
        }
    }

    formatBody(body) {
        // Simple markdown-like formatting
        return body
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    closePreview() {
        const previewModal = document.getElementById('previewOverlay'); // Fixed: use correct ID
        if (previewModal) {
            previewModal.style.display = 'none';
        }
    }

    async deletePost(postId) {
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            this.postToDelete = postId;
            deleteModal.style.display = 'flex';
        }
    }

    async confirmDeletePost() {
        if (!this.postToDelete) return;

        try {
            await super.deletePost(this.postToDelete);
            this.closeDeleteModal();

            // If we're editing the deleted post, clear the form
            if (this.currentEditId === this.postToDelete) {
                this.newPost();
            }

            this.showSaveStatus('Post deleted', 'success');
            this.renderPostsList();

        } catch (error) {
            console.error('Error deleting post:', error);
            this.showSaveStatus('Error deleting post', 'error');
        }
    }

    closeDeleteModal() {
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            deleteModal.style.display = 'none';
            this.postToDelete = null;
        }
    }

    async exportPosts() {
        try {
            const exportData = {
                posts: this.posts,
                exportDate: new Date().toISOString(),
                version: '2.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ink-pages-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSaveStatus('Posts exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting posts:', error);
            this.showSaveStatus('Error exporting posts', 'error');
        }
    }

    async importPosts(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.posts || !Array.isArray(data.posts)) {
                throw new Error('Invalid backup file format');
            }

            let imported = 0;
            for (const post of data.posts) {
                try {
                    // Create a copy without the original ID
                    const postData = { ...post };
                    delete postData.id;

                    await this.addPost(postData);
                    imported++;
                } catch (error) {
                    console.warn('Error importing post:', post.title, error);
                }
            }

            this.showSaveStatus(`Imported ${imported} posts`, 'success');
            event.target.value = ''; // Clear file input

        } catch (error) {
            console.error('Error importing posts:', error);
            this.showSaveStatus('Error importing posts', 'error');
        }
    }

    renderPostsList() {
        const container = document.getElementById('postsTableBody'); // Fixed: use correct ID
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="no-posts">No posts yet. Create your first post!</td></tr>';
            return;
        }

        const sortedPosts = [...this.posts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        container.innerHTML = sortedPosts.map(post => `
            <tr class="post-row">
                <td class="post-title">
                    <strong>${this.escapeHtml(post.title)}</strong>
                    ${post.featured ? '<span class="featured-badge">Featured</span>' : ''}
                </td>
                <td class="post-category">${post.category || 'uncategorized'}</td>
                <td class="post-status">
                    <span class="status-badge status-${post.status || 'draft'}">${post.status || 'draft'}</span>
                </td>
                <td class="post-date">${this.formatDate(post.date)}</td>
                <td class="post-actions">
                    <button class="btn btn-small" onclick="adminManager.editPost('${post.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="adminManager.deletePost('${post.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Override parent renderPosts to also update the posts list
    renderPosts() {
        super.renderPosts();
        this.renderPostsList();
    }

    markUnsaved() {
        document.body.classList.add('unsaved-changes');
    }

    markSaved() {
        document.body.classList.remove('unsaved-changes');
    }

    hasUnsavedChanges() {
        return document.body.classList.contains('unsaved-changes');
    }

    showSaveStatus(message, type = 'info') {
        const statusElement = document.getElementById('saveStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `save-status ${type}`;

            // Clear after 3 seconds
            setTimeout(() => {
                statusElement.textContent = '';
                statusElement.className = 'save-status';
            }, 3000);
        }
    }

    updatePageTitle(title) {
        document.title = `${title} — Ink & Pages Admin`;
    }

    // Warn about unsaved changes when leaving
    setupUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }
}

// Initialize admin manager when DOM is loaded
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for Firebase to be initialized
        const checkFirebase = () => {
            if (window.db) {
                window.adminManager = new FirestoreAdminManager();
                window.blogManager = window.adminManager; // For compatibility
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

export default FirestoreAdminManager;