import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from 'parse5';
import { root, origin, locales, pages, read, source, route, canonicalPath, document, walk, attr, find, text } from './site.mjs';

const sitemap = read('sitemap.xml');
assert.equal(XMLValidator.validate(sitemap), true);
const urls = new XMLParser({ ignoreAttributes: false }).parse(sitemap).urlset.url;
const expected = locales.flatMap(locale => pages.map(page => origin + route(locale, page)));
assert.equal(urls.length, 32);
assert.deepEqual([...urls.map(item => item.loc)].sort(), [...expected].sort());
const routes = new Set(expected.map(url => new URL(url).pathname));
const isPage = pathname => routes.has(pathname);
function check(doc, url, alias = false, live = false) {
  const nodes = walk(doc);
  const canonicals = nodes.filter(node => node.tagName === 'link' && attr(node, 'rel') === 'canonical');
  assert.equal(canonicals.length, 1, url);
  assert.equal(attr(canonicals[0], 'href'), url);
  assert.equal(attr(find(doc, 'meta', 'property', 'og:url'), 'content'), url);
  assert.ok(text(find(doc, 'title')).length > 5, url);
  assert.ok(attr(find(doc, 'meta', 'name', 'description'), 'content').length > 30, url);
  assert.equal(nodes.filter(node => node.tagName === 'h1').length, 1, url);
  assert.ok(nodes.find(node => attr(node, 'id') === 'main-content'), `${url}: skip link target`);
  assert.equal(attr(find(doc, 'a', 'class', 'skip-link'), 'href'), '#main-content');
  assert.ok(find(doc, 'script', 'src', '/scripts/navigation.js'));
  assert.equal(attr(find(doc, 'select'), 'onchange'), undefined);
  const ids = nodes.map(node => attr(node, 'id')).filter(Boolean);
  assert.equal(ids.length, new Set(ids).size, `${url}: duplicate IDs`);
  const alternates = nodes.filter(node => node.tagName === 'link' && attr(node, 'hreflang'));
  assert.equal(alternates.length, 10, url);
  const languageMap = { en: 'en', 'en-US': 'en', 'zh-CN': 'zh-Hans', 'zh-TW': 'zh-Hant', 'es-ES': 'es-ES', 'fr-FR': 'fr-FR', 'de-DE': 'de-DE', ja: 'ja', ko: 'ko', 'x-default': 'en' };
  const page = new URL(url).pathname.endsWith('/') ? 'index.html' : new URL(url).pathname.split('/').at(-1) + '.html';
  assert.equal(new Set(alternates.map(node => attr(node, 'hreflang'))).size, 10);
  for (const link of alternates) assert.equal(attr(link, 'href'), origin + route(languageMap[attr(link, 'hreflang')], page), `${url}: mismatched reciprocal language group`);
  assert.equal(attr(alternates.find(node => attr(node, 'hreflang') === 'x-default'), 'href'), origin + '/' + new URL(url).pathname.split('/').filter(Boolean).filter(piece => !locales.includes(piece)).join('/'));
  const graphs = nodes.filter(node => node.tagName === 'script' && attr(node, 'type') === 'application/ld+json');
  assert.equal(graphs.length, 1, url);
  const schema = JSON.parse(text(graphs[0]));
  assert.equal(schema['@context'], 'https://schema.org');
  const webpage = schema['@graph'].find(item => item['@type'] === 'WebPage');
  assert.equal(webpage.url, url);
  assert.equal(webpage['@id'], url + '#webpage');
  assert.ok(!JSON.stringify(schema).includes('aggregateRating'), 'Do not fabricate ratings');
  for (const node of nodes) {
    for (const field of ['href', 'src', 'value']) {
      const value = attr(node, field);
      if (!value || value.startsWith('mailto:')) continue;
      const link = new URL(value, url);
      if (link.origin !== origin) continue;
      assert.equal(link.pathname, canonicalPath(link.pathname), `${url}: redirected internal link ${value}`);
      assert.ok(!link.pathname.startsWith('/cdn-cgi/'), `${url}: Cloudflare email URL`);
      assert.ok(isPage(link.pathname) || fs.existsSync(path.join(root, link.pathname)), `${url}: missing ${value}`);
      if (link.hash && isPage(link.pathname)) {
        const match = expected.find(candidate => new URL(candidate).pathname === link.pathname);
        const index = expected.indexOf(match);
        const target = document(source(locales[Math.floor(index / pages.length)], pages[index % pages.length]));
        assert.ok(walk(target).some(node => attr(node, 'id') === decodeURIComponent(link.hash.slice(1))), `${url}: missing anchor ${value}`);
      }
    }
    if (!live && node.tagName === 'a' && attr(node, 'href')?.startsWith('mailto:')) {
      const siblings = node.parentNode.childNodes;
      const index = siblings.indexOf(node);
      assert.equal(siblings[index - 1].data, 'email_off');
      assert.equal(siblings[index + 1].data, '/email_off');
    }
  }
  if (new URL(url).pathname.endsWith('/help')) {
    assert.ok(find(doc, 'section', 'id', 'mac'));
    assert.ok(find(doc, 'section', 'id', 'apple-tv'));
    assert.equal(walk(find(doc, 'section', 'id', 'questions')).filter(node => node.tagName === 'h3').length, 5);
  }
  if (!alias) assert.ok(routes.has(new URL(url).pathname));
  if (new URL(url).pathname.endsWith('/')) {
    assert.equal(nodes.filter(node => node.tagName === 'details').length, 3);
    assert.equal(nodes.filter(node => node.tagName === 'summary').length, 3);
    for (const image of nodes.filter(node => node.tagName === 'img')) {
      assert.ok(Number(attr(image, 'width')) > 0 && Number(attr(image, 'height')) > 0, `${url}: image dimensions`);
    }
    assert.equal(attr(find(doc, 'img', 'class', 'hero-art'), 'fetchpriority'), 'high');
    assert.equal(attr(find(doc, 'img', 'loading', 'lazy'), 'decoding'), 'async');
  }
}

for (const locale of [...locales, 'en-US']) for (const page of pages) check(document(source(locale, page)), origin + route(locale, page), locale === 'en-US');
for (const item of urls) {
  assert.match(item.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(item.lastmod <= new Date().toISOString().slice(0, 10), 'Future lastmod');
}
const redirects = read('_redirects').split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split(/\s+/));
assert.equal(redirects.length, 10);
for (const [from, to, code] of redirects) {
  assert.ok(from.startsWith('/en-US'));
  assert.ok(routes.has(to));
  assert.equal(code, '301');
  assert.notEqual(from, to);
}
assert.ok(read('robots.txt').includes('Disallow: /cdn-cgi/l/email-protection'));
assert.ok(attr(find(document('404.html'), 'meta', 'name', 'robots'), 'content').includes('noindex'));
assert.ok(read('_headers').includes('X-Robots-Tag: noindex'));
assert.equal((read('llms.txt').match(/https:\/\/screens-together\.luopeike\.com/g) || []).length, 32);
console.log('PASS: 36 source pages, 32 canonical URLs, reciprocal language groups, valid structured data, links, email guards, and English redirects.');

if (process.argv.includes('--live')) {
  const controller = () => AbortSignal.timeout(25000);
  for (const url of expected) {
    const response = await fetch(url, { redirect: 'manual', signal: controller() });
    assert.equal(response.status, 200, `${url}: must return 200 without redirects`);
    assert.ok(response.headers.get('content-type').includes('text/html'));
    // Cloudflare consumes email_off comments; verify the surviving links, not comments.
    check(parse(await response.text()), url, false, true);
    console.log(`LIVE 200: ${new URL(url).pathname}`);
  }
  for (const [from, to] of redirects) {
    const response = await fetch(origin + from, { redirect: 'manual', signal: controller() });
    assert.ok([301, 308].includes(response.status), `Missing redirect ${from}`);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, to);
  }
  const liveMap = await fetch(origin + '/sitemap.xml', { signal: controller() });
  assert.deepEqual(new XMLParser().parse(await liveMap.text()).urlset.url.map(item => item.loc).sort(), [...expected].sort());
  const llms = await fetch(origin + '/llms.txt', { signal: controller() });
  assert.equal(llms.status, 200);
  assert.equal(await llms.text(), read('llms.txt'));
  assert.ok(llms.headers.get('x-robots-tag').includes('noindex'));
  const missing = await fetch(origin + '/not-a-real-screenstogether-page', { redirect: 'manual', signal: controller() });
  assert.equal(missing.status, 404, 'Unknown routes must not be soft 404 homepages');
  console.log('PASS: all live canonical pages, redirects, sitemap, llms.txt, email guards, and true 404 responses.');
}
