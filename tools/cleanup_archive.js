import fs from 'fs';
import path from 'path';

const ARCH = path.join(process.cwd(),'tmp','archive');
if (!fs.existsSync(ARCH)) {
  console.log('No archive folder found');
  process.exit(0);
}

const items = fs.readdirSync(ARCH);
for (const it of items) {
  const p = path.join(ARCH, it);
  try {
    fs.unlinkSync(p);
    console.log('deleted', it);
  } catch (e) {
    console.error('failed to delete', it, e.message || e);
  }
}

console.log('archive cleanup complete');
