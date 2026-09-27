#!/usr/bin/env node
// Encryption for AHRAN's private data. The repo is public, so the schedule is only
// ever committed encrypted.
//
//   AHRAN_PASSWORD=... node secure.mjs init          -> writes ../data/key.json
//   node secure.mjs encrypt schedule.json            -> writes ../data/schedule.enc.json
//
// key.json holds an RSA public key (anyone may encrypt, e.g. the daily calendar job,
// which never needs the password) and the matching private key wrapped with a key
// derived from the password. The page unwraps it in the browser to decrypt.
import { webcrypto as crypto } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const subtle = crypto.subtle;
const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const b64 = buf => Buffer.from(buf).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));
const ITER = 310000;

async function init() {
  const pw = process.env.AHRAN_PASSWORD;
  if (!pw || pw.length < 6) throw new Error('set AHRAN_PASSWORD (6+ chars)');
  const pair = await subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const kek = await subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const pkcs8 = await subtle.exportKey('pkcs8', pair.privateKey);
  const wrapped = await subtle.encrypt({ name: 'AES-GCM', iv }, kek, pkcs8);
  const spki = await subtle.exportKey('spki', pair.publicKey);
  writeFileSync(join(DATA, 'key.json'), JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), wrapped: b64(wrapped), publicKey: b64(spki) }, null, 2) + '\n');
  console.log('wrote data/key.json');
}

async function encrypt(file) {
  const key = JSON.parse(readFileSync(join(DATA, 'key.json'), 'utf8'));
  const pub = await subtle.importKey('spki', unb64(key.publicKey), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const plain = readFileSync(file);
  JSON.parse(plain); // refuse to encrypt invalid JSON
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, plain);
  const wrappedKey = await subtle.encrypt({ name: 'RSA-OAEP' }, pub, await subtle.exportKey('raw', aes));
  writeFileSync(join(DATA, 'schedule.enc.json'), JSON.stringify({ v: 1, updated: new Date().toISOString(), key: b64(wrappedKey), iv: b64(iv), data: b64(data) }) + '\n');
  console.log('wrote data/schedule.enc.json');
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'init') await init();
else if (cmd === 'encrypt' && arg) await encrypt(arg);
else { console.error('usage: secure.mjs init | encrypt <file.json>'); process.exit(1); }
