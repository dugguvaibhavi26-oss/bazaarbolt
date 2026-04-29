import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

try {
  initializeApp({ credential: cert(serviceAccount) });
} catch (e) {}

const db = getFirestore();

async function fixCakeSections() {
  const snapshot = await db.collection('products')
    .where('category', '==', 'Cakes')
    .get();

  console.log(`Found ${snapshot.size} products in 'Cakes' category.`);

  const batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.section !== 'CAFE') {
      batch.update(doc.ref, { section: 'CAFE' });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully updated ${count} products to 'CAFE' section.`);
  } else {
    console.log("No products needed updating.");
  }
}

fixCakeSections().catch(console.error);
