# ScreensTogether Website

Static landing, support, help, and privacy pages for ScreensTogether.

Production domain:

```text
https://screens-together.luopeike.com
```

## Structure

- Root pages act as the default English entry points.
- `en-US/`, `zh-Hans/`, `zh-Hant/`, `es-ES/`, `fr-FR/`, `de-DE/`, `ja/`, and `ko/` provide localized page paths.
- Every localized page includes canonical, Open Graph, Twitter card, and `hreflang` metadata.
- `sitemap.xml` lists all localized landing, help, support, and privacy pages.
- `robots.txt` points crawlers to the sitemap.

## Local Check

Serve the folder with any static HTTP server:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/en-US/index.html
```
