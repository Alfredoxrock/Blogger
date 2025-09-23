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
    collection,
    query,
    where,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Firebase configuration (same as in firebase.js)
const firebaseConfig = {
    apiKey: "AIzaSyB8h9-H9fE8Gv2uZqKx8Yp7Q5lJ0mN3rF4",
    authDomain: "dreamlogtogether.firebaseapp.com",
    projectId: "dreamlogtogether",
    storageBucket: "dreamlogtogether.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012"
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
        ADMIN: 'admin',
        EDITOR: 'editor',
        CONTRIBUTOR: 'contributor',
        USER: 'user'
    };

    // Role permissions
    PERMISSIONS = {
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
        return this.userRole === this.USER_ROLES.ADMIN ||
            this.userRole === this.USER_ROLES.EDITOR ||
            this.userRole === this.USER_ROLES.CONTRIBUTOR;
    }
}

// Create global auth service instance
window.authService = new AuthService();

export default window.authService;