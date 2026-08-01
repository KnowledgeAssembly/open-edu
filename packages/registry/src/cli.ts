#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { buildCatalog, validateCatalogData } from './catalog-builder.js';
import { listReleases } from './github.js';
import { loadCourseDirs, loadMetadataMap, validateMetadataDir } from './metadata.js';
import { validateRelease } from './validate-release.js';
import { generateSchemas } from './schemas.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const [, , command] = process.argv;
  const repo = arg('repo') ?? process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  switch (command) {
    case 'validate-metadata': {
      const dir = arg('dir') ?? 'courses';
      const errors = validateMetadataDir(dir);
      if (errors.length > 0) {
        for (const e of errors) console.error(`error: ${e}`);
        process.exit(1);
      }
      console.log(`validated ${loadCourseDirs(dir).length} course(s) in ${dir}`);
      break;
    }
    case 'validate-catalog': {
      const path = arg('path') ?? 'catalog.json';
      if (!existsSync(path)) {
        console.error(`error: ${path} not found`);
        process.exit(1);
      }
      let data: unknown;
      try {
        data = JSON.parse(readFileSync(path, 'utf8'));
      } catch (err) {
        console.error(
          `error: ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
      const errors = await validateCatalogData(data);
      if (errors.length > 0) {
        for (const e of errors) console.error(`error: ${e}`);
        process.exit(1);
      }
      const packages = (data as { packages?: unknown[] }).packages ?? [];
      console.log(`${path} is valid (${packages.length} package(s))`);
      break;
    }
    case 'generate-catalog': {
      if (!repo) {
        console.error('error: missing --repo (or GITHUB_REPOSITORY)');
        process.exit(1);
      }
      const out = arg('out') ?? 'catalog.json';
      const releasesFile = arg('releases');
      const includePrerelease = hasFlag('include-prerelease');
      const strict = hasFlag('strict');

      const metadataMap = loadMetadataMap(arg('dir') ?? 'courses');
      const releases = releasesFile
        ? (JSON.parse(readFileSync(releasesFile, 'utf8')) as Awaited<
            ReturnType<typeof listReleases>
          >)
        : await listReleases(repo, token);

      const { catalog, warnings } = await buildCatalog({
        metadataMap,
        releases,
        repo,
        includePrerelease,
      });
      for (const w of warnings) console.warn(`warn: ${w}`);

      const catalogErrors = await validateCatalogData(catalog);
      if (catalogErrors.length > 0) {
        for (const e of catalogErrors) console.error(`error: ${e}`);
        process.exit(1);
      }
      if (strict && warnings.length > 0) {
        console.error(`error: ${warnings.length} warning(s) with --strict`);
        process.exit(1);
      }

      const versionCount = catalog.packages.reduce((n, p) => n + p.versions.length, 0);
      if (!hasFlag('dry-run')) {
        writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
        console.log(
          `wrote ${out} with ${catalog.packages.length} package(s), ${versionCount} version(s)`,
        );
      } else {
        console.log(
          `dry-run: ${catalog.packages.length} package(s), ${versionCount} version(s) would be written to ${out}`,
        );
      }
      break;
    }
    case 'validate-release': {
      if (!repo) {
        console.error('error: missing --repo (or GITHUB_REPOSITORY)');
        process.exit(1);
      }
      const tag = arg('tag') ?? process.env.GITHUB_REF_NAME;
      if (!tag) {
        console.error('error: missing --tag (or GITHUB_REF_NAME)');
        process.exit(1);
      }
      const result = await validateRelease({ repo, tag, token });
      console.log(
        `release ${tag}: OK (${result.oepName}, ${result.sizeBytes} bytes, sha256 ${result.checksum})`,
      );
      break;
    }
    case 'generate-schemas': {
      const out = arg('out') ?? 'schemas';
      const files = generateSchemas(out);
      console.log(`wrote ${files.join(', ')} to ${out}`);
      break;
    }
    default: {
      console.error(`unknown command "${command ?? ''}"`);
      console.error(
        'usage: open-edu-registry <validate-metadata|validate-catalog|generate-catalog|validate-release|generate-schemas>',
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
