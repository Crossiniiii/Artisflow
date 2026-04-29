import { initializeApp } from 'firebase/app';
import { getFirestore, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDjZpUwOq0yUCHuJYIJzBjzEDjXdVH4vmg",
    authDomain: "artisflow-inventory.firebaseapp.com",
    projectId: "artisflow-inventory",
    storageBucket: "artisflow-inventory.firebasestorage.app",
    messagingSenderId: "1050091920157",
    appId: "1:1050091920157:web:184966bcbc22ea325b1ff4",
    measurementId: "G-0H3BG7QLDV",
    databaseURL: "https://artisflow-inventory.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Duplicate user IDs to delete (keeping the most recent ones)
const duplicatesToDelete = [
    '97hzDuXvz2UmEOEtcDhuqG2bbxr2', // Admin User duplicate 1
    'FVqCVEnMxRSsbplWEm7YbU3WoJ43', // Admin User duplicate 2
    'ZQgEcnm0n1eazGG7ZjuFvRrElsx2', // Admin User duplicate 3
    '9GKDV8fqQ4V8bTNk9AmJDp6Fw413', // TestAdmin duplicate 1
];

async function deleteDuplicates() {
    console.log('🧹 Starting duplicate user cleanup...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const docId of duplicatesToDelete) {
        try {
            await deleteDoc(doc(db, 'users', docId));
            console.log(`✓ Deleted duplicate user: ${docId}`);
            successCount++;
        } catch (error) {
            console.error(`✗ Error deleting ${docId}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`✓ Successfully deleted: ${successCount} duplicates`);
    if (errorCount > 0) {
        console.log(`✗ Failed to delete: ${errorCount} duplicates`);
    }
    console.log('\n✅ Duplicate cleanup complete!');

    process.exit(0);
}

deleteDuplicates().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
