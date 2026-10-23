import { find, attr, insert, route, escape, setAttr, walk } from './site.mjs';

const e = escape;
const store = 'https://apps.apple.com/app/id6673916351';
const action = label => `<a class="button primary" href="${store}"><img class="store-icon" src="/images/app-store-icon.svg" width="22" height="22" alt="">${e(label)}</a>`;

export function renderHome(doc, locale, words, home) {
  const main = find(doc, 'main');
  const header = find(main, 'header');
  const footer = find(main, 'footer');
  const lead = home.intro;
  const help = route(locale, 'help.html');
  const imageLocale = locale === 'en-US' ? 'en' : locale;
  setAttr(main, 'class', 'page landing');
  main.childNodes = [header, footer];
  insert(main, `
    <section class="hero" id="main-content" tabindex="-1" aria-labelledby="product-title">
      <img class="hero-art" src="/images/shared-canvas.jpg" width="1536" height="1024" fetchpriority="high" alt="">
      <div class="hero-copy"><h1 id="product-title">Screens Together</h1><p class="tagline">${e(home.tagline)}</p><p class="lead">${e(lead)}</p>
        <div class="actions">${action(words.storeLabel)}<a class="button secondary" href="#how-it-works">${e(home.setup)}<span aria-hidden="true"> ↓</span></a></div>
      </div><p class="image-note">${e(home.illustration)}</p>
    </section>
    <ul class="benefits">${home.facts.map(item => `<li>${e(item)}</li>`).join('')}</ul>
    <section class="section workflow" id="how-it-works" aria-labelledby="workflow-title"><h2 id="workflow-title">${e(home.workflow)}</h2>
      <ol class="steps">${home.steps.map(([title, body], index) => `<li><span class="step-number" aria-hidden="true">0${index + 1}</span><h3>${e(title)}</h3><p>${e(body)}</p></li>`).join('')}</ol>
      <a class="text-link" href="${help}#setup">${e(words.setupTitle)} <span aria-hidden="true">→</span></a>
    </section>
    <section class="section mac-story" aria-labelledby="mac-title"><div class="section-heading"><h2 id="mac-title">${e(home.macHeading)}</h2><p>${e(home.macIntro)}</p><a class="text-link" href="${help}#mac">${e(home.roleLinks[1])} <span aria-hidden="true">→</span></a></div>
      <figure class="product-shot"><img src="/images/mac-${imageLocale}.jpg" alt="${e(home.screenshot)}" width="1760" height="1320" loading="lazy" decoding="async"><figcaption>${e(home.screenshot)}</figcaption></figure>
    </section>
    <section class="section" id="platforms" aria-labelledby="platform-title"><h2 id="platform-title">${e(words.platformTitle)}</h2><div class="platforms">${['iPhone / iPad', 'Mac', 'Apple TV'].map((name, index) => `<article><h3>${name}</h3><p>${e(home.roles[index])}</p><a class="text-link" href="${help}#${['setup','mac','apple-tv'][index]}">${e(home.roleLinks[index])} <span aria-hidden="true">→</span></a></article>`).join('')}</div></section>
    <section class="section home-faq" id="questions" aria-labelledby="faq-title"><h2 id="faq-title">${e(home.faqHeading)}</h2><div class="questions">${[words.faq[1], words.faq[0], words.faq[4]].map(([question, answer]) => `<details><summary>${e(question)}</summary><p>${e(answer)}</p></details>`).join('')}</div><a class="text-link" href="${help}#questions">${e(words.faqTitle)} <span aria-hidden="true">→</span></a></section>
    <section class="section closing"><div><h2>${e(home.closing)}</h2><p>${e(home.closingText)}</p></div><div>${action(words.storeLabel)}<p class="availability">${e(home.free)}</p></div></section>
  `, 1);
}

export function enhanceShared(doc, locale, home, navigationSource) {
  const header = find(doc, 'header');
  const brand = find(header, 'a', 'class', 'brand');
  for (const child of brand.childNodes.filter(node => node.nodeName === '#text')) child.value = 'Screens Together';
  const icon = find(brand, 'img');
  setAttr(icon, 'src', '/favicon/android-chrome-192x192.png');
  setAttr(icon, 'width', '36'); setAttr(icon, 'height', '36');
  for (const link of walk(header).filter(node => node.tagName === 'a' && attr(node, 'class') === 'active')) setAttr(link, 'aria-current', 'page');
  const select = find(header, 'select');
  select.attrs = select.attrs.filter(item => item.name !== 'onchange');
  setAttr(select, 'data-language-switch', '');
  const body = find(doc, 'body');
  if (!find(body, 'a', 'class', 'skip-link')) insert(body, `<a class="skip-link" href="#main-content">${e(home.skip)}</a>`, 0);
  const panel = find(doc, 'section', 'class', 'article-panel');
  if (panel) { setAttr(panel, 'id', 'main-content'); setAttr(panel, 'tabindex', '-1'); }
  const navigation = walk(body).find(node => node.tagName === 'script' && attr(node, 'src')?.split('?')[0] === '/scripts/navigation.js');
  if (navigation) setAttr(navigation, 'src', navigationSource);
  else insert(body, `<script src="${navigationSource}" defer></script>`);
  const theme = find(doc, 'meta', 'name', 'theme-color');
  if (theme) setAttr(theme, 'content', '#ffffff');
  for (const node of walk(find(doc, 'footer')).filter(node => node.nodeName === '#text' && node.value.includes('ScreensTogether'))) node.value = node.value.replaceAll('ScreensTogether', 'Screens Together');
}
