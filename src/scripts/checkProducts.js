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

async function checkProducts() {
  const snapshot = await db.collection('products').get();
  let cafeCount = 0;
  let bbCount = 0;
  let bbCakes = 0;
  let cafeCakes = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.isDeleted) return;

    const section = data.section || 'BB';
    const category = data.category?.toLowerCase() || '';

    if (section === 'CAFE') {
      cafeCount++;
      if (category.includes('cake')) cafeCakes++;
    } else {
      bbCount++;
      if (category.includes('cake')) bbCakes++;
    }
  });

  console.log(`Total Active Products: ${snapshot.size}`);
  console.log(`BB Section: ${bbCount} products (${bbCakes} cakes)`);
  console.log(`CAFE Section: ${cafeCount} products (${cafeCakes} cakes)`);
  
  // Also let's check exact categories in CAFE
  const cafeCategories = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.isDeleted) return;
    if (data.section === 'CAFE') {
      const cat = data.category || 'unknown';
      cafeCategories[cat] = (cafeCategories[cat] || 0) + 1;
    }
  });
  console.log('CAFE Categories:', cafeCategories);
}

checkProducts().catch(console.error);
