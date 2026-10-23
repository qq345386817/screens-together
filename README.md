# ScreensTogether Website

Static landing, support, help, and privacy pages for ScreensTogether.

Production domain:

```text
https://screens-together.luopeike.com
```

## Structure

- Root pages are the canonical English entry points. Legacy `en-US/` paths redirect to them.
- `zh-Hans/`, `zh-Hant/`, `es-ES/`, `fr-FR/`, `de-DE/`, `ja/`, and `ko/` provide localized page paths.
- Pages use Cloudflare Pages clean URLs, for example `/zh-Hans/` and `/zh-Hans/help`, not redirected `.html` URLs.
- Every page includes consistent canonical, Open Graph, JSON-LD, and reciprocal `hreflang` metadata.
- `sitemap.xml` lists 32 canonical landing, help, support, and privacy URLs, with Git-derived modification dates.
- `robots.txt` points crawlers to the sitemap.
- `content/help.json` contains the eight localized setup instructions and questions. Generated HTML is committed and works without JavaScript rendering.
- `content/home.json` and `scripts/home.mjs` generate the eight localized homepages: product overview, setup, actual macOS interface, platform roles, and native disclosure questions.
- `style/tokens.css` delivers the shared light-theme palette; `style/base.css` owns responsive layouts and accessible controls. The design-system source and design canvas are in the App workspace at `Design/WebsiteSystem/` and `Design/WebsiteRefresh/`.
- `scripts/navigation.js` only handles language selection. Core content, navigation, setup links, and disclosure questions do not depend on JavaScript rendering.
- `images/README.md` records which images are conceptual and which are actual app captures. Screenshots are localized, compressed, and lazy-loaded; the hero has eager priority and explicit dimensions.
- `llms.txt` is optional agent navigation, not a Google ranking feature. It must stay consistent with the visible pages.
- `_redirects` and `_headers` are Cloudflare Pages configuration files; upload them alongside the HTML files.

## Local Check

Use Node.js 22 or newer. Development dependencies are parsers only; the deployed site has no runtime dependency on them:

```sh
npm ci --ignore-scripts
npm run sync
npm test
npm run preview
```

Then open:

```text
http://127.0.0.1:4173/zh-Hans/
```

After deployment, run `npm run test:live`. It verifies all 32 canonical pages return HTTP 200 without redirects, legacy English redirects, sitemap entries, image/link paths, email protection guards, `llms.txt`, and a true 404 for unknown URLs. Check deployment results before submitting the sitemap or requesting indexing in Google Search Console.

Do not reset `lastmod` dates just to request recrawling, add fabricated reviews/ratings, or promise frame-perfect synchronization. See `SEO_NOTES.md` for the GSC findings and indexing limitations.
