const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || "bazaarbolt-8a1ab";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw
    ?.replace(/^"(.*)"$/, '$1')
    ?.replace(/\\n/g, '\n');


  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}

const db = admin.firestore();

async function inspect() {
  try {
    const cats = await db.collection('categories').get();
    console.log('--- CATEGORIES ---');
    cats.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Label: ${data.label}, Section: ${data.section}`);
      if (data.subcategories) {
        console.log('  Subcategories:');
        data.subcategories.forEach((sub) => {
          console.log(`    - ${sub.label}: ${sub.img}`);
        });
      }
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

inspect().then(() => process.exit(0));
