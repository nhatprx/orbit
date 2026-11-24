const FOLDER_ICON_NAMES: Record<string, string> = {
  src: 'folder-src',
  source: 'folder-src',
  main: 'folder-src',
  frontend: 'folder-client',
  client: 'folder-client',
  web: 'folder-client',
  public: 'folder-public',
  backend: 'folder-server',
  server: 'folder-server',
  api: 'folder-api',
  controller: 'folder-controller',
  controllers: 'folder-controller',
  components: 'folder-components',
  ui: 'folder-components',
  views: 'folder-views',
  pages: 'folder-views',
  layout: 'folder-layout',
  layouts: 'folder-layout',
  utils: 'folder-utils',
  hooks: 'folder-utils',
  lib: 'folder-lib',
  types: 'folder-typescript',
  test: 'folder-test',
  tests: 'folder-test',
  __tests__: 'folder-test',
  docs: 'folder-docs',
  styles: 'folder-css',
  css: 'folder-css',
  images: 'folder-images',
  assets: 'folder-images',
  config: 'folder-config',
  infra: 'folder-config',
  docker: 'folder-docker',
  '.github': 'folder-github',
  workflows: 'folder-gh-workflows',
  '.vscode': 'folder-vscode',
  db: 'folder-database',
  database: 'folder-database',
  migration: 'folder-database',
  migrations: 'folder-database',
  resources: 'folder-resource',
  java: 'folder-java',
  scripts: 'folder-scripts',
};

const EXACT_FILE_ICONS: Record<string, string> = {
  'package.json': 'nodejs',
  'package-lock.json': 'nodejs',
  'tsconfig.json': 'tsconfig',
  'tsconfig.app.json': 'tsconfig',
  'tsconfig.node.json': 'tsconfig',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'tailwind.config.js': 'tailwindcss',
  'tailwind.config.ts': 'tailwindcss',
  'pom.xml': 'maven',
  'build.gradle': 'gradle',
  'settings.gradle': 'gradle',
  dockerfile: 'docker',
  '.dockerignore': 'docker',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.eslintrc': 'eslint',
  '.eslintrc.json': 'eslint',
  'eslint.config.js': 'eslint',
  '.prettierrc': 'prettier',
  'readme.md': 'markdown',
  license: 'certificate',
  'license.md': 'certificate',
};

const EXT_FILE_ICONS: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'react_ts',
  jsx: 'react',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  java: 'java',
  kt: 'kotlin',
  py: 'python',
  go: 'go',
  rs: 'rust',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  mdx: 'markdown',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'css',
  html: 'html',
  htm: 'html',
  sql: 'database',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  sh: 'console',
  bash: 'console',
  zsh: 'console',
  svg: 'svg',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  ico: 'image',
  properties: 'settings',
  toml: 'settings',
  ini: 'settings',
  conf: 'settings',
  lock: 'settings',
};

export function resolveFolderIconName(folderName: string, open = false): string {
  const base = FOLDER_ICON_NAMES[folderName.toLowerCase()] ?? 'folder-base';
  return open ? `${base}-open` : base;
}

export function resolveFileIconName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (EXACT_FILE_ICONS[lower]) return EXACT_FILE_ICONS[lower];
  if (lower.startsWith('dockerfile') || lower.startsWith('docker-compose')) return 'docker';
  if (lower.startsWith('.env')) return 'tune';
  if (lower.startsWith('tsconfig.')) return 'tsconfig';
  if (lower.endsWith('.test.tsx') || lower.endsWith('.spec.tsx')) return 'test-jsx';
  if (lower.endsWith('.test.ts') || lower.endsWith('.spec.ts')) return 'test-ts';
  const dot = lower.lastIndexOf('.');
  if (dot > 0 && dot < lower.length - 1) {
    const ext = lower.slice(dot + 1);
    if (EXT_FILE_ICONS[ext]) return EXT_FILE_ICONS[ext];
  }
  return 'file';
}
