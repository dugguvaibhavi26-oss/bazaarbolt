import { adminDb } from '../lib/firebaseAdmin';

async function fix() {
  try {
    const cats = await adminDb.collection('categories').where('section', '==', 'CAFE').get();
    const cafeCatIds = cats.docs.map(doc => doc.id);
    const cafeCatLabels = cats.docs.map(doc => doc.data().label);
    console.log('Cafe Categories IDs:', cafeCatIds);
    console.log('Cafe Categories Labels:', cafeCatLabels);

    const productsRef = adminDb.collection('products');
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
