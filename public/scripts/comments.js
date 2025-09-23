// Comments System Module
import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import authService from './auth.js';

class CommentsManager {
    constructor() {
        this.db = getFirestore();
        this.commentsCollection = collection(this.db, 'comments');
        this.unsubscribes = new Map(); // Track listeners for cleanup
    }

    // Load comments for a specific post
    loadComments(postId, callback) {
        // Unsubscribe from any existing listener for this post
        if (this.unsubscribes.has(postId)) {
            this.unsubscribes.get(postId)();
        }

        const q = query(
            this.commentsCollection,
            where('postId', '==', postId),
            where('status', '==', 'approved'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(comments);
        });

        this.unsubscribes.set(postId, unsubscribe);
        return unsubscribe;
    }

    // Add a new comment
    async addComment(postId, content, parentId = null) {
        if (!authService.isAuthenticated()) {
            throw new Error('You must be signed in to comment');
        }

        const user = authService.currentUser;
        const commentData = {
            postId: postId,
            content: content.trim(),
            authorId: user.uid,
            authorName: user.displayName || user.email.split('@')[0],
            authorEmail: user.email,
            parentId: parentId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'approved', // Auto-approve for now, can be changed to 'pending' for moderation
            likes: 0,
            likedBy: [],
            edited: false
        };

        try {
            const docRef = await addDoc(this.commentsCollection, commentData);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    }

    // Update a comment (only by author or moderators)
    async updateComment(commentId, newContent) {
        if (!authService.isAuthenticated()) {
            throw new Error('You must be signed in to edit comments');
        }

        try {
            const commentRef = doc(this.db, 'comments', commentId);
            await updateDoc(commentRef, {
                content: newContent.trim(),
                updatedAt: serverTimestamp(),
                edited: true
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating comment:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete a comment (only by author or moderators)
    async deleteComment(commentId) {
        if (!authService.isAuthenticated()) {
            throw new Error('You must be signed in to delete comments');
        }

        try {
            const commentRef = doc(this.db, 'comments', commentId);
            await deleteDoc(commentRef);
            return { success: true };
        } catch (error) {
            console.error('Error deleting comment:', error);
            return { success: false, error: error.message };
        }
    }

    // Like/unlike a comment
    async toggleLike(commentId, comment) {
        if (!authService.isAuthenticated()) {
            throw new Error('You must be signed in to like comments');
        }

        const userId = authService.currentUser.uid;
        const likedBy = comment.likedBy || [];
        const hasLiked = likedBy.includes(userId);

        try {
            const commentRef = doc(this.db, 'comments', commentId);

            if (hasLiked) {
                // Unlike
                await updateDoc(commentRef, {
                    likes: Math.max(0, (comment.likes || 0) - 1),
                    likedBy: likedBy.filter(id => id !== userId)
                });
            } else {
                // Like
                await updateDoc(commentRef, {
                    likes: (comment.likes || 0) + 1,
                    likedBy: [...likedBy, userId]
                });
            }

            return { success: true, liked: !hasLiked };
        } catch (error) {
            console.error('Error toggling like:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user can edit/delete comment
    canModifyComment(comment) {
        if (!authService.isAuthenticated()) return false;

        const userId = authService.currentUser.uid;
        return comment.authorId === userId || authService.hasPermission('canModerateComments');
    }

    // Format comment date
    formatDate(timestamp) {
        if (!timestamp) return 'Just now';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
            }
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Render comment HTML
    renderComment(comment, isReply = false) {
        const user = authService.currentUser;
        const canModify = this.canModifyComment(comment);
        const hasLiked = user && comment.likedBy && comment.likedBy.includes(user.uid);

        return `
            <div class="comment ${isReply ? 'comment-reply' : ''}" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <strong>${comment.authorName}</strong>
                        ${comment.edited ? '<span class="comment-edited">(edited)</span>' : ''}
                    </div>
                    <div class="comment-meta">
                        <span class="comment-date">${this.formatDate(comment.createdAt)}</span>
                        ${canModify ? `
                            <button class="comment-action edit-comment" data-comment-id="${comment.id}">Edit</button>
                            <button class="comment-action delete-comment" data-comment-id="${comment.id}">Delete</button>
                        ` : ''}
                    </div>
                </div>
                <div class="comment-content" data-comment-id="${comment.id}">
                    ${comment.content.replace(/\n/g, '<br>')}
                </div>
                <div class="comment-actions">
                    ${user ? `
                        <button class="comment-action like-comment ${hasLiked ? 'liked' : ''}" 
                                data-comment-id="${comment.id}">
                            👍 ${comment.likes || 0}
                        </button>
                        ${!isReply ? `
                            <button class="comment-action reply-comment" data-comment-id="${comment.id}">
                                Reply
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
                <div class="comment-reply-form" data-comment-id="${comment.id}" style="display: none;">
                    <textarea placeholder="Write a reply..." class="reply-textarea"></textarea>
                    <div class="reply-actions">
                        <button class="btn btn-sm submit-reply" data-parent-id="${comment.id}">Reply</button>
                        <button class="btn btn-sm cancel-reply">Cancel</button>
                    </div>
                </div>
                <div class="comment-edit-form" data-comment-id="${comment.id}" style="display: none;">
                    <textarea class="edit-textarea">${comment.content}</textarea>
                    <div class="edit-actions">
                        <button class="btn btn-sm save-edit" data-comment-id="${comment.id}">Save</button>
                        <button class="btn btn-sm cancel-edit">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Render comments section
    renderCommentsSection(postId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Create comments section HTML
        container.innerHTML = `
            <div class="comments-section">
                <div class="comments-header">
                    <h3>Comments</h3>
                    <span class="comments-count" id="commentsCount-${postId}">0 comments</span>
                </div>
                
                ${authService.isAuthenticated() ? `
                    <div class="comment-form">
                        <div class="comment-form-header">
                            <strong>Join the conversation</strong>
                            <span class="user-name">${authService.currentUser.displayName || authService.currentUser.email}</span>
                        </div>
                        <textarea id="commentContent-${postId}" 
                                  placeholder="Share your thoughts..."
                                  rows="3"></textarea>
                        <div class="comment-form-actions">
                            <button class="btn btn-primary" id="submitComment-${postId}">
                                Post Comment
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="comment-signin">
                        <p>Please <a href="login.html?returnUrl=${encodeURIComponent(window.location.href)}">sign in</a> to join the conversation.</p>
                    </div>
                `}
                
                <div class="comments-list" id="commentsList-${postId}">
                    <div class="comments-loading">Loading comments...</div>
                </div>
            </div>
        `;

        this.attachEventListeners(postId);
        this.loadComments(postId, (comments) => this.displayComments(postId, comments));
    }

    // Display comments in the list
    displayComments(postId, comments) {
        const commentsListEl = document.getElementById(`commentsList-${postId}`);
        const commentsCountEl = document.getElementById(`commentsCount-${postId}`);

        if (!commentsListEl) return;

        // Update count
        if (commentsCountEl) {
            const count = comments.length;
            commentsCountEl.textContent = `${count} comment${count !== 1 ? 's' : ''}`;
        }

        // Group comments by parent
        const topLevelComments = comments.filter(c => !c.parentId);
        const replies = comments.filter(c => c.parentId);

        if (topLevelComments.length === 0) {
            commentsListEl.innerHTML = '<div class="no-comments">No comments yet. Be the first to share your thoughts!</div>';
            return;
        }

        // Render comments
        let html = '';
        topLevelComments.forEach(comment => {
            html += this.renderComment(comment);

            // Add replies
            const commentReplies = replies.filter(r => r.parentId === comment.id);
            if (commentReplies.length > 0) {
                html += '<div class="comment-replies">';
                commentReplies.forEach(reply => {
                    html += this.renderComment(reply, true);
                });
                html += '</div>';
            }
        });

        commentsListEl.innerHTML = html;
        this.attachCommentActionListeners(postId);
    }

    // Attach event listeners for comment form
    attachEventListeners(postId) {
        const submitBtn = document.getElementById(`submitComment-${postId}`);
        const textarea = document.getElementById(`commentContent-${postId}`);

        if (submitBtn && textarea) {
            submitBtn.addEventListener('click', async () => {
                const content = textarea.value.trim();
                if (!content) return;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Posting...';

                const result = await this.addComment(postId, content);

                if (result.success) {
                    textarea.value = '';
                } else {
                    alert('Failed to post comment: ' + result.error);
                }

                submitBtn.disabled = false;
                submitBtn.textContent = 'Post Comment';
            });

            // Allow Ctrl+Enter to submit
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    submitBtn.click();
                }
            });
        }
    }

    // Attach event listeners for comment actions (like, reply, edit, delete)
    attachCommentActionListeners(postId) {
        const commentsList = document.getElementById(`commentsList-${postId}`);
        if (!commentsList) return;

        // Like buttons
        commentsList.querySelectorAll('.like-comment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;
                const comment = { likes: 0, likedBy: [] }; // Would get actual comment data

                const result = await this.toggleLike(commentId, comment);
                if (!result.success) {
                    alert('Failed to like comment: ' + result.error);
                }
            });
        });

        // Reply buttons
        commentsList.querySelectorAll('.reply-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                const replyForm = commentsList.querySelector(`.comment-reply-form[data-comment-id="${commentId}"]`);
                if (replyForm) {
                    replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
                }
            });
        });

        // Submit reply buttons
        commentsList.querySelectorAll('.submit-reply').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const parentId = e.target.dataset.parentId;
                const textarea = e.target.closest('.comment-reply-form').querySelector('.reply-textarea');
                const content = textarea.value.trim();

                if (!content) return;

                e.target.disabled = true;
                e.target.textContent = 'Posting...';

                const result = await this.addComment(postId, content, parentId);

                if (result.success) {
                    textarea.value = '';
                    e.target.closest('.comment-reply-form').style.display = 'none';
                } else {
                    alert('Failed to post reply: ' + result.error);
                }

                e.target.disabled = false;
                e.target.textContent = 'Reply';
            });
        });

        // Cancel reply buttons
        commentsList.querySelectorAll('.cancel-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const replyForm = e.target.closest('.comment-reply-form');
                replyForm.style.display = 'none';
                replyForm.querySelector('.reply-textarea').value = '';
            });
        });

        // Edit buttons
        commentsList.querySelectorAll('.edit-comment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.dataset.commentId;
                const editForm = commentsList.querySelector(`.comment-edit-form[data-comment-id="${commentId}"]`);
                const contentDiv = commentsList.querySelector(`.comment-content[data-comment-id="${commentId}"]`);

                if (editForm && contentDiv) {
                    editForm.style.display = 'block';
                    contentDiv.style.display = 'none';
                }
            });
        });

        // Save edit buttons
        commentsList.querySelectorAll('.save-edit').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;
                const textarea = e.target.closest('.comment-edit-form').querySelector('.edit-textarea');
                const content = textarea.value.trim();

                if (!content) return;

                e.target.disabled = true;
                e.target.textContent = 'Saving...';

                const result = await this.updateComment(commentId, content);

                if (result.success) {
                    const editForm = e.target.closest('.comment-edit-form');
                    const contentDiv = commentsList.querySelector(`.comment-content[data-comment-id="${commentId}"]`);

                    editForm.style.display = 'none';
                    contentDiv.style.display = 'block';
                } else {
                    alert('Failed to update comment: ' + result.error);
                }

                e.target.disabled = false;
                e.target.textContent = 'Save';
            });
        });

        // Cancel edit buttons
        commentsList.querySelectorAll('.cancel-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = e.target.closest('.comment-edit-form').dataset.commentId;
                const editForm = e.target.closest('.comment-edit-form');
                const contentDiv = commentsList.querySelector(`.comment-content[data-comment-id="${commentId}"]`);

                editForm.style.display = 'none';
                contentDiv.style.display = 'block';
            });
        });

        // Delete buttons
        commentsList.querySelectorAll('.delete-comment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const commentId = e.target.dataset.commentId;

                if (!confirm('Are you sure you want to delete this comment?')) return;

                const result = await this.deleteComment(commentId);

                if (!result.success) {
                    alert('Failed to delete comment: ' + result.error);
                }
            });
        });
    }

    // Cleanup listeners when leaving page
    cleanup() {
        this.unsubscribes.forEach(unsubscribe => unsubscribe());
        this.unsubscribes.clear();
    }
}

// Create global comments manager instance
window.commentsManager = new CommentsManager();

export default window.commentsManager;