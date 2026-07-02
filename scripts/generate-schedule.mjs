/**
 * Generates `_schedule.txt` from blog post dates.
 *
 * A post is only in the build while `post_hero.date <= now < unpublish_date`
 * (see src/utils/posts.ts). This script lists every future boundary of that
 * window so CloudCannon can trigger a build when the state changes:
 *   - a future `post_hero.date`          → the post goes live (Publish Post)
 *   - a future `post_hero.unpublish_date` → the post drops off (Unpublish Post)
 *
 * CloudCannon reads `_schedule.txt` from the build output root and triggers a
 * fresh build at each timestamp, at which point that boundary has passed and
 * the publish gate reflects the new state automatically. A single post can
 * contribute both a publish and an unpublish line.
 *
 * Runs from the `.cloudcannon/postbuild` hook, writing straight into the build
 * output (`dist/`) — the same way the pagefind step in that hook operates on
 * `dist`. Override the destination with the first CLI argument.
 *
 * Line format (one scheduled build per line):
 *   <ISO 8601 timestamp>,<Publish Post|Unpublish Post>,<source path>
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLOG_DIR = join(ROOT, "src/content/blog");
const OUTPUT = process.argv[2]
  ? resolve(process.argv[2])
  : join(ROOT, "dist/_schedule.txt");

/** Pull the `---` frontmatter block out of a markdown/MDX file and parse it. */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

/** Format a date as `2026-10-22T10:00:00+00:00` (UTC, no milliseconds). */
function toScheduleTimestamp(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

const now = Date.now();
const entries = [];

const files = (await readdir(BLOG_DIR)).filter((f) => /\.(md|mdx)$/.test(f));
for (const file of files) {
  const fullPath = join(BLOG_DIR, file);
  const data = parseFrontmatter(await readFile(fullPath, "utf8"));
  const sourcePath = relative(ROOT, fullPath);

  // Emit a scheduled build for each future boundary of the post's publish
  // window: its publish date and, if set, its unpublish date.
  const schedule = (raw, label) => {
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      console.warn(`[schedule] skipping ${file}: unparseable date "${raw}"`);
      return;
    }
    if (date.getTime() > now) {
      entries.push({ date, line: `${toScheduleTimestamp(date)},${label},${sourcePath}` });
    }
  };

  schedule(data?.post_hero?.date, "Publish Post");
  schedule(data?.post_hero?.unpublish_date, "Unpublish Post");
}

entries.sort((a, b) => a.date - b.date);
const contents = entries.map((e) => e.line).join("\n");
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, contents ? `${contents}\n` : "");

console.log(
  `[schedule] ${entries.length} scheduled build(s) written to ${relative(ROOT, OUTPUT)}`,
);
