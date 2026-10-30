# Website Images

`shared-canvas.jpg` is an AI-generated conceptual screen arrangement, not a photograph of a tested device wall. Generated with the built-in image generation tool, then encoded as a compressed JPEG. The image is labeled accordingly in all eight languages. Prompt: three abstract unbranded portrait/landscape displays sharing consecutive crops of a teal coastal panorama, warm yellow sun, white studio background, no logos, text, interface, or watermark. This is product explanation, not evidence of synchronization accuracy.

`mac-*.jpg` are compressed copies of the actual localized macOS controller captures from the October 25, 2026 native UI refresh (build 15). Source: `build/AppRefresh/mac-final-raw/macos_<locale>_host.png` in the App workspace. The capture's transparent shadow is flattened onto white at its original pixel dimensions; interface content is not reconstructed, stretched or generated. `mac-screenshots.json` records the capture date, source and output checksums, and dimensions for all eight languages. Generated homepages use these dimensions and a content-hashed image URL. A screenshot does not establish a multi-device performance claim.

To import a newly verified set on macOS, run `swift scripts/import-mac-screenshots.swift SOURCE_DIRECTORY YYYY-MM-DD`, then `npm run sync` and `npm test`. Keep raw captures outside this repository.

The app icon is the existing shared-canvas brand asset in `favicon/`; do not redraw it. `app-store-icon.svg` is the pre-existing store action icon.

The hero is eager-loaded with an explicit aspect ratio. App screenshots are lazy-loaded. No external fonts, image hosts, analytics, or animation libraries are needed.
