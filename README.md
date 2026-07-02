# Scheduled Blog Posts with Astro + CloudCannon

A demo Astro site showing how to **schedule blog posts to publish in the future**, built for visual editing in [CloudCannon](https://cloudcannon.com/).

Give a post a future date and it stays out of the build — no page, no listing, nothing in the feed — until a build runs on or after that date, at which point it goes live automatically. CloudCannon handles the timing by reading a generated `_schedule.txt` and triggering a rebuild at each scheduled moment.

See a [demo site](https://tranquil-artichoke.cloudvent.net/).

## How it works

Three pieces, plus CloudCannon's scheduled-builds feature:

| Piece | Responsibility |
| ----- | -------------- |
| `src/utils/posts.ts` | `getPublishedPosts()` returns only posts whose `post_hero.date` is at or before build time, newest first. Every place that lists or routes posts uses it. |
| `scripts/generate-schedule.mjs` | Scans post front matter, finds future dates, and writes a `_schedule.txt` line per scheduled post. |
| `.cloudcannon/postbuild` | Runs the generator after `astro build`, writing `dist/_schedule.txt` into the build output (alongside the Pagefind step). |
| CloudCannon scheduled builds | Reads `_schedule.txt` from the site output and triggers a fresh build at each timestamp. |

Because the build is static, "now" is frozen at build time. A future-dated post is simply absent from that build. The next build — triggered by the schedule — sees its date has passed and includes it. No manual step, no unpublished draft sitting in production.

### Excluding future posts everywhere

A scheduled post must not leak into *any* output, so all five places that read the blog collection go through `getPublishedPosts()` instead of `getCollection("blog")`:

- `src/pages/blog/[slug].astro` — per-post routes (a future post has no page → 404 until published)
- `src/pages/blog/[...page].astro` — paginated blog index
- `src/pages/tags/[tag]/[...page].astro` — tag pages
- `src/pages/feed.xml.js` — RSS feed
- `src/layouts/Post.astro` — "Recent Posts" related list

### The schedule file format

`_schedule.txt` is comma-separated, one scheduled build per line:

```
2026-10-22T10:00:00+00:00,Publish Post,src/content/blog/because-of-the-internet.mdx
```

`<ISO 8601 timestamp (UTC)>,<label>,<source path>`. It lands at the **root of the build output** (`dist/_schedule.txt`), where CloudCannon looks for it.

## Authoring a scheduled post

Set the post's `post_hero.date` to a future date/time. That's it — it's the standard date input in the CloudCannon editor, no special field:

```yaml
post_hero:
  date: 2026-10-22T10:00:00+00:00
  heading: Because of the Internet
  # ...
```

Dates compare in absolute (UTC) time, so the timezone offset in the value is respected.

## Local development

```bash
npm install
npm run dev      # future-dated posts are excluded here too
```

Generate the schedule file on demand (writes to `dist/_schedule.txt` — run a build first, or pass a path):

```bash
npm run build            # astro build (postbuild generates dist/_schedule.txt on CloudCannon)
npm run schedule         # regenerate dist/_schedule.txt
npm run schedule -- /tmp/_schedule.txt   # write somewhere else to inspect
```

> The `.cloudcannon/postbuild` hook runs automatically on CloudCannon builds. A plain local `npm run build` does **not** run it — invoke `npm run schedule` after building if you want the file locally.

## CloudCannon setup

Connect the repository and CloudCannon detects `.cloudcannon/initial-site-settings.json` and builds automatically. The editing experience is defined in `cloudcannon.config.yml`.

To make scheduled dates actually trigger builds, enable **scheduled builds** for the site so CloudCannon reads `_schedule.txt`. See [`.cloudcannon/README.md`](.cloudcannon/README.md) for the CloudCannon-side details.

## Project structure

```
├── .cloudcannon/
│   ├── postbuild              # pagefind + schedule generation
│   ├── initial-site-settings.json
│   └── README.md              # CloudCannon-side setup notes
├── scripts/
│   └── generate-schedule.mjs  # writes _schedule.txt from post dates
├── cloudcannon.config.yml
└── src/
    ├── utils/posts.ts         # getPublishedPosts() — the publish gate
    ├── content/blog/          # MDX posts (post_hero.date drives scheduling)
    ├── pages/                 # routes (all filter via getPublishedPosts)
    └── layouts/               # Post.astro "Recent Posts" also filters
```
