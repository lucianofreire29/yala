import { countries, profileLimits } from './catalog.mjs';

const byId = (id) => document.getElementById(id);
const normalize = (value) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const auth = byId('auth');
const profile = byId('profile');
const messageForm = byId('message-form');
const country = byId('country');
const query = byId('query');
const fields = Object.keys(profileLimits);
let account;
let ownProfile;
let students = [];
let recipient;
let historyRequest = 0;
const firebaseConfig = typeof YALA_FIREBASE_CONFIG === 'undefined' ? null : YALA_FIREBASE_CONFIG;
const onlineApi = firebaseConfig
  ? import('./firebase-browser.mjs').then(({ createFirebaseApi }) => createFirebaseApi(firebaseConfig))
  : null;

if (onlineApi) {
  const email = auth.elements.username;
  email.type = 'email';
  email.autocomplete = 'email';
  email.placeholder = 'voce@exemplo.com';
  email.removeAttribute('pattern');
  email.maxLength = 254;
  byId('username-label').textContent = 'E-mail';
}

async function api(path, method = 'GET', data) {
  if (onlineApi) return (await onlineApi)(path, method, data);
  const options = { method };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetch('/api/' + path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function element(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => [...part][0]).join('').toUpperCase();
}

function updateAvatar() {
  byId('profile-avatar').textContent = initials(ownProfile?.name || account?.username || '');
}

function closeConversation() {
  const previous = recipient;
  recipient = null;
  byId('history').replaceChildren();
  byId('conversation').hidden = true;
  if (previous) byId('cards').querySelector(`[data-peer="${CSS.escape(String(previous.account_id))}"]`)?.focus();
}

function action(target, callback) {
  return async (event) => {
    event.preventDefault();
    const status = byId(target);
    status.textContent = '';
    try {
      await callback(event);
    } catch (error) {
      status.textContent = error.message;
    }
  };
}

for (const name of countries) {
  profile.elements.country.add(new Option(name));
  country.add(new Option(name));
}

function renderDirectory() {
  const terms = normalize(query.value).trim().split(/\s+/).filter(Boolean);
  const results = students.filter((student) => {
    const searchable = normalize([student.university, student.course, student.interests].join(' '));
    return (!country.value || country.value === student.country) && terms.every((term) => searchable.includes(term));
  });
  byId('count').textContent = results.length
    ? `${results.length} ${results.length === 1 ? 'perfil encontrado' : 'perfis encontrados'}`
    : 'Nenhum perfil encontrado.';
  byId('cards').replaceChildren(...results.map((student) => {
    const card = element('article', '');
    card.className = 'card';
    const avatar = element('span', initials(student.name));
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    const location = element('p', student.country);
    location.className = 'country';
    const button = element('button', 'Abrir conversa');
    button.className = 'secondary';
    button.dataset.peer = student.account_id;
    button.setAttribute('aria-label', 'Abrir conversa com ' + student.name);
    button.addEventListener('click', action('session-status', async () => {
      if (!ownProfile) {
        profile.elements.name.focus();
        throw new Error('Complete o seu perfil para iniciar uma conversa.');
      }
      recipient = student;
      messageForm.reset();
      byId('history').replaceChildren();
      byId('empty-conversation').hidden = true;
      byId('message-status').textContent = '';
      byId('conversation').hidden = false;
      const title = byId('conversation-title');
      title.textContent = 'Conversa com ' + student.name;
      title.focus();
      await renderMessages();
    }));
    const interests = element('p', student.interests);
    interests.className = 'interests';
    card.append(avatar, location, element('h3', student.name), element('p', student.course + ' · ' + student.university), interests, button);
    return card;
  }));
}

async function refreshDirectory() {
  const viewer = account;
  const directory = await api('directory');
  if (account !== viewer) return;
  students = directory;
  renderDirectory();
}

async function updateSession() {
  const session = await api('session');
  account = session.account;
  ownProfile = session.profile;
  recipient = null;
  students = [];
  byId('history').replaceChildren();
  byId('conversation').hidden = true;
  byId('profile-status').textContent = '';
  updateAvatar();
  byId('account-name').textContent = account?.username ?? '';
  byId('access').hidden = Boolean(account);
  byId('session-bar').hidden = !account;
  byId('workspace').hidden = !account;
  for (const field of fields) profile.elements[field].value = ownProfile?.[field] ?? '';
  if (account) await refreshDirectory();
}

async function renderMessages() {
  const viewer = account;
  const peer = recipient;
  if (!peer) return;
  const request = ++historyRequest;
  const messages = await api('messages/' + peer.account_id);
  if (account !== viewer || recipient !== peer || request !== historyRequest) return;
  byId('empty-conversation').hidden = messages.length > 0;
  byId('history').replaceChildren(...messages.map((message) => {
    const outgoing = message.sender_id === viewer.id;
    const item = document.createElement('li');
    item.classList.toggle('outgoing', outgoing);
    const sender = outgoing ? 'Você' : peer.name;
    item.append(element('small', `${sender} · ${new Date(message.sent_at).toLocaleString('pt-BR')}`), element('p', message.body));
    return item;
  }));
}

auth.addEventListener('submit', action('session-status', async (event) => {
  const route = event.submitter?.value === 'register' ? 'register' : 'login';
  const buttons = [...auth.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await api(route, 'POST', Object.fromEntries(new FormData(auth)));
    auth.reset();
    await updateSession();
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}));

byId('logout').addEventListener('click', action('session-status', async () => {
  await api('logout', 'POST', {});
  await updateSession();
  auth.elements.username.focus();
}));

profile.addEventListener('submit', action('profile-status', async () => {
  const values = Object.fromEntries(new FormData(profile));
  await api('profile', 'PUT', values);
  ownProfile = values;
  updateAvatar();
  byId('profile-status').textContent = 'Perfil salvo no diretório.';
  await refreshDirectory();
}));

messageForm.addEventListener('submit', action('message-status', async () => {
  const peer = recipient;
  const input = messageForm.elements.message;
  const button = messageForm.querySelector('button');
  button.disabled = true;
  try {
    await api('messages/' + peer.account_id, 'POST', { body: input.value });
    if (recipient !== peer) return;
    input.value = '';
    byId('message-status').textContent = 'Mensagem enviada.';
    await renderMessages();
  } finally {
    button.disabled = false;
  }
}));

const clearButton = byId('clear-history');
const clearDialog = byId('clear-history-dialog');
clearButton.addEventListener('click', () => {
  clearDialog.returnValue = '';
  clearDialog.showModal();
});
clearDialog.addEventListener('close', action('message-status', async () => {
  if (clearDialog.returnValue !== 'confirm') return;
  const viewer = account;
  const peer = recipient;
  clearButton.disabled = true;
  try {
    await api('messages/' + peer.account_id, 'DELETE', {});
    if (account !== viewer || recipient !== peer) return;
    byId('history').replaceChildren();
    byId('empty-conversation').hidden = false;
    byId('message-status').textContent = 'Conversa excluída do seu histórico.';
    await renderMessages();
  } finally {
    clearButton.disabled = false;
  }
}));

byId('close-conversation').addEventListener('click', closeConversation);
byId('refresh-messages').addEventListener('click', action('message-status', renderMessages));
byId('refresh-directory').addEventListener('click', action('session-status', refreshDirectory));
query.addEventListener('input', renderDirectory);
country.addEventListener('change', renderDirectory);
updateSession().catch((error) => { byId('session-status').textContent = error.message; });
