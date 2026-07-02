# CloudCannon configuration

How this site is wired for CloudCannon, with a focus on the **scheduled blog posts** feature.

## Files in this directory

| File | Purpose |
| ---- | ------- |
| `initial-site-settings.json` | Build settings CloudCannon applies when the site is first created (build command, output path, etc.). |
| `postbuild` | Build hook run **after** `astro build`. Runs Pagefind indexing, then generates `_schedule.txt`. |
| `schemas/` | Front matter templates used when editors create new collection items. |

The editing experience (collections, inputs, components) lives in `../cloudcannon.config.yml`.

## Scheduled builds

This is what turns a future post date into an automatic publish — and an unpublish date into an automatic removal. A post is included in the build only while `post_hero.date <= now < post_hero.unpublish_date` (see `../src/utils/posts.ts`).

1. A post is given a `post_hero.date` in the future (and/or an optional `post_hero.unpublish_date`). The build excludes it whenever it is outside its publish window.
2. The `postbuild` hook runs `node scripts/generate-schedule.mjs dist/_schedule.txt`, writing a line for each future boundary into the build output root — a `Publish Post` line per future publish date and an `Unpublish Post` line per future unpublish date:

   ```
   2026-10-22T10:00:00+00:00,Publish Post,src/content/blog/because-of-the-internet.mdx
   2026-12-01T10:00:00+00:00,Unpublish Post,src/content/blog/limited-time-announcement.mdx
   ```

3. CloudCannon reads `_schedule.txt` from the published output and **schedules a build at each timestamp**.
4. When that build runs, the boundary has passed — a post whose publish date arrived is now included; a post whose unpublish date arrived is now excluded — with no manual action.

### Enabling it

Scheduled builds must be turned on for the site in CloudCannon (so it reads `_schedule.txt` from the output). See CloudCannon's [scheduled builds documentation](https://cloudcannon.com/documentation/) for the current dashboard location and any plan requirements.

### Why `postbuild` and not the build command

`_schedule.txt` must sit at the **root of the build output** (`dist/`). The `postbuild` hook runs after `astro build`, when `dist/` exists, and writes straight into it — exactly like the Pagefind step in the same hook. This keeps the schedule file out of source control and always in sync with the posts that were actually built.

If you'd rather generate it before the build, write to `public/_schedule.txt` instead (Astro copies `public/` to the output root) and move the command to a `prebuild` hook.

## Build hook reference

`postbuild` currently runs:

```sh
npx -y pagefind --site dist                       # static search index
node scripts/generate-schedule.mjs dist/_schedule.txt   # scheduled-build manifest
```
