import fs from 'fs';
import path from 'path';

const TMP = path.join(process.cwd(), 'tmp');
const ARCH = path.join(TMP, 'archive');

if (!fs.existsSync(ARCH)) fs.mkdirSync(ARCH, { recursive: true });

const items = fs.readdirSync(TMP).filter(f => f !== 'archive');
for (const it of items) {
  try {
    const from = path.join(TMP, it);
    const to = path.join(ARCH, it);
    fs.renameSync(from, to);
    console.log('moved', it);
  } catch (e) {
    console.error('failed to move', it, e.message || e);
  }
}

console.log('tmp/ -> tmp/archive/ cleanup complete');
