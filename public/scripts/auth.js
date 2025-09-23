// Authentication Service Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Firebase configuration (same as in firebase.js)
const firebaseConfig = {
    apiKey: "AIzaSyDhvGnJ1QJgZsIrCy6E5tgiF7BbC66Xv9g",
    authDomain: "dreamworld-f7a4b.firebaseapp.com",
    projectId: "dreamworld-f7a4b",
    storageBucket: "dreamworld-f7a4b.firebasestorage.app",
    messagingSenderId: "330382191425",
    appId: "1:330382191425:web:501903d678634f5eab4fc0",
    measurementId: "G-0ZCDVMLP7B"
};

class AuthService {
    constructor() {
        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
        this.googleProvider = new GoogleAuthProvider();
        this.currentUser = null;
        this.userRole = null;

        // Listen for auth state changes
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserRole();
                this.onAuthStateChange(user, this.userRole);
            } else {
                this.currentUser = null;
                this.userRole = null;
                this.onAuthStateChange(null, null);
            }
        });
    }

    // Auth state change callback (to be overridden by pages)
    onAuthStateChange(user, role) {
        // Override this method in individual pages
        console.log('Auth state changed:', user ? user.email : 'Not signed in', 'Role:', role);
    }

    // User Roles
    USER_ROLES = {
        SUPER_ADMIN: 'super_admin',
        ADMIN: 'admin',
        EDITOR: 'editor',
        CONTRIBUTOR: 'contributor',
        USER: 'user'
    };

    // Role permissions
    PERMISSIONS = {
        [this.USER_ROLES.SUPER_ADMIN]: {
            canCreatePosts: true,
            canEditAllPosts: true,
            canDeleteAllPosts: true,
            canManageUsers: true,
            canModerateComments: true,
            canManageCategories: true,
            canViewDrafts: true,
            canPublishPosts: true,
            canManageRoles: true,
            canAccessAdminPanel: true,
            canManageSiteSettings: true,
            canViewAnalytics: true,
            canManageBackups: true,
            isSuperAdmin: true
        },
        [this.USER_ROLES.ADMIN]: {
            canCreatePosts: true,
            canEditAllPosts: true,
            canDeleteAllPosts: true,
            canManageUsers: true,
            canModerateComments: true,
            canManageCategories: true,
            canViewDrafts: true,
            canPublishPosts: true
        },
        [this.USER_ROLES.EDITOR]: {
            canCreatePosts: true,
            canEditAllPosts: true,
            canDeleteOwnPosts: true,
            canManageUsers: false,
            canModerateComments: true,
            canManageCategories: true,
            canViewDrafts: true,
            canPublishPosts: true
        },
        [this.USER_ROLES.CONTRIBUTOR]: {
            canCreatePosts: true,
            canEditOwnPosts: true,
            canDeleteOwnPosts: false,
            canManageUsers: false,
            canModerateComments: false,
            canManageCategories: false,
            canViewDrafts: false,
            canPublishPosts: false
        },
        [this.USER_ROLES.USER]: {
            canCreatePosts: false,
            canEditAllPosts: false,
            canDeleteAllPosts: false,
            canManageUsers: false,
            canModerateComments: false,
            canManageCategories: false,
            canViewDrafts: false,
            canPublishPosts: false
        }
    };

    // Register new user
    async register(email, password, displayName, role = this.USER_ROLES.USER) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, { displayName });

            // Create user document in Firestore
            await this.createUserDocument(user.uid, {
                email: user.email,
                displayName: displayName,
                role: role,
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date()
            });

            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign in user
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

            // Update last login
            await this.updateUserDocument(userCredential.user.uid, {
                lastLogin: new Date()
            });

            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(this.auth, this.googleProvider);
            const user = result.user;

            // Check if user document exists, create if not
            const userDoc = await this.getUserDocument(user.uid);
            if (!userDoc) {
                await this.createUserDocument(user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    role: this.USER_ROLES.USER,
                    createdAt: new Date(),
                    isActive: true,
                    lastLogin: new Date(),
                    provider: 'google'
                });
            } else {
                // Update last login
                await this.updateUserDocument(user.uid, {
                    lastLogin: new Date()
                });
            }

            return { success: true, user };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign out user
    async signOut() {
        try {
            await signOut(this.auth);
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    // Create user document in Firestore
    async createUserDocument(uid, userData) {
        try {
            await setDoc(doc(this.db, 'users', uid), userData);
            return { success: true };
        } catch (error) {
            console.error('Error creating user document:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user document
    async updateUserDocument(uid, updates) {
        try {
            await updateDoc(doc(this.db, 'users', uid), updates);
            return { success: true };
        } catch (error) {
            console.error('Error updating user document:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user document
    async getUserDocument(uid) {
        try {
            const docRef = doc(this.db, 'users', uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        } catch (error) {
            console.error('Error getting user document:', error);
            return null;
        }
    }

    // Load current user's role
    async loadUserRole() {
        if (this.currentUser) {
            const userData = await this.getUserDocument(this.currentUser.uid);
            this.userRole = userData ? userData.role : this.USER_ROLES.USER;
        }
    }

    // Check if user has permission
    hasPermission(permission) {
        if (!this.userRole) return false;
        return this.PERMISSIONS[this.userRole]?.[permission] || false;
    }

    // Check if user can edit specific post
    canEditPost(post) {
        if (!this.currentUser) return false;

        if (this.hasPermission('canEditAllPosts')) return true;
        if (this.hasPermission('canEditOwnPosts') && post.authorId === this.currentUser.uid) return true;

        return false;
    }

    // Check if user can delete specific post
    canDeletePost(post) {
        if (!this.currentUser) return false;

        if (this.hasPermission('canDeleteAllPosts')) return true;
        if (this.hasPermission('canDeleteOwnPosts') && post.authorId === this.currentUser.uid) return true;

        return false;
    }

    // Get all users (admin only)
    async getAllUsers() {
        if (!this.hasPermission('canManageUsers')) {
            throw new Error('Insufficient permissions');
        }

        try {
            const usersRef = collection(this.db, 'users');
            const querySnapshot = await getDocs(usersRef);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    // Update user role (admin only)
    async updateUserRole(userId, newRole) {
        if (!this.hasPermission('canManageUsers')) {
            throw new Error('Insufficient permissions');
        }

        try {
            await updateDoc(doc(this.db, 'users', userId), { role: newRole });
            return { success: true };
        } catch (error) {
            console.error('Error updating user role:', error);
            return { success: false, error: error.message };
        }
    }

    // Deactivate user (admin only)
    async deactivateUser(userId) {
        if (!this.hasPermission('canManageUsers')) {
            throw new Error('Insufficient permissions');
        }

        try {
            await updateDoc(doc(this.db, 'users', userId), { isActive: false });
            return { success: true };
        } catch (error) {
            console.error('Error deactivating user:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user display info
    getUserDisplayInfo() {
        if (!this.currentUser) return null;

        return {
            uid: this.currentUser.uid,
            email: this.currentUser.email,
            displayName: this.currentUser.displayName,
            role: this.userRole,
            isAuthenticated: true
        };
    }

    // Utility method to format role for display
    formatRole(role) {
        const roleNames = {
            [this.USER_ROLES.SUPER_ADMIN]: 'Super Administrator',
            [this.USER_ROLES.ADMIN]: 'Administrator',
            [this.USER_ROLES.EDITOR]: 'Editor',
            [this.USER_ROLES.CONTRIBUTOR]: 'Contributor',
            [this.USER_ROLES.USER]: 'User'
        };
        return roleNames[role] || 'User';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Check if user is admin
    isAdmin() {
        return this.userRole === this.USER_ROLES.ADMIN;
    }

    // Check if user is editor or above
    isEditorOrAbove() {
        return this.userRole === this.USER_ROLES.ADMIN || this.userRole === this.USER_ROLES.EDITOR;
    }

    // Check if user is contributor or above
    isContributorOrAbove() {
        return this.userRole === this.USER_ROLES.SUPER_ADMIN ||
            this.userRole === this.USER_ROLES.ADMIN ||
            this.userRole === this.USER_ROLES.EDITOR ||
            this.userRole === this.USER_ROLES.CONTRIBUTOR;
    }

    // Check if user is super admin
    isSuperAdmin() {
        return this.userRole === this.USER_ROLES.SUPER_ADMIN;
    }

    // Sign in with username support (for super user)
    async signInWithUsername(username, password) {
        try {
            // Special handling for super user
            if (username === 'Alfredoxrock') {
                const email = 'alfredoxrock@dreamlog.com';
                const result = await this.signIn(email, password);
                return result;
            }

            // For other users, try to find by username
            const usersRef = collection(this.db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, error: 'Username not found' };
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Try to sign in with the found email
            return await this.signIn(userData.email, password);

        } catch (error) {
            console.error('Username sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all users with enhanced info (super admin only)
    async getAllUsersDetailed() {
        if (!this.isSuperAdmin() && !this.hasPermission('canManageUsers')) {
            throw new Error('Insufficient permissions');
        }

        try {
            const usersRef = collection(this.db, 'users');
            const querySnapshot = await getDocs(usersRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Add role display name
                roleDisplay: this.formatRole(doc.data().role)
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    // Grant role to user (super admin only)
    async grantRole(userId, newRole, permissions = null) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can grant roles');
        }

        try {
            const updateData = {
                role: newRole,
                updatedAt: new Date(),
                updatedBy: this.currentUser.uid
            };

            // If custom permissions provided, use them; otherwise use default role permissions
            if (permissions) {
                updateData.permissions = permissions;
            } else {
                updateData.permissions = this.PERMISSIONS[newRole] || this.PERMISSIONS[this.USER_ROLES.USER];
            }

            await updateDoc(doc(this.db, 'users', userId), updateData);
            return { success: true };
        } catch (error) {
            console.error('Error granting role:', error);
            return { success: false, error: error.message };
        }
    }

    // Revoke permissions from user (super admin only)
    async revokePermissions(userId, permissionsToRevoke) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can revoke permissions');
        }

        try {
            const userDoc = await getDoc(doc(this.db, 'users', userId));
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const currentPermissions = userDoc.data().permissions || {};

            // Remove specified permissions
            permissionsToRevoke.forEach(permission => {
                delete currentPermissions[permission];
            });

            await updateDoc(doc(this.db, 'users', userId), {
                permissions: currentPermissions,
                updatedAt: new Date(),
                updatedBy: this.currentUser.uid
            });

            return { success: true };
        } catch (error) {
            console.error('Error revoking permissions:', error);
            return { success: false, error: error.message };
        }
    }

    // Promote user to next role level (super admin only)
    async promoteUser(userId) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can promote users');
        }

        try {
            const userDoc = await getDoc(doc(this.db, 'users', userId));
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const currentRole = userDoc.data().role;
            let newRole;

            // Define promotion hierarchy
            switch (currentRole) {
                case this.USER_ROLES.USER:
                    newRole = this.USER_ROLES.CONTRIBUTOR;
                    break;
                case this.USER_ROLES.CONTRIBUTOR:
                    newRole = this.USER_ROLES.EDITOR;
                    break;
                case this.USER_ROLES.EDITOR:
                    newRole = this.USER_ROLES.ADMIN;
                    break;
                case this.USER_ROLES.ADMIN:
                    // Only super admin can promote to super admin (but we won't allow this normally)
                    throw new Error('Cannot promote admin further');
                default:
                    throw new Error('Invalid current role');
            }

            return await this.grantRole(userId, newRole);
        } catch (error) {
            console.error('Error promoting user:', error);
            return { success: false, error: error.message };
        }
    }

    // Demote user to lower role level (super admin only)
    async demoteUser(userId) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can demote users');
        }

        try {
            const userDoc = await getDoc(doc(this.db, 'users', userId));
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }

            const currentRole = userDoc.data().role;
            let newRole;

            // Define demotion hierarchy
            switch (currentRole) {
                case this.USER_ROLES.ADMIN:
                    newRole = this.USER_ROLES.EDITOR;
                    break;
                case this.USER_ROLES.EDITOR:
                    newRole = this.USER_ROLES.CONTRIBUTOR;
                    break;
                case this.USER_ROLES.CONTRIBUTOR:
                    newRole = this.USER_ROLES.USER;
                    break;
                case this.USER_ROLES.USER:
                    throw new Error('Cannot demote user further');
                case this.USER_ROLES.SUPER_ADMIN:
                    throw new Error('Cannot demote super admin');
                default:
                    throw new Error('Invalid current role');
            }

            return await this.grantRole(userId, newRole);
        } catch (error) {
            console.error('Error demoting user:', error);
            return { success: false, error: error.message };
        }
    }

    // Posts Management Functions (Super Admin)
    async getAllPosts() {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can access all posts');
        }

        try {
            const postsRef = collection(this.db, 'posts');
            const querySnapshot = await getDocs(postsRef);

            const posts = [];
            querySnapshot.forEach((doc) => {
                posts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return posts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        } catch (error) {
            console.error('Error fetching all posts:', error);
            throw error;
        }
    }

    // Delete any post (Super Admin only)
    async deletePost(postId) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can delete any post');
        }

        try {
            await deleteDoc(doc(this.db, 'posts', postId));
            return { success: true, message: 'Post deleted successfully' };
        } catch (error) {
            console.error('Error deleting post:', error);
            return { success: false, error: error.message };
        }
    }

    // Update post status (Super Admin)
    async updatePostStatus(postId, status) {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can update post status');
        }

        try {
            await updateDoc(doc(this.db, 'posts', postId), {
                status: status,
                updatedAt: new Date()
            });
            return { success: true, message: 'Post status updated successfully' };
        } catch (error) {
            console.error('Error updating post status:', error);
            return { success: false, error: error.message };
        }
    }

    // Get post analytics (Super Admin)
    async getPostAnalytics() {
        if (!this.isSuperAdmin()) {
            throw new Error('Only super admin can access post analytics');
        }

        try {
            const posts = await this.getAllPosts();

            const analytics = {
                totalPosts: posts.length,
                publishedPosts: posts.filter(p => p.status === 'published').length,
                draftPosts: posts.filter(p => p.status === 'draft').length,
                pendingPosts: posts.filter(p => p.status === 'pending').length,
                totalViews: posts.reduce((sum, post) => sum + (post.views || 0), 0),
                totalComments: posts.reduce((sum, post) => sum + (post.commentCount || 0), 0),
                postsByAuthor: {}
            };

            // Group posts by author
            posts.forEach(post => {
                const author = post.authorName || 'Unknown';
                if (!analytics.postsByAuthor[author]) {
                    analytics.postsByAuthor[author] = 0;
                }
                analytics.postsByAuthor[author]++;
            });

            return analytics;
        } catch (error) {
            console.error('Error getting post analytics:', error);
            throw error;
        }
    }
}

// Create global auth service instance
window.authService = new AuthService();

export default window.authService;