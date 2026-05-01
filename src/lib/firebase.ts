import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = getFirestore(app, databaseId); 
export const auth = getAuth(app);

// Critical connection test
async function testConnection() {
  try {
    // Try to get connectivity test doc
    await getDocFromServer(doc(db, 'system', 'connectivity_test'));
    console.log("Firestore conectado com sucesso!");
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log("Conectado ao Firestore (permissão validada)");
      return;
    }
    console.error("Erro de conectividade Firestore:", error.code, error.message);
  }
}
testConnection();
