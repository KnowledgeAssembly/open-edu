import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEV_SERVER_VERSION = '0.1.0';

export interface DevServerOptions {
  port?: number;
  open?: boolean;
}

export async function startDevServer(
  packageDir: string,
  options: DevServerOptions = {},
): Promise<void> {
  const { createServer } = await import('vite');

  const resolvedPackageDir = resolve(packageDir);
  const devServerRoot = resolve(__dirname, '..');

  process.env.OPEN_EDU_PACKAGE_DIR = resolvedPackageDir;

  const server = await createServer({
    root: devServerRoot,
    server: {
      port: options.port ?? 4000,
      open: options.open ?? true,
    },
  });

  await server.listen();

  const address = server.resolvedUrls?.local?.[0] ?? `http://localhost:${options.port ?? 4000}`;
  console.log(`\n  ${'\u2728'}  OpenEdu Course Creator Studio`);
  console.log(`  ${'\u2502'}  Package: ${resolvedPackageDir}`);
  if (process.env.OPEN_EDU_STUDIO_WORKSPACE) {
    console.log(`  │  Workspace: ${process.env.OPEN_EDU_STUDIO_WORKSPACE}`);
  }
  console.log(`  ${'\u2502'}  URL:     ${address}\n`);

  await new Promise<void>((resolvePromise) => {
    server.httpServer?.once('close', () => {
      resolvePromise();
    });
  });
}
