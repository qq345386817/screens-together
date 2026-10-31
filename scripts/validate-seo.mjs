import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { parse } from 'parse5';
import robotsParser from 'robots-parser';
import { root, origin, locales, pages, read, source, route, canonicalPath, document, walk, attr, find, text } from './site.mjs';

const sitemap = read('sitemap.xml');
assert.equal(XMLValidator.validate(sitemap), true);
const urls = new XMLParser({ ignoreAttributes: false }).parse(sitemap).urlset.url;
const expected = locales.flatMap(locale => pages.map(page => origin + route(locale, page)));
assert.equal(urls.length, 32);
assert.deepEqual([...urls.map(item => item.loc)].sort(), [...expected].sort());
const routes = new Set(expected.map(url => new URL(url).pathname));
const captures = JSON.parse(read('images/mac-screenshots.json'));
assert.deepEqual(Object.keys(captures).sort(), [...locales].sort());
for (const [locale, capture] of Object.entries(captures)) {
  assert.equal(capture.file, `images/mac-${locale}.jpg`);
  assert.match(capture.capturedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(capture.capturedOn <= new Date().toISOString().slice(0, 10));
  assert.match(capture.sourceSHA256, /^[a-f0-9]{64}$/);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root, capture.file))).digest('hex'), capture.sha256);
  assert.ok(capture.width > 700 && capture.height > 500);
}
const isPage = pathname => routes.has(pathname);
function checkRobots(contents) {
  const rules = robotsParser(origin + '/robots.txt', contents);
  assert.ok(rules.getSitemaps().includes(origin + '/sitemap.xml'), 'Missing sitemap in robots.txt');
  for (const agent of ['Googlebot', 'bingbot', 'Applebot']) {
    for (const url of [...expected, ...Object.values(captures).map(capture => origin + '/' + capture.file)]) {
      assert.equal(rules.isAllowed(url, agent), true, `${agent} blocked: ${url}`);
    }
  }
  assert.equal(rules.isAllowed(origin + '/cdn-cgi/l/email-protection', 'Googlebot'), false);
}
checkRobots(read('robots.txt'));
checkRobots('User-agent: GPTBot\nDisallow: /\n\n' + read('robots.txt'));
assert.throws(() => checkRobots(read('robots.txt') + '\nUser-agent: Googlebot\nDisallow: /\n'), /Googlebot blocked/);
function check(doc, url, alias = false, live = false) {
  const nodes = walk(doc);
  const canonicals = nodes.filter(node => node.tagName === 'link' && attr(node, 'rel') === 'canonical');
  assert.equal(canonicals.length, 1, url);
  assert.equal(attr(canonicals[0], 'href'), url);
  assert.equal(attr(find(doc, 'meta', 'property', 'og:url'), 'content'), url);
  assert.ok(text(find(doc, 'title')).length > 5, url);
  assert.ok(attr(find(doc, 'meta', 'name', 'description'), 'content').length > 30, url);
  assert.ok(!/noindex/i.test(attr(find(doc, 'meta', 'name', 'robots') || {}, 'content') || ''), `${url}: canonical page must be indexable`);
  assert.equal(nodes.filter(node => node.tagName === 'h1').length, 1, url);
  assert.ok(nodes.find(node => attr(node, 'id') === 'main-content'), `${url}: skip link target`);
  assert.equal(attr(find(doc, 'a', 'class', 'skip-link'), 'href'), '#main-content');
  for (const file of ['style/base.css','style/tokens.css','scripts/navigation.js']) {
    const hash = createHash('sha256').update(read(file)).digest('hex').slice(0,12);
    assert.ok(nodes.some(node => attr(node, file.endsWith('.js') ? 'src' : 'href') === `/${file}?v=${hash}`), `${url}: stale asset version ${file}`);
  }
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
    const locale = new URL(url).pathname.split('/').filter(Boolean)[0] || 'en';
    const capture = captures[locale];
    const image = walk(find(doc, 'figure', 'class', 'product-shot')).find(node => node.tagName === 'img');
    assert.equal(attr(image, 'src'), `/${capture.file}?v=${capture.sha256.slice(0,12)}`);
    assert.equal(Number(attr(image, 'width')), capture.width);
    assert.equal(Number(attr(image, 'height')), capture.height);
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
  const fetchLive = async (url, options = {}) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
        const body = response.body ? await response.arrayBuffer() : null;
        return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
      } catch (error) {
        if (attempt === 3) throw new Error(`Live fetch failed: ${url}`, { cause: error });
        console.warn(`Retrying network request (${attempt}/3): ${url} (${error.cause?.code || error.name})`);
      }
    }
  };
  for (const url of expected) {
    const response = await fetchLive(url, { redirect: 'manual' });
    assert.equal(response.status, 200, `${url}: must return 200 without redirects`);
    assert.ok(response.headers.get('content-type').includes('text/html'));
    assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), `${url}: unexpected noindex header`);
    // Cloudflare consumes email_off comments; verify the surviving links, not comments.
    check(parse(await response.text()), url, false, true);
    console.log(`LIVE 200: ${new URL(url).pathname}`);
  }
  for (const [from, to] of redirects) {
    const response = await fetchLive(origin + from, { redirect: 'manual' });
    assert.ok([301, 308].includes(response.status), `Missing redirect ${from}`);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, to);
  }
  for (const capture of Object.values(captures)) {
    const response = await fetchLive(`${origin}/${capture.file}?v=${capture.sha256.slice(0,12)}`);
    assert.equal(response.status, 200, capture.file);
    assert.ok(response.headers.get('content-type').includes('image/jpeg'));
    assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), capture.sha256, `Stale deployed capture: ${capture.file}`);
    console.log(`LIVE screenshot SHA256: ${capture.file}`);
  }
  const liveMap = await fetchLive(origin + '/sitemap.xml');
  assert.equal(liveMap.status, 200);
  assert.ok(liveMap.headers.get('content-type').includes('xml'));
  assert.deepEqual(new XMLParser().parse(await liveMap.text()).urlset.url, urls, 'Deployed sitemap URLs and dates must match source');
  const robots = await fetchLive(origin + '/robots.txt');
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  // Cloudflare prepends managed bot policies; keep them and validate the combined rules.
  assert.ok(robotsText.endsWith(read('robots.txt')), 'Deployed origin robots.txt rules changed');
  checkRobots(robotsText);
  const llms = await fetchLive(origin + '/llms.txt');
  assert.equal(llms.status, 200);
  assert.ok(llms.headers.get('content-type').includes('text/plain'));
  assert.equal(await llms.text(), read('llms.txt'));
  assert.ok(llms.headers.get('x-robots-tag').includes('noindex'));
  const missing = await fetchLive(origin + '/not-a-real-screenstogether-page', { redirect: 'manual' });
  assert.equal(missing.status, 404, 'Unknown routes must not be soft 404 homepages');
  console.log('PASS: all live canonical pages, screenshot checksums, redirects, sitemap URLs/dates, robots.txt, llms.txt, email guards, and true 404 responses.');
}
