import { createServer } from 'node:http';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { countries, profileLimits } from './catalog.mjs';

const databasePath = process.env.YALA_DB ?? fileURLToPath(new URL('./data/yala.sqlite', import.meta.url));
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/catalog.mjs', ['catalog.mjs', 'text/javascript']],
  ['/style.css', ['style.css', 'text/css']],
  ['/andes.webp', ['andes.webp', 'image/webp']],
]);
const duration = 8 * 60 * 60;
const cookie = 'yala_session';
const secure = process.env.YALA_SECURE_COOKIE === '1' ? '; Secure' : '';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const passwordHash = (password, salt) => scryptSync(password, salt, 64);
const placeholderHash = passwordHash('', 'yala-placeholder');

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function respond(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function setSessionCookie(res, value, lifetime) {
  res.setHeader('Set-Cookie', `${cookie}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${lifetime}${secure}`);
}

async function readBody(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json' ||
      (req.headers.origin && !['http://', 'https://'].some((scheme) => req.headers.origin === scheme + req.headers.host))) {
    throw new RequestError(403, 'Requisição não permitida.');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new RequestError(413, 'Dados acima do limite.');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new RequestError(400, 'Dados inválidos.');
  }
}

function startSession(res, accountId, previousToken) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR token_hash = ?').run(Date.now(), previousToken);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashToken(token), accountId, Date.now() + duration * 1000);
  setSessionCookie(res, token, duration);
}

function credentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[a-z0-9_]{3,24}$/.test(username) || password.length < 8 || password.length > 128) {
    throw new RequestError(400, 'Use um nome de usuário válido e uma senha de 8 a 128 caracteres.');
  }
  return { username, password };
}

const findProfile = db.prepare('SELECT * FROM profiles WHERE account_id = ?');

async function handle(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  const method = req.method;
  if (method === 'GET' && assets.has(path)) {
    const [file, type] = assets.get(path);
    res.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : type + '; charset=utf-8' });
    res.end(readFileSync(new URL(file, import.meta.url)));
    return;
  }

  const token = req.headers.cookie?.match(/(?:^|;\s*)yala_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  const tokenHash = token ? hashToken(token) : '';
  const account = db.prepare(`SELECT accounts.id, accounts.username FROM sessions JOIN accounts
    ON accounts.id = sessions.account_id WHERE token_hash = ? AND expires_at > ?`).get(tokenHash, Date.now());

  if (method === 'GET' && path === '/api/session') {
    return respond(res, 200, { account: account ?? null, profile: account ? findProfile.get(account.id) ?? null : null });
  }

  if (method === 'POST' && (path === '/api/register' || path === '/api/login')) {
    const { username, password } = credentials(await readBody(req));
    const existing = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
    if (path === '/api/register') {
      if (existing) throw new RequestError(409, 'Este nome de usuário já está em uso.');
      const salt = randomBytes(16).toString('hex');
      const result = db.prepare('INSERT INTO accounts(username, password_hash, password_salt) VALUES (?, ?, ?)')
        .run(username, passwordHash(password, salt).toString('hex'), salt);
      startSession(res, result.lastInsertRowid, tokenHash);
      return respond(res, 201, {});
    }
    const candidateHash = passwordHash(password, existing?.password_salt ?? 'yala-placeholder');
    const expected = existing ? Buffer.from(existing.password_hash, 'hex') : placeholderHash;
    if (!timingSafeEqual(candidateHash, expected) || !existing) throw new RequestError(401, 'Usuário ou senha inválidos.');
    startSession(res, existing.id, tokenHash);
    return respond(res, 200, {});
  }

  if (!path.startsWith('/api/')) throw new RequestError(404, 'Página não encontrada.');
  if (!account) throw new RequestError(401, 'Entre na sua conta para continuar.');
  if (method === 'POST' && path === '/api/logout') {
    await readBody(req);
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    setSessionCookie(res, '', 0);
    return respond(res, 200, {});
  }
  if (method === 'PUT' && path === '/api/profile') {
    const body = await readBody(req);
    const values = Object.entries(profileLimits).map(([key, limit]) => {
      const value = typeof body[key] === 'string' ? body[key].trim() : '';
      if (!value || value.length > limit) throw new RequestError(400, 'Preencha todos os campos dentro dos limites.');
      return value;
    });
    if (!countries.includes(values[1])) throw new RequestError(400, 'Selecione um país da lista.');
    db.prepare(`INSERT INTO profiles VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id) DO UPDATE SET name=excluded.name, country=excluded.country,
      university=excluded.university, course=excluded.course, interests=excluded.interests`).run(account.id, ...values);
    return respond(res, 200, {});
  }
  if (method === 'GET' && path === '/api/directory') {
    return respond(res, 200, db.prepare('SELECT * FROM profiles WHERE account_id <> ? ORDER BY name, account_id').all(account.id));
  }
  if (method === 'GET' && path === '/api/friends') {
    return respond(res, 200, db.prepare(`SELECT
      CASE WHEN account_a = ? THEN account_b ELSE account_a END AS peer_id,
      sender_id, status FROM friendships WHERE account_a = ? OR account_b = ?`)
      .all(account.id, account.id, account.id));
  }
  const friendship = path.match(/^\/api\/friends\/([1-9]\d*)$/);
  if (friendship && ['POST', 'PATCH'].includes(method)) {
    const peer = Number(friendship[1]);
    if (!Number.isSafeInteger(peer) || peer === account.id || !findProfile.get(peer)) {
      throw new RequestError(404, 'Perfil indisponível.');
    }
    if (!findProfile.get(account.id)) throw new RequestError(409, 'Complete o perfil antes de enviar convites.');
    await readBody(req);
    const [first, second] = [Math.min(account.id, peer), Math.max(account.id, peer)];
    if (method === 'POST') {
      const inserted = db.prepare(`INSERT INTO friendships (account_a, account_b, sender_id)
        VALUES (?, ?, ?) ON CONFLICT DO NOTHING`).run(first, second, account.id);
      if (!inserted.changes) throw new RequestError(409, 'Já existe um convite ou amizade com este perfil.');
      return respond(res, 201, {});
    }
    const accepted = db.prepare(`UPDATE friendships SET status = 'accepted'
      WHERE account_a = ? AND account_b = ? AND sender_id = ? AND status = 'pending'`).run(first, second, peer);
    if (!accepted.changes) throw new RequestError(409, 'Não há um convite recebido pendente deste perfil.');
    return respond(res, 200, {});
  }
  const conversation = path.match(/^\/api\/messages\/([1-9]\d*)$/);
  if (conversation && ['GET', 'POST', 'DELETE'].includes(method)) {
    const peer = Number(conversation[1]);
    if (!Number.isSafeInteger(peer) || peer === account.id || !findProfile.get(peer)) {
      throw new RequestError(404, 'Perfil indisponível.');
    }
    if (!findProfile.get(account.id)) throw new RequestError(409, 'Complete o seu perfil para usar mensagens.');
    if (method === 'GET') {
      return respond(res, 200, db.prepare(`SELECT id, sender_id, body, sent_at FROM messages
        WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
          AND id > COALESCE((SELECT last_hidden_message_id FROM cleared_histories
            WHERE account_id = ? AND peer_id = ?), 0)
        ORDER BY id`).all(account.id, peer, peer, account.id, account.id, peer));
    }
    if (method === 'DELETE') {
      await readBody(req);
      db.prepare(`INSERT INTO cleared_histories (account_id, peer_id, last_hidden_message_id)
        SELECT ?, ?, COALESCE(MAX(id), 0) FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ON CONFLICT(account_id, peer_id) DO UPDATE
        SET last_hidden_message_id = MAX(cleared_histories.last_hidden_message_id, excluded.last_hidden_message_id)`)
        .run(account.id, peer, account.id, peer, peer, account.id);
      return respond(res, 200, {});
    }
    const { body } = await readBody(req);
    const message = typeof body === 'string' ? body.trim() : '';
    if (!message || message.length > 500) throw new RequestError(400, 'Digite uma mensagem de até 500 caracteres.');
    db.prepare('INSERT INTO messages(sender_id, recipient_id, body, sent_at) VALUES (?, ?, ?, ?)').run(account.id, peer, message, Date.now());
    return respond(res, 201, {});
  }
  throw new RequestError(404, 'Recurso não encontrado.');
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (error instanceof RequestError) return respond(res, error.status, { error: error.message });
    console.error(error);
    respond(res, 500, { error: 'O servidor encontrou um erro.' });
  });
});
const host = process.env.YALA_HOST ?? '127.0.0.1';
server.listen(Number(process.env.PORT ?? 8000), host, () => {
  console.log(`Servidor YALA em http://${host}:${server.address().port}`);
});
