// Admin panel functionality for Ink & Pages
class AdminManager {
    constructor() {
        this.currentPostId = null;
        this.isEditing = false;
        this.autoSaveInterval = null;
        this.undoStack = [];
        this.redoStack = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupEditor();
        this.renderPostsTable();
        this.checkForEditMode();
        this.startAutoSave();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('postForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePost();
        });

        // Editor actions
        document.getElementById('publishBtn')?.addEventListener('click', () => this.publishPost());
        document.getElementById('saveDraftBtn')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('previewBtn')?.addEventListener('click', () => this.previewPost());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.cancelEdit());

        // Management actions
        document.getElementById('newPostBtn')?.addEventListener('click', () => this.newPost());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportPosts());
        document.getElementById('importBtn')?.addEventListener('click', () => this.importPosts());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.handleImportFile(e));

        // Search and filter
        document.getElementById('managementSearch')?.addEventListener('input', (e) => {
            this.filterPosts(e.target.value);
        });
        document.getElementById('managementFilter')?.addEventListener('change', (e) => {
            this.filterPostsByStatus(e.target.value);
        });

        // Preview modal
        document.getElementById('closePreview')?.addEventListener('click', () => this.closePreview());

        // Delete modal
        document.getElementById('cancelDelete')?.addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDelete')?.addEventListener('click', () => this.confirmDelete());

        // Auto-generate slug from title
        document.getElementById('postTitle')?.addEventListener('input', (e) => {
            this.generateSlug(e.target.value);
        });

        // Set default date
        const dateInput = document.getElementById('postDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().slice(0, 10);
        }
    }

    setupEditor() {
        const toolbar = document.querySelector('.editor-toolbar');
        const textarea = document.getElementById('postBody');

        if (!toolbar || !textarea) return;

        // Editor toolbar functionality
        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('editor-btn')) {
                const action = e.target.dataset.action;
                this.executeEditorAction(action, textarea);
            }
        });

        // Word count and reading time
        textarea.addEventListener('input', () => {
            this.updateEditorMeta();
            this.saveToUndoStack();
        });

        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e, textarea);
        });

        // Initial meta update
        this.updateEditorMeta();
    }

    executeEditorAction(action, textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);

        let newText = '';
        let newCursorPos = start;

        switch (action) {
            case 'bold':
                newText = `**${selectedText || 'bold text'}**`;
                newCursorPos = selectedText ? end + 4 : start + 2;
                break;
            case 'italic':
                newText = `*${selectedText || 'italic text'}*`;
                newCursorPos = selectedText ? end + 2 : start + 1;
                break;
            case 'heading':
                newText = `\n## ${selectedText || 'Heading'}\n`;
                newCursorPos = selectedText ? end + 5 : start + 3;
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    newText = `[${selectedText || 'link text'}](${url})`;
                    newCursorPos = selectedText ? end + url.length + 4 : start + 1;
                } else {
                    return;
                }
                break;
            case 'quote':
                newText = `\n> ${selectedText || 'Quote'}\n`;
                newCursorPos = selectedText ? end + 4 : start + 2;
                break;
            case 'list':
                newText = `\n- ${selectedText || 'List item'}\n`;
                newCursorPos = selectedText ? end + 4 : start + 2;
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    newText = `\n\`\`\`\n${selectedText || 'code'}\n\`\`\`\n`;
                    newCursorPos = selectedText ? end + 8 : start + 4;
                } else {
                    newText = `\`${selectedText || 'code'}\``;
                    newCursorPos = selectedText ? end + 2 : start + 1;
                }
                break;
            case 'undo':
                this.undo(textarea);
                return;
            case 'redo':
                this.redo(textarea);
                return;
        }

        textarea.value = beforeText + newText + afterText;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
        this.updateEditorMeta();
    }

    handleKeyboardShortcuts(e, textarea) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault();
                    this.executeEditorAction('bold', textarea);
                    break;
                case 'i':
                    e.preventDefault();
                    this.executeEditorAction('italic', textarea);
                    break;
                case 's':
                    e.preventDefault();
                    this.saveDraft();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.publishPost();
                    break;
                case 'z':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.redo(textarea);
                    } else {
                        e.preventDefault();
                        this.undo(textarea);
                    }
                    break;
            }
        }
    }

    updateEditorMeta() {
        const textarea = document.getElementById('postBody');
        const wordCountEl = document.getElementById('wordCount');
        const readTimeEl = document.getElementById('readTime');
        const charCountEl = document.getElementById('charCount');

        if (!textarea) return;

        const text = textarea.value;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        const readTime = Math.max(1, Math.round(words / 200));

        if (wordCountEl) wordCountEl.textContent = `${words} words`;
        if (readTimeEl) readTimeEl.textContent = `${readTime} min read`;
        if (charCountEl) charCountEl.textContent = `${chars} characters`;
    }

    saveToUndoStack() {
        const textarea = document.getElementById('postBody');
        if (!textarea) return;

        this.undoStack.push(textarea.value);
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo(textarea) {
        if (this.undoStack.length > 1) {
            this.redoStack.push(this.undoStack.pop());
            textarea.value = this.undoStack[this.undoStack.length - 1] || '';
            this.updateEditorMeta();
        }
    }

    redo(textarea) {
        if (this.redoStack.length > 0) {
            const value = this.redoStack.pop();
            this.undoStack.push(value);
            textarea.value = value;
            this.updateEditorMeta();
        }
    }

    generateSlug(title) {
        const slugInput = document.getElementById('postSlug');
        if (!slugInput || slugInput.value) return; // Don't override manual input

        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        slugInput.value = slug;
    }

    newPost() {
        this.currentPostId = null;
        this.isEditing = false;
        this.clearForm();
        document.getElementById('editorTitle').textContent = 'Write New Post';
        document.getElementById('cancelBtn').style.display = 'none';
        this.updateEditorMeta();
    }

    editPost(id) {
        const post = blogManager.getPost(id);
        if (!post) return;

        this.currentPostId = id;
        this.isEditing = true;
        this.populateForm(post);
        document.getElementById('editorTitle').textContent = 'Edit Post';
        document.getElementById('cancelBtn').style.display = 'inline-block';
        this.updateEditorMeta();
    }

    populateForm(post) {
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('postSlug').value = post.slug || '';
        document.getElementById('postCategory').value = post.category || '';
        document.getElementById('postTags').value = (post.tags || []).join(', ');
        document.getElementById('postDate').value = post.date || '';
        document.getElementById('postStatus').value = post.status || 'draft';
        document.getElementById('postExcerpt').value = post.excerpt || '';
        document.getElementById('postBody').value = post.body || '';
        document.getElementById('postFeatured').checked = post.featured || false;
        document.getElementById('postComments').checked = post.allowComments !== false;
    }

    clearForm() {
        document.getElementById('postForm').reset();
        const dateInput = document.getElementById('postDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().slice(0, 10);
        }
        document.getElementById('postStatus').value = 'draft';
        document.getElementById('postComments').checked = true;
    }

    getFormData() {
        const form = document.getElementById('postForm');
        const formData = new FormData(form);

        return {
            title: formData.get('title').trim(),
            slug: formData.get('slug').trim(),
            category: formData.get('category'),
            tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(Boolean),
            date: formData.get('date'),
            status: formData.get('status'),
            excerpt: formData.get('excerpt').trim(),
            body: formData.get('body').trim(),
            featured: formData.has('featured'),
            allowComments: formData.has('allowComments'),
            readTime: this.calculateReadTime(formData.get('body'))
        };
    }

    calculateReadTime(text) {
        if (!text) return 1;
        const words = text.trim().split(/\s+/).length;
        return Math.max(1, Math.round(words / 200));
    }

    saveDraft() {
        const postData = this.getFormData();
        postData.status = 'draft';
        this.savePost(postData);
    }

    publishPost() {
        const postData = this.getFormData();

        if (!postData.title) {
            alert('Please enter a post title.');
            return;
        }

        if (!postData.body) {
            alert('Please enter post content.');
            return;
        }

        postData.status = 'published';
        if (!postData.date) {
            postData.date = new Date().toISOString().slice(0, 10);
        }

        this.savePost(postData);
    }

    savePost(postData = null) {
        if (!postData) {
            postData = this.getFormData();
        }

        if (!postData.title) {
            alert('Please enter a post title.');
            return;
        }

        try {
            if (this.isEditing && this.currentPostId) {
                blogManager.updatePost(this.currentPostId, postData);
                this.showNotification('Post updated successfully!');
            } else {
                const newPost = blogManager.addPost(postData);
                this.currentPostId = newPost.id;
                this.isEditing = true;
                this.showNotification('Post saved successfully!');
            }

            this.renderPostsTable();
            document.getElementById('editorTitle').textContent = 'Edit Post';
            document.getElementById('cancelBtn').style.display = 'inline-block';
        } catch (error) {
            console.error('Error saving post:', error);
            this.showNotification('Error saving post. Please try again.', 'error');
        }
    }

    cancelEdit() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            this.newPost();
        }
    }

    previewPost() {
        const postData = this.getFormData();

        if (!postData.title || !postData.body) {
            alert('Please enter a title and content to preview.');
            return;
        }

        const previewContent = document.getElementById('previewContent');
        if (!previewContent) return;

        // Convert markdown-like syntax to HTML for preview
        let html = this.markdownToHtml(postData.body);

        previewContent.innerHTML = `
      <h1>${blogManager.escapeHtml(postData.title)}</h1>
      <div class="meta" style="margin-bottom: var(--spacing-md);">
        ${postData.date ? blogManager.formatDate(postData.date) : 'Draft'} · 
        ${postData.readTime} min read
        ${postData.category ? ` · ${postData.category}` : ''}
        ${postData.tags.length ? ` · ${postData.tags.join(', ')}` : ''}
      </div>
      ${postData.excerpt ? `<div class="excerpt" style="font-style: italic; margin-bottom: var(--spacing-md);">${blogManager.escapeHtml(postData.excerpt)}</div>` : ''}
      <div class="content">${html}</div>
    `;

        document.getElementById('previewOverlay').classList.add('show');
    }

    markdownToHtml(text) {
        return blogManager.escapeHtml(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gim, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    closePreview() {
        document.getElementById('previewOverlay').classList.remove('show');
    }

    renderPostsTable() {
        const tbody = document.getElementById('postsTableBody');
        if (!tbody || !blogManager) return;

        const posts = [...blogManager.posts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        tbody.innerHTML = '';

        if (posts.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--muted); padding: var(--spacing-lg);">
            No posts yet. Create your first post!
          </td>
        </tr>
      `;
            return;
        }

        posts.forEach(post => {
            const row = document.createElement('tr');
            row.innerHTML = `
        <td>
          <a href="#" class="post-title" onclick="adminManager.editPost('${post.id}')">${blogManager.escapeHtml(post.title)}</a>
          ${post.featured ? '<span style="color: var(--accent); margin-left: 8px;">★</span>' : ''}
        </td>
        <td>${post.category || 'Uncategorized'}</td>
        <td><span class="post-status ${post.status || 'draft'}">${post.status || 'draft'}</span></td>
        <td>${blogManager.formatDate(post.date)}</td>
        <td class="post-actions">
          <button class="btn btn-small" onclick="adminManager.editPost('${post.id}')">Edit</button>
          <button class="btn btn-small" onclick="blogManager.viewPost('${post.id}')">View</button>
          <button class="btn btn-small btn-danger" onclick="adminManager.deletePost('${post.id}')">Delete</button>
        </td>
      `;
            tbody.appendChild(row);
        });
    }

    filterPosts(searchTerm) {
        const rows = document.querySelectorAll('#postsTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    filterPostsByStatus(status) {
        const rows = document.querySelectorAll('#postsTableBody tr');
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
                return;
            }

            const statusElement = row.querySelector('.post-status');
            if (statusElement) {
                const matches = statusElement.textContent.toLowerCase() === status.toLowerCase();
                row.style.display = matches ? '' : 'none';
            }
        });
    }

    deletePost(id) {
        this.postToDelete = id;
        document.getElementById('deleteModal').classList.add('show');
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('show');
        this.postToDelete = null;
    }

    confirmDelete() {
        if (this.postToDelete) {
            blogManager.deletePost(this.postToDelete);
            this.renderPostsTable();
            this.closeDeleteModal();

            if (this.currentPostId === this.postToDelete) {
                this.newPost();
            }

            this.showNotification('Post deleted successfully!');
        }
    }

    exportPosts() {
        blogManager.exportPosts();
        this.showNotification('Posts exported successfully!');
    }

    importPosts() {
        document.getElementById('importFile').click();
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (file) {
            blogManager.importPosts(file);
            this.renderPostsTable();
            event.target.value = ''; // Reset file input
        }
    }

    checkForEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');

        if (editId) {
            setTimeout(() => {
                this.editPost(editId);
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
            }, 100);
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.isEditing && this.currentPostId) {
                const postData = this.getFormData();
                if (postData.title || postData.body) {
                    try {
                        blogManager.updatePost(this.currentPostId, postData);
                        console.log('Auto-saved at', new Date().toLocaleTimeString());
                    } catch (error) {
                        console.error('Auto-save failed:', error);
                    }
                }
            }
        }, 30000); // Auto-save every 30 seconds
    }

    showNotification(message, type = 'success') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc2626' : '#059669'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize admin manager when DOM is loaded
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    // Wait for blogManager to be ready
    setTimeout(() => {
        if (window.blogManager) {
            adminManager = new AdminManager();
            window.adminManager = adminManager;
        }
    }, 100);
});

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(notificationStyles);