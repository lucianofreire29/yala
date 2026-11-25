import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('Duas contas conversam e cada uma controla seu histórico', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'yala-ci-'));
  let server;
  t.after(async () => {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exit = once(server, 'exit');
      server.kill();
      await exit;
    }
    await rm(directory, { recursive: true, force: true });
  });

  server = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: '0', YALA_HOST: '127.0.0.1', YALA_DB: join(directory, 'test.sqlite') },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const [chunk] = await once(server.stdout, 'data', { signal: AbortSignal.timeout(5000) });
  const base = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(base, 'O servidor publicou o endereço de teste');
  assert.equal((await fetch(base)).status, 200);

  async function api(path, { method = 'GET', cookie, data, status = 200 } = {}) {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(base + '/api/' + path, {
      method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return { result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }

  async function account(username, country) {
    const { cookie } = await api('register', {
      method: 'POST', data: { username, password: 'senha-ficticia-123' }, status: 201,
    });
    assert.ok(cookie);
    await api('profile', {
      method: 'PUT', cookie, data: { name: username, country, university: 'Universidade de teste', course: 'Computação', interests: 'Acessibilidade' },
    });
    const { result } = await api('session', { cookie });
    return { id: result.account.id, cookie };
  }

  const ana = await account('ana_teste', 'Brasil');
  const lucia = await account('lucia_teste', 'Chile');
  const mateo = await account('mateo_teste', 'Peru');
  const pathTo = (person) => 'messages/' + person.id;
  const history = async (from, peer) => (await api(pathTo(peer), { cookie: from.cookie })).result.map(({ body }) => body);

  await api(pathTo(lucia), { method: 'POST', cookie: ana.cookie, data: { body: 'Olá, Lucía!' }, status: 201 });
  assert.deepEqual(await history(lucia, ana), ['Olá, Lucía!']);
  assert.deepEqual(await history(mateo, ana), []);
  await api(pathTo(ana), { status: 401 });
  await api(pathTo(lucia), { method: 'DELETE', data: {}, status: 401 });
  await api(pathTo(lucia), { method: 'DELETE', cookie: ana.cookie, data: {} });
  assert.deepEqual(await history(ana, lucia), []);
  assert.deepEqual(await history(lucia, ana), ['Olá, Lucía!']);
  await api(pathTo(ana), { method: 'POST', cookie: lucia.cookie, data: { body: 'Olá, Ana!' }, status: 201 });
  assert.deepEqual(await history(ana, lucia), ['Olá, Ana!']);
  assert.deepEqual(await history(lucia, ana), ['Olá, Lucía!', 'Olá, Ana!']);
});
