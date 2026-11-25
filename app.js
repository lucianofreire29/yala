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
let friendships = [];
let friendshipRequest = 0;
let handledHash;
let recipient;
let historyRequest = 0;
const firebaseConfig = typeof YALA_FIREBASE_CONFIG === 'undefined' ? null : YALA_FIREBASE_CONFIG;
const onlineApi = firebaseConfig
  ? import('./firebase-browser.mjs').then(({ createFirebaseApi }) => createFirebaseApi(firebaseConfig, typeof YALA_USE_EMULATORS !== 'undefined' && YALA_USE_EMULATORS))
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

const chatHash = '#conversa/';

function showWorkspace() {
  const previous = recipient;
  recipient = null;
  historyRequest++;
  byId('history').replaceChildren();
  byId('conversation').hidden = true;
  handledHash = location.hash;
  const tab = ({ '#perfil': 'profile', '#amigos': 'friends' })[location.hash] ?? 'explore';
  byId('workspace').hidden = !account || tab !== 'explore';
  byId('profile-screen').hidden = !account || tab !== 'profile';
  byId('friends-screen').hidden = !account || tab !== 'friends';
  for (const name of ['explore', 'friends', 'profile']) {
    const link = byId('nav-' + name);
    if (name === tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.body.classList.remove('chat-open');
  if (previous) {
    const list = tab === 'friends' ? byId('accepted-friends') : byId('cards');
    const card = list.querySelector(`[data-peer="${CSS.escape(String(previous.account_id))}"]`);
    (card ?? (tab === 'friends' ? byId('friends-title') : query)).focus();
  }
}

function closeConversation() {
  if (window.history.state?.yalaChat) {
    window.history.back();
  } else {
    window.history.replaceState(null, '', location.pathname + location.search);
    showWorkspace();
  }
}

async function updateView() {
  if (!account || !location.hash.startsWith(chatHash)) {
    const previous = recipient;
    showWorkspace();
    if (account && location.hash === '#amigos') {
      await refreshFriendsScreen();
      if (previous && location.hash === '#amigos' && document.activeElement === document.body) {
        byId('accepted-friends').querySelector(`[data-peer="${CSS.escape(String(previous.account_id))}"]`)?.focus();
      }
    }
    return;
  }

  const peerId = location.hash.slice(chatHash.length);
  const peer = students.find((student) => encodeURIComponent(String(student.account_id)) === peerId);
  if (!ownProfile || !peer) {
    window.history.replaceState(null, '', ownProfile ? '#explorar' : '#perfil');
    showWorkspace();
    if (!ownProfile) profile.elements.name.focus();
    throw new Error(!ownProfile ? 'Complete o seu perfil para iniciar uma conversa.' : 'Este perfil está indisponível.');
  }
  handledHash = location.hash;
  if (recipient?.account_id === peer.account_id) return;

  recipient = peer;
  messageForm.reset();
  byId('history').replaceChildren();
  byId('empty-conversation').hidden = true;
  byId('message-status').textContent = '';
  byId('chat-options').open = false;
  byId('conversation-avatar').textContent = initials(peer.name);
  for (const id of ['workspace', 'profile-screen', 'friends-screen']) byId(id).hidden = true;
  byId('conversation').hidden = false;
  document.body.classList.add('chat-open');
  const title = byId('conversation-title');
  title.textContent = 'Conversa com ' + peer.name;
  window.scrollTo(0, 0);
  title.focus({ preventScroll: true });
  await renderMessages();
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
    const buttons = element('div', '');
    buttons.className = 'card-actions';
    buttons.append(conversationButton(student));
    const relationship = friendships.find((entry) => entry.peer_id === student.account_id);
    if (!relationship) buttons.append(friendButton(student, 'Convidar', 'POST', 'session-status'));
    else if (relationship.status === 'pending' && relationship.sender_id !== account.id) {
      buttons.append(friendButton(student, 'Aceitar convite', 'PATCH', 'session-status'));
    } else {
      const label = element('span', relationship.status === 'accepted' ? 'Amigo' : 'Convite enviado');
      label.className = 'friend-label';
      buttons.append(label);
    }
    const interests = element('p', student.interests);
    interests.className = 'interests';
    card.append(avatar, location, element('h3', student.name), element('p', student.course + ' · ' + student.university), interests, buttons);
    return card;
  }));
}

function conversationButton(student) {
  const button = element('button', 'Abrir conversa');
  button.className = 'secondary';
  button.dataset.peer = student.account_id;
  button.setAttribute('aria-label', 'Abrir conversa com ' + student.name);
  button.addEventListener('click', action('session-status', async () => {
    if (!ownProfile) {
      window.history.pushState(null, '', '#perfil');
      showWorkspace();
      profile.elements.name.focus();
      throw new Error('Complete o seu perfil para iniciar uma conversa.');
    }
    window.history.pushState({ yalaChat: true }, '', chatHash + encodeURIComponent(String(student.account_id)));
    try {
      await updateView();
    } catch (error) {
      byId('message-status').textContent = error.message;
    }
  }));
  return button;
}

function friendButton(student, label, method, statusId) {
  const button = element('button', label);
  button.className = method === 'POST' ? 'quiet' : 'secondary';
  button.setAttribute('aria-label', label + (method === 'POST' ? ' ' : ' de ') + student.name);
  button.addEventListener('click', action(statusId, async () => {
    if (!ownProfile) {
      location.hash = '#perfil';
      throw new Error('Complete o seu perfil para gerenciar convites.');
    }
    button.disabled = true;
    try {
      await api('friends/' + student.account_id, method, {});
      byId(statusId).textContent = method === 'POST' ? 'Convite enviado.' : 'Convite aceito.';
      await refreshFriendships();
    } finally {
      button.disabled = false;
    }
  }));
  return button;
}

function renderFriends() {
  const groups = [
    ['accepted-friends', 'accepted', null, 'Você ainda não tem amigos adicionados.'],
    ['received-friends', 'pending', false, 'Nenhum convite recebido.'],
    ['sent-friends', 'pending', true, 'Nenhum convite enviado.'],
  ];
  for (const [id, status, outgoing, empty] of groups) {
    const rows = [];
    for (const relationship of friendships) {
      if (relationship.status !== status || (outgoing !== null && (relationship.sender_id === account.id) !== outgoing)) continue;
      const peer = students.find((student) => student.account_id === relationship.peer_id);
      if (!peer) continue;
      const row = element('div', '');
      row.className = 'friend-row';
      const info = element('div', '');
      info.append(element('strong', peer.name), element('p', peer.course + ' · ' + peer.university));
      row.append(info);
      if (status === 'accepted') row.append(conversationButton(peer));
      else if (!outgoing) row.append(friendButton(peer, 'Aceitar convite', 'PATCH', 'friends-status'));
      rows.push(row);
    }
    const emptyState = element('p', empty);
    emptyState.className = 'muted';
    byId(id).replaceChildren(...(rows.length ? rows : [emptyState]));
  }
}

async function refreshFriendships() {
  const viewer = account;
  const request = ++friendshipRequest;
  const relationships = await api('friends');
  if (account !== viewer || request !== friendshipRequest) return;
  friendships = relationships;
  renderDirectory();
  renderFriends();
}

async function refreshFriendsScreen() {
  await refreshDirectory();
  await refreshFriendships();
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
  students = [];
  friendships = [];
  renderFriends();
  recipient = null;
  showWorkspace();
  byId('profile-status').textContent = '';
  updateAvatar();
  byId('account-name').textContent = account?.username ?? '';
  byId('access').hidden = Boolean(account);
  byId('session-bar').hidden = !account;
  for (const field of fields) profile.elements[field].value = ownProfile?.[field] ?? '';
  if (account) {
    await refreshDirectory();
    await updateView();
    if (location.hash !== '#amigos') refreshFriendships().catch(() => {});
  }
}

async function renderMessages() {
  const viewer = account;
  const peer = recipient;
  if (!peer) return;
  const request = ++historyRequest;
  const messages = await api('messages/' + peer.account_id);
  if (account !== viewer || recipient !== peer || request !== historyRequest) return;
  byId('empty-conversation').hidden = messages.length > 0;
  const scroller = byId('chat-scroll');
  const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;
  byId('history').replaceChildren(...messages.map((message) => {
    const outgoing = message.sender_id === viewer.id;
    const item = document.createElement('li');
    item.classList.toggle('outgoing', outgoing);
    const sender = outgoing ? 'Você' : peer.name;
    item.append(element('small', `${sender} · ${new Date(message.sent_at).toLocaleString('pt-BR')}`), element('p', message.body));
    return item;
  }));
  if (nearBottom) scroller.scrollTop = scroller.scrollHeight;
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
  if (location.hash.startsWith(chatHash)) window.history.replaceState(null, '', location.pathname + location.search);
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
    byId('chat-options').open = false;
    byId('chat-options').querySelector('summary').focus();
    byId('history').replaceChildren();
    byId('empty-conversation').hidden = false;
    byId('message-status').textContent = 'Conversa excluída do seu histórico.';
    await renderMessages();
  } finally {
    clearButton.disabled = false;
  }
}));

byId('close-conversation').addEventListener('click', closeConversation);
byId('skip-content').addEventListener('click', (event) => {
  event.preventDefault();
  byId(recipient ? 'conversation-title' : 'main').focus();
});
function onNavigation() {
  if (!account || handledHash === location.hash) return;
  handledHash = location.hash;
  updateView().catch((error) => {
    byId(recipient ? 'message-status' : location.hash === '#amigos' ? 'friends-status' : 'session-status').textContent = error.message;
  });
}
window.addEventListener('popstate', onNavigation);
window.addEventListener('hashchange', onNavigation);
byId('refresh-messages').addEventListener('click', action('message-status', renderMessages));
byId('refresh-directory').addEventListener('click', action('session-status', async () => {
  await refreshDirectory();
  refreshFriendships().catch(() => {});
}));
byId('refresh-friends').addEventListener('click', action('friends-status', refreshFriendsScreen));
query.addEventListener('input', renderDirectory);
country.addEventListener('change', renderDirectory);
updateSession().catch((error) => { byId('session-status').textContent = error.message; });
