import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SKIPPED_FOLDERS = new Set(['node_modules', 'dist', 'coverage', 'test-results', 'playwright-report']);

/** Every file under the given folders, without dependencies or build output. */
function filesUnder(...roots: string[]): string[] {
  const found: string[] = [];
  const walk = (folder: string) => {
    for (const name of readdirSync(folder)) {
      if (SKIPPED_FOLDERS.has(name)) continue;
      const path = join(folder, name);
      if (statSync(path).isDirectory()) walk(path);
      else found.push(path.replace(/\\/g, '/'));
    }
  };
  roots.forEach(walk);
  return found;
}

const isTest = (file: string) =>
  /\.test\.tsx?$/.test(file) || file.includes('/test/') || file.endsWith('test-utils.ts');
const sourceFiles = filesUnder('shared', 'server', 'client/src').filter((f) => /\.tsx?$/.test(f) && !isTest(f));
const allTypeScript = filesUnder('shared', 'server', 'client/src', 'e2e').filter((f) => /\.tsx?$/.test(f));
const read = (file: string) => readFileSync(file, 'utf8');

describe('project hygiene', () => {
  it('ships the documents a reviewer or contributor needs', () => {
    const required = [
      'README.md',
      'SECURITY.md',
      'CONTRIBUTING.md',
      '.env.example',
      '.editorconfig',
      'docs/ARCHITECTURE.md',
      'docs/ACCESSIBILITY.md',
      'docs/TESTING.md',
      'docs/DEPLOYMENT.md',
      'docs/API.md',
      '.github/workflows/ci.yml',
    ];
    for (const doc of required) expect(existsSync(doc), doc).toBe(true);
  });

  it('keeps every source file small and single-purpose (under 250 lines)', () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
    for (const file of sourceFiles) expect(read(file).split('\n').length, file).toBeLessThanOrEqual(250);
  });

  it('never silences the type checker or uses `any`', () => {
    const forbidden = [/@ts-ignore/, /@ts-nocheck/, /@ts-expect-error/, /:\s*any\b/, /\bas any\b/, /<any>/];
    for (const file of allTypeScript.filter((f) => f !== 'shared/projectHygiene.test.ts')) {
      const text = read(file);
      for (const pattern of forbidden) expect(pattern.test(text), `${file} matches ${String(pattern)}`).toBe(false);
    }
  });

  it('writes to the console only through the server logger', () => {
    for (const file of sourceFiles.filter((f) => f !== 'server/logger.ts')) {
      expect(/\bconsole\./.test(read(file)), file).toBe(false);
    }
  });

  it('keeps secrets out of the repository', () => {
    const secretLike = /(AIza[0-9A-Za-z_-]{30,}|sb_secret_[0-9A-Za-z_-]+|eyJ[0-9A-Za-z_-]{30,}\.[0-9A-Za-z_-]{30,})/;
    for (const file of allTypeScript.filter((f) => f !== 'shared/projectHygiene.test.ts' && !f.endsWith('.test.ts'))) {
      expect(secretLike.test(read(file)), file).toBe(false);
    }
  });
});
