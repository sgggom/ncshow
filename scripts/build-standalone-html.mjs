import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const outputPath = join(projectRoot, 'NumberConnect.html');

const mimeTypes = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const posixPath = (value) => value.split(sep).join('/');

async function listFiles(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }
  return files;
}

function dataUri(path, contents) {
  const mime = mimeTypes[extname(path).toLowerCase()] ?? 'application/octet-stream';
  return `data:${mime};base64,${contents.toString('base64')}`;
}

function referencedAssetPath(reference, ownerPath) {
  if (/^(?:data:|blob:|https?:|#)/i.test(reference)) return undefined;
  const cleanReference = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  const absolutePath = cleanReference.startsWith('/')
    ? join(distRoot, cleanReference.slice(1))
    : resolve(dirname(ownerPath), cleanReference);
  const key = posixPath(relative(distRoot, normalize(absolutePath)));
  return key.startsWith('../') ? undefined : key;
}

const files = await listFiles(distRoot);
const fileByKey = new Map(files.map((path) => [posixPath(relative(distRoot, path)), path]));
let html = await readFile(join(distRoot, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script type="module"[^>]*src="\.\/([^"?]+)"[^>]*><\/script>/);
const styleMatch = html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"?]+)"[^>]*>/);
if (!scriptMatch || !styleMatch) throw new Error('Unable to locate the Vite entry assets.');

const scriptKey = scriptMatch[1];
const styleKey = styleMatch[1];
const scriptPath = fileByKey.get(scriptKey);
const stylePath = fileByKey.get(styleKey);
if (!scriptPath || !stylePath) throw new Error('Vite entry assets are missing.');

const assetMap = {};
for (const [key, path] of fileByKey) {
  if (key === 'index.html' || key === scriptKey || key === styleKey) continue;
  assetMap[key] = dataUri(path, await readFile(path));
}

let css = await readFile(stylePath, 'utf8');
css = css.replace(/url\((['"]?)([^)'"\s]+)\1\)/g, (match, _quote, reference) => {
  const key = referencedAssetPath(reference, stylePath);
  return key && assetMap[key] ? `url("${assetMap[key]}")` : match;
});

html = html.replace(/<link rel="preload"[^>]*>/g, '');
html = html.replace(/\b(src|href)="([^"#]+)"/g, (match, attribute, reference) => {
  const key = referencedAssetPath(reference, join(distRoot, 'index.html'));
  return key && assetMap[key] ? `${attribute}="${assetMap[key]}"` : match;
});

const runtime = `
(() => {
  const assets = ${JSON.stringify(assetMap)};
  const markers = ['assets/', 'audio/', 'bead-patterns/', 'level-backgrounds/', 'levels/', 'puzzle-showcase/', 'theme-default/', 'ui/'];
  const findAsset = (input) => {
    if (input == null) return undefined;
    const raw = input instanceof URL ? input.href : String(input);
    if (/^(?:data:|blob:)/i.test(raw)) return undefined;
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch {}
    const direct = decoded.replace(/^\\.\\//, '').replace(/^\\//, '');
    if (assets[direct]) return assets[direct];
    let pathname = decoded;
    try { pathname = decodeURIComponent(new URL(decoded, location.href).pathname); } catch {}
    const normalized = pathname.replace(/\\\\/g, '/');
    for (const marker of markers) {
      const index = normalized.lastIndexOf('/' + marker);
      const key = index >= 0 ? normalized.slice(index + 1) : normalized.startsWith(marker) ? normalized : '';
      if (key && assets[key]) return assets[key];
    }
    const basename = normalized.slice(normalized.lastIndexOf('/') + 1);
    const basenameMatches = Object.keys(assets).filter((key) => (
      key === basename || key.endsWith('/' + basename)
    ));
    if (basenameMatches.length === 1) return assets[basenameMatches[0]];
    return undefined;
  };
  const resolveAsset = (input) => findAsset(input) || input;
  globalThis.__numberConnectAssetUrl = resolveAsset;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const packed = findAsset(input instanceof Request ? input.url : input);
    if (!packed) return nativeFetch(input, init);
    return nativeFetch(input instanceof Request ? new Request(packed, input) : packed, init);
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    return nativeOpen.call(this, method, resolveAsset(url), ...args);
  };

  const patchUrlProperty = (prototype, property) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    if (!descriptor?.set || !descriptor.get) return;
    Object.defineProperty(prototype, property, {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set(value) { descriptor.set.call(this, resolveAsset(value)); },
    });
  };
  patchUrlProperty(HTMLImageElement.prototype, 'src');
  patchUrlProperty(HTMLMediaElement.prototype, 'src');
  patchUrlProperty(HTMLSourceElement.prototype, 'src');

  const nativeSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    const nextValue = /^(?:src|href)$/i.test(name) ? resolveAsset(value) : value;
    return nativeSetAttribute.call(this, name, nextValue);
  };

  const replaceCssUrls = (value) => String(value).replace(/url\\((['"]?)(.*?)\\1\\)/g, (match, quote, url) => {
    const packed = findAsset(url);
    return packed ? 'url("' + packed + '")' : match;
  });
  const nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function(name, value, priority) {
    return nativeSetProperty.call(this, name, replaceCssUrls(value), priority);
  };
  const backgroundDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'backgroundImage');
  if (backgroundDescriptor?.set && backgroundDescriptor.get) {
    Object.defineProperty(CSSStyleDeclaration.prototype, 'backgroundImage', {
      configurable: backgroundDescriptor.configurable,
      enumerable: backgroundDescriptor.enumerable,
      get: backgroundDescriptor.get,
      set(value) { backgroundDescriptor.set.call(this, replaceCssUrls(value)); },
    });
  }

  const NativeWorker = globalThis.Worker;
  globalThis.Worker = function(url, options) { return new NativeWorker(resolveAsset(url), options); };
  globalThis.Worker.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(globalThis.Worker, NativeWorker);
})();
`;

const javascript = (await readFile(scriptPath, 'utf8')).replaceAll('</script', '<\\/script');
html = html
  .replace(
    scriptMatch[0],
    () => `<script>${runtime.replaceAll('</script', '<\\/script')}</script>\n    <script type="module">${javascript}</script>`,
  )
  .replace(styleMatch[0], () => `<style>${css.replaceAll('</style', '<\\/style')}</style>`);

await writeFile(outputPath, html);
const outputSize = (await stat(outputPath)).size / 1024 / 1024;
console.log(`Created ${outputPath} (${outputSize.toFixed(1)} MB)`);
