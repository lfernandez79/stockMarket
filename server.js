import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// Root entrypoint fallback for Cloud Run container environments
const distServer = path.join(process.cwd(), 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  await import(pathToFileURL(distServer).href);
} else {
  // If running before build, import server.ts
  await import('./server.ts');
}
