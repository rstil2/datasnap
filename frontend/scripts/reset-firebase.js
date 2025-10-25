import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Read and parse the service account key
const serviceAccountPath = join(__dirname, '..', 'service-account-key.json');
const serviceAccount = JSON.parse(
  await readFile(serviceAccountPath, 'utf8')
);

// Initialize Firebase Admin with service account
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Collections to delete
const COLLECTIONS = {
  STORIES: 'stories',
  LIKES: 'story_likes',
  VIEWS: 'story_views',
  COMMENTS: 'story_comments',
};

async function deleteCollection(collectionPath) {
  try {
    const snapshot = await db.collection(collectionPath).get();

    if (snapshot.empty) {
      console.log(`Collection ${collectionPath} is already empty.`);
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from ${collectionPath}`);
    return snapshot.size;
  } catch (error) {
    console.error(`Error deleting collection ${collectionPath}:`, error);
    throw error;
  }
}

async function resetAllCollections() {
  console.log('Starting Firebase collections reset...');
  
  try {
    let totalDeleted = 0;
    
    // Delete all collections in parallel
    const results = await Promise.all(
      Object.values(COLLECTIONS).map(collection => deleteCollection(collection))
    );
    
    totalDeleted = results.reduce((acc, count) => acc + count, 0);
    
    console.log(`\nReset complete! Total documents deleted: ${totalDeleted}`);
    console.log('\nCommunity feed has been reset and is ready for production.');
    
  } catch (error) {
    console.error('Failed to reset collections:', error);
    process.exit(1);
  }
}

// Execute reset
resetAllCollections();