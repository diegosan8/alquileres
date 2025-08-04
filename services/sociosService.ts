import { db } from '../services/firebase';
import { collection, doc, getDocs, setDoc, writeBatch, getDoc } from 'firebase/firestore';

export const getSocios = async () => {
  const snapshot = await getDocs(collection(db, 'socios'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveSocios = async (socios) => {
  const batch = writeBatch(db);
  socios.forEach(socio => {
    const docRef = doc(db, 'socios', socio.id);
    batch.set(docRef, socio);
  });
  await batch.commit();
};

export const archiveAdelantos = async (adelantos, yearMonth) => {
  const docRef = doc(db, 'socios_adelantos', yearMonth);
  await setDoc(docRef, { adelantos, yearMonth });
};

export const getAdelantos = async (yearMonth) => {
  const docRef = doc(db, 'socios_adelantos', yearMonth);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data().adelantos : [];
};
