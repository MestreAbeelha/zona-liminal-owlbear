import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { initializeFirestore, doc, getDoc, collection, onSnapshot } from "firebase/firestore";

// Mesmas variáveis de ambiente do site principal (VITE_FIREBASE_*).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

export const entrar = (email, senha) => signInWithEmailAndPassword(auth, email, senha);
export const sair = () => signOut(auth);
export const ouvirAuth = (cb) => onAuthStateChanged(auth, cb);

/** true se a conta logada é de Mestre (mesmo perfil que o site usa). */
export async function ehMestre(uid) {
  try {
    const snap = await getDoc(doc(db, "usuarios", uid));
    return snap.exists() && snap.data().papel === "mestre";
  } catch (e) {
    console.error("[zona-liminal] não consegui ler o perfil", e);
    return false;
  }
}

/** Escuta TODAS as fichas (só o Mestre tem permissão). Devolve uma função para parar. */
export function ouvirFichas(callback, onErro) {
  return onSnapshot(
    collection(db, "entidades"),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => { console.error("[zona-liminal] erro nas fichas", e); onErro && onErro(e); }
  );
}
