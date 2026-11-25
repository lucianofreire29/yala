import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, setPersistence,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  collection, connectFirestoreEmulator, doc, getDocFromServer, getDocsFromServer, getFirestore, orderBy, query,
  serverTimestamp, setDoc, where, addDoc,
} from 'firebase/firestore';

export function createFirebaseApi(config, useEmulators) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  const persistence = setPersistence(auth, browserSessionPersistence);

  function thread(peer) {
    const uid = auth.currentUser.uid;
    if (uid === peer) throw new Error('Escolha outra conta.');
    const pair = [uid, peer].sort();
    const id = pair.join(':');
    return doc(db, 'conversations', id);
  }

  async function createThreadIfNeeded(reference, peer) {
    const uid = auth.currentUser.uid;
    try {
      if ((await getDocFromServer(reference)).exists()) return;
    } catch (error) {
      if (error.code !== 'permission-denied') throw error;
    }
    try {
      await setDoc(reference, { participants: [uid, peer].sort() });
    } catch (error) {
      // Duas contas podem abrir a mesma conversa simultaneamente.
      if (error.code !== 'permission-denied' || !(await getDocFromServer(reference)).exists()) throw error;
    }
  }

  const messages = {
    async GET(reference) {
      const cutoff = await getDocFromServer(doc(reference, 'historyCutoffs', auth.currentUser.uid));
      const filters = cutoff.exists() ? [where('sentAt', '>', cutoff.data().hiddenThrough)] : [];
      const result = await getDocsFromServer(query(collection(reference, 'messages'), ...filters, orderBy('sentAt')));
      return result.docs.map((message) => {
        const { senderId, body, sentAt } = message.data();
        return { id: message.id, sender_id: senderId, body, sent_at: sentAt.toMillis() };
      });
    },
    async POST(reference, data) {
      const body = typeof data?.body === 'string' ? data.body.trim() : '';
      if (!body || body.length > 500) throw new Error('Digite uma mensagem de até 500 caracteres.');
      await addDoc(collection(reference, 'messages'), { senderId: auth.currentUser.uid, body, sentAt: serverTimestamp() });
      return {};
    },
    async DELETE(reference) {
      await setDoc(doc(reference, 'historyCutoffs', auth.currentUser.uid), { hiddenThrough: serverTimestamp() });
      return {};
    },
  };

  return async (path, method = 'GET', data) => {
    try {
      await persistence;
      await auth.authStateReady();
      if (path === 'register' || path === 'login') {
        const authenticate = path === 'register' ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
        await authenticate(auth, data.username.trim(), data.password);
        return {};
      }
      const user = auth.currentUser;
      if (path === 'session') {
        if (!user) return { account: null, profile: null };
        const profile = await getDocFromServer(doc(db, 'profiles', user.uid));
        return { account: { id: user.uid, username: user.email }, profile: profile.data() ?? null };
      }
      if (!user) throw new Error('Entre na sua conta para continuar.');
      if (path === 'logout') {
        await signOut(auth);
        return {};
      }
      if (path === 'profile') {
        await setDoc(doc(db, 'profiles', user.uid), Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()])));
        return {};
      }
      if (path === 'directory') {
        const result = await getDocsFromServer(collection(db, 'profiles'));
        return result.docs.filter((profile) => profile.id !== user.uid)
          .map((profile) => ({ account_id: profile.id, ...profile.data() }))
          .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
      }
      if (path.startsWith('messages/') && messages[method]) {
        const peer = path.slice('messages/'.length);
        const reference = thread(peer);
        await createThreadIfNeeded(reference, peer);
        return await messages[method](reference, data);
      }
      throw new Error('Recurso não encontrado.');
    } catch (error) {
      const feedback = {
        'auth/invalid-credential': 'E-mail ou senha inválidos.',
        'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
        'auth/weak-password': 'Escolha uma senha mais forte.',
        'auth/invalid-email': 'Informe um e-mail válido.',
        'auth/network-request-failed': 'Não foi possível conectar. Tente novamente.',
        'permission-denied': 'Os dados foram recusados ou a conta não tem acesso.',
        unavailable: 'Serviço temporariamente indisponível. Tente novamente.',
      };
      throw new Error(feedback[error.code] ?? (error.code ? 'Não foi possível concluir esta ação.' : error.message));
    }
  };
}
