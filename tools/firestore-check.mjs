import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, doc, getDocFromServer, getDocsFromServer, orderBy, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';

test('Regras do Firestore restringem conversas e aplicam a exclusão individual', async (t) => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-yala',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  t.after(() => env.cleanup());
  await env.clearFirestore();

  const ana = env.authenticatedContext('ana').firestore();
  const bia = env.authenticatedContext('bia').firestore();
  const clara = env.authenticatedContext('clara').firestore();
  const guest = env.unauthenticatedContext().firestore();
  const profile = { name: 'Estudante', country: 'Brasil', university: 'Universidade', course: 'Computação', interests: 'Dados' };
  for (const [db, uid] of [[ana, 'ana'], [bia, 'bia'], [clara, 'clara']]) {
    await setDoc(doc(db, 'profiles', uid), profile);
  }
  await assertFails(getDocsFromServer(collection(guest, 'profiles')));
  await assertFails(setDoc(doc(clara, 'profiles', 'ana'), profile));
  await assertFails(setDoc(doc(ana, 'profiles', 'ana'), { ...profile, email: 'privado@example.test' }));

  const path = 'conversations/ana:bia';
  await assertFails(setDoc(doc(clara, path), { participants: ['ana', 'clara'] }));
  await setDoc(doc(ana, path), { participants: ['ana', 'bia'] });
  await assertFails(setDoc(doc(ana, path), { participants: ['ana', 'clara'] }));
  const first = path + '/messages/first';
  const message = { senderId: 'ana', body: 'Primeira mensagem', sentAt: serverTimestamp() };
  await assertFails(setDoc(doc(bia, first), message));
  await assertFails(setDoc(doc(clara, first), { ...message, senderId: 'clara' }));
  await assertFails(setDoc(doc(ana, first), { ...message, body: '   ' }));
  await setDoc(doc(ana, first), message);
  assert.equal((await getDocFromServer(doc(bia, first))).data().body, 'Primeira mensagem');
  await assertFails(getDocFromServer(doc(clara, first)));
  await assertFails(getDocsFromServer(collection(guest, path, 'messages')));

  const cutoffPath = path + '/historyCutoffs/ana';
  await assertFails(setDoc(doc(bia, cutoffPath), { hiddenThrough: serverTimestamp() }));
  await setDoc(doc(ana, cutoffPath), { hiddenThrough: serverTimestamp() });
  const { hiddenThrough } = (await getDocFromServer(doc(ana, cutoffPath))).data();
  await assertFails(getDocFromServer(doc(ana, first)));
  await assertFails(getDocsFromServer(collection(ana, path, 'messages')));
  assert.equal((await getDocsFromServer(collection(bia, path, 'messages'))).size, 1);

  await setDoc(doc(bia, path + '/messages/next'), { ...message, senderId: 'bia', body: 'Nova mensagem' });
  const visible = query(collection(ana, path, 'messages'), where('sentAt', '>', hiddenThrough), orderBy('sentAt'));
  assert.deepEqual((await getDocsFromServer(visible)).docs.map((entry) => entry.data().body), ['Nova mensagem']);
});
