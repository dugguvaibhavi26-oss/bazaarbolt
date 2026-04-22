const admin = require("firebase-admin");
require("dotenv").config({ path: ".env.local" });

const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
let app;

if (serviceAccountVar) {
  const serviceAccount = JSON.parse(serviceAccountVar);
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    const formattedKey = privateKey.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
  }
}

if (!app) {
  console.error("Failed to initialize Firebase Admin. Check .env.local");
  process.exit(1);
}

const db = admin.firestore();

async function fix() {
  try {
    const cats = await db.collection('categories').where('section', '==', 'CAFE').get();
    const cafeCatIds = cats.docs.map(doc => doc.id);
    const cafeCatLabels = cats.docs.map(doc => doc.data().label);
    
    console.log('Cafe Categories IDs:', cafeCatIds);
    console.log('Cafe Categories Labels:', cafeCatLabels);

    const productsRef = db.collection('products');
    const prods = await productsRef.get();
    
    let count = 0;
    for (const doc of prods.docs) {
      const data = doc.data();
      const currentSection = data.section || 'BB';
      
      // If product category matches a CAFE category ID or Label, and it's not already CAFE
      if ((cafeCatIds.includes(data.category) || cafeCatLabels.includes(data.category)) && currentSection !== 'CAFE') {
        await doc.ref.update({ section: 'CAFE' });
        console.log(`Updated product: ${data.name} to CAFE section`);
        count++;
      }
    }
    console.log('Total Updated:', count, 'products to CAFE section');
  } catch (e) {
    console.error('Error during fix:', e);
  }
}

fix().then(() => process.exit(0));
