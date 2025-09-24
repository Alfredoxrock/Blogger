// Batch update user roles script
// Run this in Firebase Functions or in browser console

async function grantSuperAdminRole(userEmail) {
    try {
        // First, find the user by email
        const usersRef = firebase.firestore().collection('users');
        const snapshot = await usersRef.where('email', '==', userEmail).get();

        if (snapshot.empty) {
            console.log('User not found:', userEmail);
            return false;
        }

        const userDoc = snapshot.docs[0];
        const userId = userDoc.id;

        // Update user role
        const userData = {
            role: 'super_admin',
            isActive: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            permissions: {
                canManageUsers: true,
                canManagePosts: true,
                canManageSettings: true,
                canViewAnalytics: true
            }
        };

        await usersRef.doc(userId).update(userData);

        console.log('✅ Super admin role granted to:', userEmail);
        return true;

    } catch (error) {
        console.error('❌ Error granting role:', error);
        return false;
    }
}

// Usage examples:
// grantSuperAdminRole('admin@example.com');
// grantSuperAdminRole('user@yourdomain.com');

// Batch update multiple users
async function grantMultipleSuperAdmins(emails) {
    for (const email of emails) {
        await grantSuperAdminRole(email);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Example usage:
// grantMultipleSuperAdmins([
//     'admin1@example.com',
//     'admin2@example.com',
//     'admin3@example.com'
// ]);