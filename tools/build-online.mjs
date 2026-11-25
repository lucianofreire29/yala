import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const keys = {
  apiKey: 'YALA_FIREBASE_API_KEY',
  authDomain: 'YALA_FIREBASE_AUTH_DOMAIN',
  projectId: 'YALA_FIREBASE_PROJECT_ID',
  appId: 'YALA_FIREBASE_APP_ID',
};
const emulator = process.argv.includes('--emulator');
const demoConfig = { apiKey: 'demo-key', authDomain: 'demo-yala.firebaseapp.com', projectId: 'demo-yala', appId: 'demo' };
const missing = Object.values(keys).filter((key) => !process.env[key]?.trim());
if (!emulator && missing.length) throw new Error('Configure: ' + missing.join(', '));

const config = emulator ? demoConfig
  : Object.fromEntries(Object.entries(keys).map(([key, name]) => [key, process.env[name].trim()]));
await mkdir('dist', { recursive: true });
await Promise.all(['index.html', 'style.css', 'andes.webp'].map((file) => copyFile(file, 'dist/' + file)));
await build({
  entryPoints: ['app.js'],
  outfile: 'dist/app.js',
  bundle: true,
  format: 'esm',
  minify: true,
  define: {
    YALA_FIREBASE_CONFIG: JSON.stringify(config),
    YALA_USE_EMULATORS: JSON.stringify(emulator),
  },
});
await writeFile('dist/_headers', '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n');
