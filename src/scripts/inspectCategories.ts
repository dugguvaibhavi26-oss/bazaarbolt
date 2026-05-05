import { adminDb } from '../lib/firebaseAdmin';

async function inspect() {
  try {
    const cats = await adminDb.collection('categories').get();
    console.log('--- CATEGORIES ---');
    cats.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Label: ${data.label}, Section: ${data.section}`);
      if (data.subcategories) {
        console.log('  Subcategories:');
        data.subcategories.forEach((sub: any) => {
          console.log(`    - ${sub.label}: ${sub.img}`);
        });
      }
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

inspect().then(() => process.exit(0));
