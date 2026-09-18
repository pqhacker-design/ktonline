import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

async function cleanup() {
  console.log('Cleaning up users in Firestore...');
  const colRef = collection(db, 'users');
  const snap = await getDocs(colRef);

  console.log(`Found ${snap.docs.length} user documents.`);
  for (const document of snap.docs) {
    const data = document.data();
    if (document.id === 'admin' || data.username === 'admin') {
      console.log('Keeping admin document:', document.id);
    } else {
      console.log('Deleting user document:', document.id, data.username);
      await deleteDoc(doc(db, 'users', document.id));
    }
  }

  // Ensure default admin document is set with username: admin, password: admin
  const adminDocRef = doc(db, 'users', 'admin');
  await setDoc(adminDocRef, {
    username: 'admin',
    email: 'admin@system.local',
    password: 'admin',
    displayName: 'Quản trị viên Hệ thống',
    role: 'admin',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log('Successfully cleaned up all users! Only admin account remains with password "admin".');
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
