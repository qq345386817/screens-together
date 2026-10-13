# SEO And Agent Readability

## GSC Findings

The 2026-10-13 inspection of the `https://screens-together.luopeike.com/` URL-prefix property showed a report last updated 2026-10-09: 8 indexed pages and 47 excluded pages. Reasons were 16 redirected pages, 5 alternate pages with canonical tags, 1 not-found URL, and 25 crawled-but-not-indexed URLs. No submitted sitemap was visible in the sitemap report at the initial check.

Excluded redirects and alternate pages are not automatically errors. Legacy `.html` and duplicate English URLs should not become separately indexed pages. The crawled-but-not-indexed list contained both clean URLs and redirected aliases, including the homepage; indexing of desired canonical pages still needs Google reassessment.

The 404 URL was `/cdn-cgi/l/email-protection`, a Cloudflare-managed email-obfuscation endpoint. The fix removes originating synthetic links by guarding the public mailto links with Cloudflare's documented `email_off` comments and disallows crawler access to that endpoint. It does not create a fake content page or redirect every missing URL to the homepage. Historical 404 entries may persist after deployment.

## Changes

- Use clean URLs consistently in canonical, language annotations, navigation, Open Graph, JSON-LD, and sitemap.
- Consolidate duplicate `en-US` paths into the root English pages with permanent redirects. Keep all eight language versions available through 32 canonical URLs.
- Explain the actual iPhone/iPad, native Mac multi-window, and Apple TV roles; add setup steps, troubleshooting, and realistic synchronization limitations in all eight languages.
- Preserve the existing brand update and publish the new app icon assets. Do not claim the App Store release has already been approved.
- Include WebSite, WebPage, SoftwareApplication, and breadcrumb data matching visible content. There are no fabricated reviews or ratings, or promises of FAQ rich results.
- Add a small, maintainable `llms.txt` with official page links. It has a `noindex` header to avoid indexing an auxiliary duplicate summary; agents can still fetch it.
- Validate source pages and deployment using HTML and XML parsers. Do not generate a new sitemap date without a real page change.

## References

- [Google AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): SEO fundamentals still apply. Google does not use `llms.txt` for ranking or visibility, and no special AI markup is required.
- [Canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): align canonical annotations, redirects, and sitemap preferences.
- [Cloudflare clean URLs](https://developers.cloudflare.com/pages/configuration/serving-pages/): HTML files redirect to extension-less paths.
- [Cloudflare email obfuscation](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/): use `email_off` comments for individual public email links.
- [llms.txt proposal](https://llmstxt.org/): an optional navigation convention, not an indexing guarantee.

## Follow-Up

Successful deployment, a successful sitemap submission, a positive live URL test, and an accepted indexing request are different from actual indexing. Record the observed GSC results rather than claiming all excluded pages have been indexed. Monitor canonical homepage/help URLs after Google recrawls; do not repeatedly request the same URL, submit duplicate aliases, or remove valid canonical pages to clear a report.

## 2026-10-13 Verification

The independent website repository changes were committed and pushed in logical batches: brand icons (`54c635d`), clean URLs and multilingual guidance (`e0c7d7b`), real unknown-path 404 responses (`d044d6d`), and deployed-link validation after Cloudflare consumes email guards (`b3f4df7`). Cloudflare Pages reported successful deployment for the last code revision. The App repository was not committed or changed by this website task.

`npm test` and `npm run test:live` passed. All 32 production canonical pages returned HTTP 200 without redirects and matched their canonical/language annotations. All 10 English aliases permanently redirected to the intended root pages. The deployed sitemap matched the 32 source entries. `llms.txt` returned `text/plain` with `X-Robots-Tag: noindex`, and unknown URLs returned HTTP 404 rather than the homepage. The production public mailto links survived without `/cdn-cgi/l/email-protection` replacements. Repeated generation was idempotent.

Chrome checks covered the default desktop viewport and 390 x 844 mobile viewport. Homepage, questions link, and English/Chinese language switching worked with clean URLs; images loaded, there was no horizontal overflow, and the relevant console checks returned no warnings or errors. Temporary viewport overrides were reset.

GSC live homepage testing at 10:59 Asia/Shanghai reported crawl success, crawling/indexing allowed, and the corrected canonical `https://screens-together.luopeike.com/`. One homepage indexing request was accepted. This is not evidence that it has already been indexed.

The sitemap submission was accepted, but its report still showed `Could not fetch`, unknown type, and 0 discovered pages. It was retried once after deployment and live checks; repeated submissions were not continued. GSC's separate live test of `sitemap.xml` at 11:02:44 reported successful crawling. Public normal and Googlebot-user-agent HTTP checks returned 200 with `application/xml`, and HTML/XML parser validation passed. The mismatch between the sitemap report and successful live fetch remains unresolved; processing delay is a possibility, not a confirmed cause. Recheck this report after Google processes the submission, and investigate host/CDN logs if it persists. Do not report the sitemap as successfully read or all 47 excluded URLs as fixed/indexed.
