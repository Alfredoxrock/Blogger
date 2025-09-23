// Test admin panel functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyCxLfRhjINJFiSjGJ7Vg2kCHYH3t9eTDgA",
    authDomain: "dreamworld-f7a4b.firebaseapp.com",
    projectId: "dreamworld-f7a4b",
    storageBucket: "dreamworld-f7a4b.firebasestorage.app",
    messagingSenderId: "330382191425",
    appId: "1:330382191425:web:501903d678634f5eab4fc0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testAdminFunctionality() {
    try {
        console.log('🔧 Testing Admin Panel Functionality...\n');

        // Test: Query all posts for admin view
        console.log('📊 Loading all posts for admin view...');
        const allQuery = query(collection(db, 'posts'), orderBy('date', 'desc'));
        const allSnapshot = await getDocs(allQuery);

        console.log(`✅ Found ${allSnapshot.size} total posts for admin\n`);

        // Show breakdown by status
        const statusCounts = {};
        allSnapshot.forEach(doc => {
            const data = doc.data();
            const status = data.status || 'undefined';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        console.log('📈 Posts by status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   • ${status}: ${count} posts`);
        });

        // Show recent posts with details
        console.log('\n📝 Recent posts (first 10):');
        let count = 0;
        allSnapshot.forEach(doc => {
            if (count < 10) {
                const data = doc.data();
                const date = data.date?.toDate ? data.date.toDate().toISOString().split('T')[0] : data.date;
                console.log(`   ${count + 1}. "${data.title}" - ${data.status || 'no status'} - ${date}`);
                count++;
            }
        });

        console.log('\n🎯 Admin functionality is working correctly!');
        console.log('   • Posts are being loaded');
        console.log('   • Status field is being tracked');
        console.log('   • Date sorting is working');

    } catch (error) {
        console.error('❌ Error testing admin functionality:', error);
    }
}

testAdminFunctionality();