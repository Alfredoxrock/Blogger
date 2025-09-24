// Quick fix for super admin permissions
// Run this in the browser console on any authenticated page

async function fixSuperAdminPermissions() {
    try {
        // Check if Firebase is loaded
        if (!window.firebase) {
            console.error('Firebase not loaded');
            return;
        }

        const auth = firebase.auth();
        const db = firebase.firestore();
        const user = auth.currentUser;

        if (!user) {
            console.error('No user logged in');
            return;
        }

        console.log('🔧 Fixing super admin permissions for:', user.email);

        // Create/update user document with super admin role
        const userData = {
            email: user.email,
            role: 'super_admin',
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            permissions: {
                canManageUsers: true,
                canManagePosts: true,
                canManageSettings: true,
                canViewAnalytics: true
            },
            displayName: user.displayName || user.email.split('@')[0]
        };

        await db.collection('users').doc(user.uid).set(userData, { merge: true });

        console.log('✅ Super admin permissions fixed!');
        console.log('📋 User data:', userData);

        // Test access
        console.log('🧪 Testing writer-petitions access...');
        const petitions = await db.collection('writer-petitions').limit(1).get();
        console.log('✅ Petitions collection accessible:', petitions.size, 'documents');

        alert('Super admin permissions fixed! Please refresh the page.');

    } catch (error) {
        console.error('❌ Error fixing permissions:', error);
        alert('Error fixing permissions: ' + error.message);
    }
}

// Auto-run the fix
fixSuperAdminPermissions();