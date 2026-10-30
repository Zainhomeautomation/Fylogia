# Fylogia brand assets

The owner supplied and approved `imageFYLOGIA.png`: cream tapered serif F, layered sage paper/leaf forms, Midnight Navy background and “Your World, One Page at a Time.” The SVG is an outlined reconstruction of that mark, preserving its curved spine, upper terminal, two leaves and proportions, with deliberately simpler shading for small sizes. It is not a crop of the presentation or a claim of pixel-identical raster reproduction. The existing Georgia editorial wordmark remains live text and accessible. No font is embedded in the mark. Reference SHA-256: `07b66af7181911842fae952df6cfa24018b75791db32f679a7830c2615110548`.

## Assets and placement

- `public/brand/fylogia-mark{,-light,-monochrome,-monochrome-inverse}.{svg,png}`: transparent full-color/one-ink variants. Cream for Navy/Green, dark stem for Light. Decorative beside the visible Fylogia name or a labeled loading/empty state.
- `public/brand/app-icon-master.svg` and `app-icon-1024.png`: full-bleed Navy master; opaque RGB PNG, no pre-rounded corners. Light-background SVG/PNG variant also provided. These are reusable artwork, not a native application or App Store submission.
- `public/favicon.svg`, `favicon.ico` (16/32/48 PNG entries), and `favicon-{16,32,48}x{16,32,48}.png`: browser/bookmark icons. `icon.svg` remains a compatible old URL.
- `public/apple-touch-icon.png`: 180×180, opaque.
- `public/icons/icon-{192,512}.png`: ordinary PWA icons; `maskable-512.png` has a separate 80%-circle-safe composition. The manifest ID, start URL and scope are retained.
- `public/brand/social-card.{svg,png}`: 1200×630 editorial preview with the mark, name, official tagline and domain. HTML specifies Open Graph dimensions/alternative text and a large-image card.
- `public/brand/assets.json`: exact exported byte sizes and SHA-256 integrity inventory.

The homepage has one visible tagline; other sections do not repeat it. Header logos have reserved dimensions, use the existing appearance setting, and retain text labels. Brand SVGs and installation icons are explicitly cached by the existing worker; large export masters/social artwork are not added to the installation precache. No user-library keys, database versions or publisher content are changed.

## Optional reproducible export

The application and CI use committed assets and need no new dependencies. To regenerate, install design-time tools in a temporary directory outside the repository:

```sh
npm install --prefix /tmp/fylogia-brand-tools --no-audit --no-fund --ignore-scripts @resvg/resvg-js@2.6.2 sharp@0.35.5
FYLOGIA_BRAND_TOOLS=/tmp/fylogia-brand-tools node scripts/generate-brand-assets.mjs
```

`brand-artwork.mjs` is the source artwork. Mark/icon rendering is font-independent. The social-card PNG uses the machine's Georgia font (system serif fallback); regenerate that card on a machine with Georgia to match the committed export. SVG files use no external images or scripts. The 1024 master omits an alpha channel; native platforms may impose additional asset requirements when an application is actually created.

## Limited visual-conflict screening — 30 October 2026

This is a reasonable visual comparison, not a trademark clearance, ownership guarantee, exhaustive registry search or reverse-image match. No significant close visual match was identified in the reviewed examples, so publication proceeds under the owner's approved reference. Inferences below concern visual similarity, not legal rights.

| Example | Finding / potential overlap | Assessment |
|---|---|---|
| [Flipboard official brand guide](https://cdn.flipboard.com/wp-content/uploads/2014/12/Flipboard-Basic-Brand-Guidelines-2018.pdf) | Same initial and news/magazine category; its geometric window/F and red palette differ from the curved serif and sage pages | Low visual similarity; shared-category consideration |
| [Feedly](https://feedly.com/) / [public logo reference](https://commons.wikimedia.org/wiki/File:Feedly_Logo.svg) | Green, layered feed motif; angular diamond/bars rather than a serif F | Low visual similarity; shared color/reading metaphor |
| [Flipsnack](https://www.flipsnack.com/) | Blue folded-book/page mark, different name and silhouette | Low visual similarity; shared publishing metaphor |
| [Feeder](https://f-droid.org/en/packages/com.nononsenseapps.feeder/) | White geometric F on bright green in the same RSS category; lacks curved serif/paper leaves | Low visual similarity; shared initial/category |
| [Stock F/leaf monograms](https://depositphotos.com/vector/letter-leaf-font-vector-logo-icon-design-isolated-white-background-511299980.html) | Serif F with botanical elements is not a unique idea; reviewed stock examples have a conventional crossbar and attached leaves rather than two swept paper forms | Medium conceptual overlap; no matching specific geometry found |
| [Fyllo agriculture](https://www.fyllo.in/) | Green technology identity and similar initial/name sounds; reviewed mark is circular/geometric, not this serif/page mark | Low visual similarity; this task does not repeat the earlier name/trademark audit |

Feedly's press URL redirected to its client-side reader; a current official press-kit review could not be completed. Public visual references were used with that limitation. Broad image-search/stock results cannot establish that no unindexed or registered similar mark exists. Competitor/stock artwork was not copied into the application or asset pack.

Search engines control favicon/social-card crawling, cache refresh and display eligibility. Correct paths and metadata do not guarantee immediate or any search-result appearance. Existing installed PWA/browser icons may retain an older cached representation until the browser or OS refreshes it. Physical iOS installation/icon appearance requires a separate device check.
