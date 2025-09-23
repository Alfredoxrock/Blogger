// Super User Initialization Script
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhvGnJ1QJgZsIrCy6E5tgiF7BbC66Xv9g",
    authDomain: "dreamworld-f7a4b.firebaseapp.com",
    projectId: "dreamworld-f7a4b",
    storageBucket: "dreamworld-f7a4b.firebasestorage.app",
    messagingSenderId: "330382191425",
    appId: "1:330382191425:web:501903d678634f5eab4fc0",
    measurementId: "G-0ZCDVMLP7B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Super user credentials
const SUPER_USER = {
    username: 'Alfredoxrock',
    email: 'alfredoxrock@dreamlog.com', // Using a domain-based email
    password: '1936413gjhfa78d6',
    displayName: 'Alfred (Super Admin)',
    role: 'super_admin'
};

class SuperUserInitializer {
    async initialize() {
        console.log('🚀 Initializing Super User...');

        try {
            // Check if super user already exists
            const existingSuperUser = await this.checkExistingSuperUser();

            if (existingSuperUser) {
                console.log('✅ Super user already exists');
                return { success: true, message: 'Super user already initialized' };
            }

            // Create super user account
            const result = await this.createSuperUser();

            if (result.success) {
                console.log('✅ Super user created successfully');
                return { success: true, message: 'Super user initialized successfully' };
            } else {
                console.error('❌ Failed to create super user:', result.error);
                return { success: false, error: result.error };
            }

        } catch (error) {
            console.error('❌ Super user initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    async checkExistingSuperUser() {
        try {
            // Try to find existing super user document
            const superUserDoc = await getDoc(doc(db, 'users', 'super_admin'));
            return superUserDoc.exists();
        } catch (error) {
            console.log('No existing super user found');
            return false;
        }
    }

    async createSuperUser() {
        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                SUPER_USER.email,
                SUPER_USER.password
            );

            const user = userCredential.user;

            // Update display name
            await updateProfile(user, {
                displayName: SUPER_USER.displayName
            });

            // Create super user document in Firestore with special ID
            await setDoc(doc(db, 'users', 'super_admin'), {
                uid: user.uid,
                email: SUPER_USER.email,
                displayName: SUPER_USER.displayName,
                username: SUPER_USER.username,
                role: SUPER_USER.role,
                permissions: {
                    // Super admin has ALL permissions
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
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date(),
                isSuperUser: true
            });

            // Also create regular user document with uid as key
            await setDoc(doc(db, 'users', user.uid), {
                email: SUPER_USER.email,
                displayName: SUPER_USER.displayName,
                username: SUPER_USER.username,
                role: SUPER_USER.role,
                permissions: {
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
                createdAt: new Date(),
                isActive: true,
                lastLogin: new Date(),
                isSuperUser: true
            });

            return { success: true, user };

        } catch (error) {
            console.error('Error creating super user:', error);

            // If user already exists with this email, that's okay
            if (error.code === 'auth/email-already-in-use') {
                console.log('Email already in use, trying to sign in instead...');

                try {
                    // Try to sign in with existing credentials
                    const signInResult = await signInWithEmailAndPassword(
                        auth,
                        SUPER_USER.email,
                        SUPER_USER.password
                    );

                    // Update the user document to ensure super admin permissions
                    await setDoc(doc(db, 'users', signInResult.user.uid), {
                        email: SUPER_USER.email,
                        displayName: SUPER_USER.displayName,
                        username: SUPER_USER.username,
                        role: SUPER_USER.role,
                        permissions: {
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
                        updatedAt: new Date(),
                        isActive: true,
                        lastLogin: new Date(),
                        isSuperUser: true
                    }, { merge: true });

                    return { success: true, user: signInResult.user };
                } catch (signInError) {
                    return { success: false, error: signInError.message };
                }
            }

            return { success: false, error: error.message };
        }
    }
}

// Function to initialize super user (can be called from console or on page load)
window.initializeSuperUser = async function () {
    const initializer = new SuperUserInitializer();
    return await initializer.initialize();
};

// Auto-initialize on first load if not already done
document.addEventListener('DOMContentLoaded', async () => {
    // Only auto-initialize if we're on a specific admin page or if explicitly requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('init-super-user') || window.location.pathname.includes('admin')) {
        console.log('🔧 Auto-initializing super user...');
        await window.initializeSuperUser();
    }
});

console.log('📋 Super User Initializer loaded. Call initializeSuperUser() to create super admin account.');
console.log('👤 Super User Credentials:');
console.log('   Username: Alfredoxrock');
console.log('   Email: alfredoxrock@dreamlog.com');
console.log('   Password: [PROTECTED]');