import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROUTES = ['tracker', 'features', 'about', 'contact', 'legal'];

async function main() {
  const distDir = path.resolve(process.argv[2] ?? 'dist');
  const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');

  await writeFile(path.join(distDir, '404.html'), indexHtml);
  for (const route of ROUTES) {
    const routeDir = path.join(distDir, route);
    await mkdir(routeDir, { recursive: true });
    await writeFile(path.join(routeDir, 'index.html'), indexHtml);
  }
}

await main();
