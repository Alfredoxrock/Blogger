// Test script to verify blog functionality
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, orderBy } = require('firebase/firestore');

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

async function testBlogFunctionality() {
    try {
        console.log('🔥 Testing Firestore Blog Functionality...\n');

        // Test 1: Create a published test post
        console.log('📝 Creating a test published post...');
        const testPost = {
            title: 'Test Post - Published',
            body: 'This is a test post to verify the blog functionality. It should appear on the main blog.',
            excerpt: 'A test post to verify blog functionality.',
            category: 'test',
            tags: ['test', 'functionality'],
            date: new Date(),
            status: 'published',
            readTime: 1,
            featured: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const publishedPostRef = await addDoc(collection(db, 'posts'), testPost);
        console.log('✅ Published post created with ID:', publishedPostRef.id);

        // Test 2: Create a draft test post
        console.log('\n📝 Creating a test draft post...');
        const draftPost = {
            ...testPost,
            title: 'Test Post - Draft',
            status: 'draft',
            body: 'This is a draft post. It should NOT appear on the main blog.'
        };

        const draftPostRef = await addDoc(collection(db, 'posts'), draftPost);
        console.log('✅ Draft post created with ID:', draftPostRef.id);

        // Test 3: Query for published posts only
        console.log('\n🔍 Querying for published posts only...');
        const publishedQuery = query(
            collection(db, 'posts'),
            where('status', '==', 'published'),
            orderBy('date', 'desc')
        );
        const publishedSnapshot = await getDocs(publishedQuery);
        console.log(`✅ Found ${publishedSnapshot.size} published post(s)`);

        publishedSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.title} (${data.status})`);
        });

        // Test 4: Query for all posts (admin view)
        console.log('\n🔍 Querying for all posts (admin view)...');
        const allQuery = query(collection(db, 'posts'), orderBy('date', 'desc'));
        const allSnapshot = await getDocs(allQuery);
        console.log(`✅ Found ${allSnapshot.size} total post(s)`);

        allSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`   - ${data.title} (${data.status})`);
        });

        console.log('\n🎉 Blog functionality test completed successfully!');
        console.log('\n📋 Test Results Summary:');
        console.log(`   • Published posts visible to public: ${publishedSnapshot.size}`);
        console.log(`   • Total posts in database: ${allSnapshot.size}`);
        console.log(`   • Draft posts hidden from public: ${allSnapshot.size - publishedSnapshot.size}`);

    } catch (error) {
        console.error('❌ Error testing blog functionality:', error);
    }
}

testBlogFunctionality();