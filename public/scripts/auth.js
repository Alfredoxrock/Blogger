// Authentication Service Module using Firebase compat libraries

class AuthService {
    constructor() {
        // Use global Firebase instances from firebase.js
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.googleProvider = new firebase.auth.GoogleAuthProvider();
        this.currentUser = null;
        this.userRole = null;

        // Listen for auth state changes
        this.auth.onAuthStateChanged(async (user) => {
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
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({ displayName });

            // Create user document in Firestore
            console.log('Creating user document for:', user.uid, {
                email: user.email,
                displayName: displayName,
                role: role,
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date()
            });

            const createResult = await this.createUserDocument(user.uid, {
                email: user.email,
                displayName: displayName,
                role: role,
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date()
            });

            if (!createResult.success) {
                console.error('Failed to create user document:', createResult.error);
                throw new Error('Failed to create user profile: ' + createResult.error);
            }

            console.log('User document created successfully for:', user.uid);

            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign in user
    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);

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
            const result = await this.auth.signInWithPopup(this.googleProvider);
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
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    // Create user document in Firestore
    async createUserDocument(uid, userData) {
        try {
            console.log('Attempting to create user document:', uid, userData);
            await this.db.collection('users').doc(uid).set(userData);
            console.log('User document created successfully in Firestore for:', uid);
            return { success: true };
        } catch (error) {
            console.error('Error creating user document:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                uid: uid,
                userData: userData
            });
            return { success: false, error: error.message };
        }
    }

    // Update user document
    async updateUserDocument(uid, updates) {
        try {
            await this.db.collection('users').doc(uid).update(updates);
            return { success: true };
        } catch (error) {
            console.error('Error updating user document:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user document
    async getUserDocument(uid) {
        try {
            const docRef = this.db.collection('users').doc(uid);
            const docSnap = await docRef.get();
            return docSnap.exists ? docSnap.data() : null;
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
            const usersRef = this.db.collection('users');
            const querySnapshot = await usersRef.get();
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
            await this.db.collection('users').doc(userId).update({ role: newRole });
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
            await this.db.collection('users').doc(userId).update({ isActive: false });
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
            const usersRef = this.db.collection('users');
            const q = usersRef.where('username', '==', username);
            const querySnapshot = await q.get();

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
            const usersRef = this.db.collection('users');
            const querySnapshot = await usersRef.get();
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

            await this.db.collection('users').doc(userId).update(updateData);
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
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const currentPermissions = userDoc.data().permissions || {};

            // Remove specified permissions
            permissionsToRevoke.forEach(permission => {
                delete currentPermissions[permission];
            });

            await this.db.collection('users').doc(userId).update({
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
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
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
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
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
            const postsRef = this.db.collection('posts');
            const querySnapshot = await postsRef.get();

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
            await this.db.collection('posts').doc(postId).delete();
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
            await this.db.collection('posts').doc(postId).update({
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

    // Petition Management Functions
    async submitWriterPetition(petitionData) {
        try {
            if (!this.currentUser) {
                throw new Error('You must be logged in to submit a petition');
            }

            // Check if user already has a pending petition
            const existingPetition = await this.db.collection('writer-petitions')
                .where('userId', '==', this.currentUser.uid)
                .where('status', '==', 'pending')
                .get();

            if (!existingPetition.empty) {
                throw new Error('You already have a pending petition');
            }

            // Submit new petition
            const petition = {
                ...petitionData,
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                status: 'pending',
                submittedAt: new Date(),
                reviewedAt: null,
                reviewedBy: null,
                reviewNotes: null
            };

            const docRef = await this.db.collection('writer-petitions').add(petition);
            return docRef.id;
        } catch (error) {
            console.error('Error submitting petition:', error);
            throw error;
        }
    }

    async getAllPetitions() {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            const petitionsSnapshot = await this.db.collection('writer-petitions').get();
            return petitionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting petitions:', error);
            throw error;
        }
    }

    async getPetitionsByStatus(status) {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            const petitionsSnapshot = await this.db.collection('writer-petitions')
                .where('status', '==', status)
                .get();

            return petitionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting petitions by status:', error);
            throw error;
        }
    }

    async getUserPetitions(userId) {
        try {
            const petitionsSnapshot = await this.db.collection('writer-petitions')
                .where('userId', '==', userId || this.currentUser.uid)
                .get();

            return petitionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting user petitions:', error);
            throw error;
        }
    }

    async approvePetition(petitionId, reviewNotes = null) {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            // Get petition data
            const petitionRef = this.db.collection('writer-petitions').doc(petitionId);
            const petitionDoc = await petitionRef.get();

            if (!petitionDoc.exists) {
                throw new Error('Petition not found');
            }

            const petitionData = petitionDoc.data();

            // Update petition status
            await petitionRef.update({
                status: 'approved',
                reviewedAt: new Date(),
                reviewedBy: this.currentUser.uid,
                reviewNotes: reviewNotes
            });

            // Promote user to contributor role
            const userRef = this.db.collection('users').doc(petitionData.userId);
            await userRef.update({
                role: 'contributor',
                roleUpdatedAt: new Date(),
                roleUpdatedBy: this.currentUser.uid
            });

            return true;
        } catch (error) {
            console.error('Error approving petition:', error);
            throw error;
        }
    }

    async rejectPetition(petitionId, reviewNotes = null) {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            const petitionRef = this.db.collection('writer-petitions').doc(petitionId);
            await petitionRef.update({
                status: 'rejected',
                reviewedAt: new Date(),
                reviewedBy: this.currentUser.uid,
                reviewNotes: reviewNotes
            });

            return true;
        } catch (error) {
            console.error('Error rejecting petition:', error);
            throw error;
        }
    }

    async getPetitionStats() {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            const allPetitions = await this.getAllPetitions();

            const stats = {
                total: allPetitions.length,
                pending: allPetitions.filter(p => p.status === 'pending').length,
                approved: allPetitions.filter(p => p.status === 'approved').length,
                rejected: allPetitions.filter(p => p.status === 'rejected').length,
                thisMonth: 0
            };

            // Calculate this month's approved
            const thisMonth = new Date();
            thisMonth.setDate(1);
            stats.thisMonth = allPetitions.filter(p =>
                p.status === 'approved' &&
                p.reviewedAt &&
                new Date(p.reviewedAt) >= thisMonth
            ).length;

            return stats;
        } catch (error) {
            console.error('Error getting petition stats:', error);
            throw error;
        }
    }

    async deletePetition(petitionId) {
        try {
            if (!this.userRole || this.userRole !== 'super_admin') {
                throw new Error('Insufficient permissions');
            }

            const petitionRef = this.db.collection('writer-petitions').doc(petitionId);
            await petitionRef.delete();
            return true;
        } catch (error) {
            console.error('Error deleting petition:', error);
            throw error;
        }
    }

    async canSubmitPetition() {
        try {
            if (!this.currentUser) {
                return { canSubmit: false, reason: 'Not logged in' };
            }

            // Check if user already has contributor role or higher
            if (this.userRole && ['contributor', 'editor', 'admin', 'super_admin'].includes(this.userRole)) {
                return { canSubmit: false, reason: 'Already has writer permissions' };
            }

            // Check for existing petitions
            const existingPetitions = await this.getUserPetitions();
            const pendingPetition = existingPetitions.find(p => p.status === 'pending');

            if (pendingPetition) {
                return { canSubmit: false, reason: 'Petition already pending review' };
            }

            const recentRejection = existingPetitions.find(p =>
                p.status === 'rejected' &&
                p.reviewedAt &&
                (new Date() - new Date(p.reviewedAt)) < (30 * 24 * 60 * 60 * 1000) // 30 days
            );

            if (recentRejection) {
                return { canSubmit: false, reason: 'Must wait 30 days after rejection to reapply' };
            }

            return { canSubmit: true, reason: null };
        } catch (error) {
            console.error('Error checking petition eligibility:', error);
            return { canSubmit: false, reason: 'Error checking eligibility' };
        }
    }

    // Manual function to create user document for existing Firebase Auth users
    async createMissingUserDocument(user, role = 'user') {
        try {
            if (!user) {
                throw new Error('No user provided');
            }

            console.log('Creating missing user document for:', user.uid);

            // Check if document already exists
            const existingDoc = await this.getUserDocument(user.uid);
            if (existingDoc) {
                console.log('User document already exists for:', user.uid);
                return { success: true, exists: true };
            }

            // Create the user document
            const userData = {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                role: role,
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date()
            };

            const result = await this.createUserDocument(user.uid, userData);
            return { success: result.success, error: result.error, exists: false };
        } catch (error) {
            console.error('Error creating missing user document:', error);
            return { success: false, error: error.message };
        }
    }

    // Function to sync all Firebase Auth users to Firestore
    async syncAllAuthUsers() {
        try {
            if (!this.isSuperAdmin()) {
                throw new Error('Only super admin can sync users');
            }

            console.log('Starting sync of Firebase Auth users to Firestore...');

            // This function would need to be called from Firebase Functions
            // as client-side code cannot list all auth users
            console.warn('Full user sync requires Firebase Admin SDK (server-side)');

            return { success: false, error: 'This function requires server-side implementation' };
        } catch (error) {
            console.error('Error syncing auth users:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global auth service instance
window.authService = new AuthService();

console.log('Authentication service initialized successfully');