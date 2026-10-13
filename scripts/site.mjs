import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, parseFragment, serialize } from 'parse5';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const origin = 'https://screens-together.luopeike.com';
export const locales = ['en', 'zh-Hans', 'zh-Hant', 'es-ES', 'fr-FR', 'de-DE', 'ja', 'ko'];
export const pages = ['index.html', 'help.html', 'support.html', 'privacy-policy.html'];
export const read = file => fs.readFileSync(path.join(root, file), 'utf8');
export const write = (file, value) => {
  if (!fs.existsSync(path.join(root, file)) || read(file) !== value) fs.writeFileSync(path.join(root, file), value);
};
export const source = (locale, page) => locale === 'en' ? page : `${locale}/${page}`;
export const route = (locale, page) => `${locale === 'en' || locale === 'en-US' ? '/' : `/${locale}/`}${page === 'index.html' ? '' : page.slice(0, -5)}`;
export const canonicalPath = pathname => {
  const clean = pathname.replace(/^\/en-US(?=\/|$)/, '').replace(/index\.html$/, '').replace(/\.html$/, '');
  return clean || '/';
};
export const document = file => parse(read(file));
export const walk = node => [node, ...(node.childNodes || []).flatMap(walk)];
export const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
export const setAttr = (node, name, value) => {
  const existing = node.attrs.find(item => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
};
export const find = (node, tag, name, value) => walk(node).find(item => item.tagName === tag && (!name || attr(item, name) === value));
export const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
export const setText = (node, value) => { node.childNodes = [{ nodeName: '#text', value, parentNode: node }]; };
export const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const insert = (parent, html, index = parent.childNodes.length) => {
  const nodes = parseFragment(html).childNodes;
  for (const node of nodes) node.parentNode = parent;
  parent.childNodes.splice(index, 0, ...nodes);
};
export { serialize };
