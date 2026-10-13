import { execFileSync, spawnSync } from 'node:child_process';
import { XMLBuilder } from 'fast-xml-parser';
import { root, origin, locales, pages, read, write, source, route, canonicalPath, document, walk, attr, setAttr, find, text, setText, escape, insert, serialize } from './site.mjs';

const copy = JSON.parse(read('content/help.json'));
const today = new Date().toISOString().slice(0, 10);
const price = { en: 'Free app. Store availability is shown on the App Store listing.', 'zh-Hans': 'App 免费。实际上架情况以 App Store 页面为准。', 'zh-Hant': 'App 免費。實際上架情況以 App Store 頁面為準。', 'es-ES': 'App gratuita. La disponibilidad figura en el App Store.', 'fr-FR': 'App gratuite. Consultez la disponibilité sur l’App Store.', 'de-DE': 'Kostenlose App. Die Verfügbarkeit steht im App Store.', ja: '無料の App です。提供状況は App Store で確認してください。', ko: '무료 앱입니다. 제공 여부는 App Store에서 확인하세요.' };
const paragraph = value => `<p>${escape(value)}</p>`;
const section = (id, title, content) => `<section id="${id}"><h2>${escape(title)}</h2>${content}</section>\n`;

for (const locale of [...locales, 'en-US']) {
  const language = locale === 'en-US' ? 'en' : locale;
  const words = copy[language];
  for (const page of pages) {
    const file = source(locale, page);
    const doc = document(file);
    const head = find(doc, 'head');
    const url = origin + route(locale, page);
    const oldUrl = origin + '/' + file;
    for (const node of walk(doc)) {
      if (!node.attrs) continue;
      for (const field of ['href', 'src', 'value']) {
        const value = attr(node, field);
        if (!value || /^(mailto:|#|data:)/.test(value)) continue;
        const target = new URL(value, oldUrl);
        if (target.origin !== origin) continue;
        const destination = canonicalPath(target.pathname) + target.search + target.hash;
        setAttr(node, field, value.startsWith('https://') ? origin + destination : destination);
      }
    }
    setAttr(find(head, 'link', 'rel', 'canonical'), 'href', url);
    setAttr(find(head, 'meta', 'property', 'og:url'), 'content', url);
    if (!find(head, 'link', 'rel', 'describedby')) insert(head, '\n  <link rel="describedby" href="/llms.txt" type="text/plain">\n');

    if (page === 'help.html') {
      const panel = find(doc, 'section', 'class', 'article-panel');
      const lead = find(panel, 'p', 'class', 'lead');
      setText(lead, words.summary);
      panel.childNodes = panel.childNodes.filter(node => node.tagName !== 'section');
      const index = panel.childNodes.findIndex(node => node.tagName === 'div' && attr(node, 'class') === 'download-strip');
      const faq = words.faq.map(([question, answer]) => `<h3>${escape(question)}</h3>${paragraph(answer)}`).join('\n');
      insert(panel,
        section('setup', words.setupTitle, `<ol>${words.steps.map(step => `<li>${escape(step)}</li>`).join('')}</ol>`) +
        section('mac', words.macTitle, paragraph(words.mac)) +
        section('apple-tv', words.tvTitle, paragraph(words.tv)) +
        section('questions', words.faqTitle, faq), index);
      for (const node of walk(head).filter(node => node.tagName === 'meta' && (attr(node, 'name') === 'description' || attr(node, 'property') === 'og:description'))) setAttr(node, 'content', words.summary);
    }
    if (page === 'support.html') {
      const lead = find(doc, 'p', 'class', 'lead');
      const parts = words.supportSummary.split('support@luopeike.com');
      lead.childNodes = [];
      insert(lead, `${escape(parts[0])}<!--email_off--><a href="mailto:support@luopeike.com">support@luopeike.com</a><!--/email_off-->${escape(parts[1])}`);
      for (const node of walk(head).filter(node => node.tagName === 'meta' && (attr(node, 'name') === 'description' || attr(node, 'property') === 'og:description'))) setAttr(node, 'content', words.supportSummary);
    }
    if (page === 'index.html') {
      setText(find(doc, 'h1'), 'ScreensTogether');
      const main = find(doc, 'main');
      main.childNodes = main.childNodes.filter(node => attr(node, 'id') !== 'platforms');
      insert(main, `<section class="section" id="platforms"><h2>${escape(words.platformTitle)}</h2>${paragraph(price[language])}<h3>iPhone / iPad</h3>${paragraph(words.steps[1])}<h3>macOS</h3>${paragraph(words.mac)}<h3>Apple TV</h3>${paragraph(words.tv)}<a href="${route(locale, 'help.html')}#questions">${escape(words.faqTitle)}</a></section>\n`, main.childNodes.findIndex(node => node.tagName === 'footer'));
    }
    // Keep public support links crawlable instead of generating Cloudflare 404 URLs.
    for (const link of walk(doc).filter(node => node.tagName === 'a' && attr(node, 'href')?.startsWith('mailto:'))) {
      const parent = link.parentNode;
      const index = parent.childNodes.indexOf(link);
      if (parent.childNodes[index - 1]?.data !== 'email_off') insert(parent, '<!--email_off-->', index);
      const next = parent.childNodes.indexOf(link) + 1;
      if (parent.childNodes[next]?.data !== '/email_off') insert(parent, '<!--/email_off-->', next);
    }
    for (const link of walk(doc).filter(node => node.tagName === 'a' && attr(node, 'href') === 'https://apps.apple.com/app/id6673916351')) {
      const label = [...link.childNodes].reverse().find(node => node.nodeName === '#text');
      if (label) label.value = words.storeLabel;
    }
    head.childNodes = head.childNodes.filter(node => !(node.tagName === 'script' && attr(node, 'type') === 'application/ld+json'));
    const title = text(find(head, 'title'));
    const description = attr(find(head, 'meta', 'name', 'description'), 'content');
    const graph = [
      { '@type': 'WebSite', '@id': origin + '/#website', name: 'ScreensTogether', alternateName: 'Screens Together', url: origin + '/' },
      { '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: language,
        isPartOf: { '@id': origin + '/#website' }, about: { '@id': origin + '/#app' } }
    ];
    if (page === 'index.html') graph.push({ '@type': 'SoftwareApplication', '@id': origin + '/#app', name: 'ScreensTogether', alternateName: 'Screens Together', applicationCategory: 'MultimediaApplication', operatingSystem: 'iOS, iPadOS, macOS, tvOS', url: origin + '/', description: text(find(doc, 'p', 'class', 'lead')), image: origin + '/favicon/android-chrome-512x512.png', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
    if (page !== 'index.html') graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ScreensTogether', item: origin + route(locale, 'index.html') },
      { '@type': 'ListItem', position: 2, name: text(find(doc, 'h1')), item: url }
    ] });
    insert(head, '\n  <script type="application/ld+json"></script>\n');
    setText(find(head, 'script', 'type', 'application/ld+json'), JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c'));
    write(file, serialize(doc).split('\n').map(line => line.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
  }
}

const records = locales.flatMap(locale => pages.map(page => {
  const file = source(locale, page);
  let lastmod = today;
  const dirty = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', file], { cwd: root }).status !== 0;
  if (!dirty) lastmod = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim() || today;
  return { loc: origin + route(locale, page), lastmod };
}));
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLBuilder({ ignoreAttributes: false, format: true }).build({ urlset: { '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9', url: records } }));
write('_redirects', '# Consolidate the duplicate English paths; legacy links remain supported.\n' +
  ['/en-US', '/en-US/', '/en-US/index', '/en-US/index.html'].map(from => `${from} / 301\n`).join('') +
  pages.filter(page => page !== 'index.html').flatMap(page => [`/en-US/${page}`, `/en-US/${page.slice(0, -5)}`]).map(from => `${from} ${canonicalPath(from)} 301\n`).join(''));
write('llms.txt', '# ScreensTogether\n\n> A local multi-screen display app for scrolling text and user-selected video on iPhone, iPad, native Mac, and Apple TV.\n\n## Product facts\n\n- iPhone/iPad can host or display; the host participates as a screen.\n- A native Mac controller and its joined Display Node windows have separate roles; the controller is not a display tile.\n- Apple TV is a receiver and needs a nearby host.\n- Local rooms need no account or cloud service. Allow local network discovery.\n- This is selected-content tiling, not AirPlay, whole-desktop mirroring, or protected streaming playback.\n- Shared-timeline coordination is not guaranteed hardware frame lock. Test the actual arrangement before an event.\n- Store availability is determined by the App Store listing, not this file.\n\n## Official pages\n\n' + records.map(record => `- [${new URL(record.loc).pathname}](${record.loc}): ${record.loc.endsWith('/help') ? 'Setup, platform roles, limits, and troubleshooting' : record.loc.endsWith('/support') ? 'Contact support' : record.loc.endsWith('/privacy-policy') ? 'Privacy policy' : 'Product overview'}.`).join('\n') + '\n\n## Optional\n\n- [App Store listing](https://apps.apple.com/app/id6673916351): Current store availability.\n');
console.log(`Synchronized 36 source pages and ${records.length} canonical sitemap URLs.`);
