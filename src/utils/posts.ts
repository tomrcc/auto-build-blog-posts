import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/**
 * A post is "published" once its `post_hero.date` is at or before the moment
 * the site is built. Posts dated in the future are scheduled — they are kept
 * out of the build until a later build runs after their date has passed.
 *
 * The build is static, so "now" is frozen at build time. CloudCannon triggers
 * a fresh build at each scheduled date (see `public/_schedule.txt`, generated
 * by `scripts/generate-schedule.mjs`), at which point the post goes live.
 */
export function isPublished(post: Post, now: number = Date.now()): boolean {
  return new Date(post.data.post_hero.date).getTime() <= now;
}

/**
 * All published blog posts, newest first. Use this everywhere posts are listed
 * or paged so future-dated posts never leak into the build (index, tags, feed,
 * related posts, and the per-post routes).
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", (post) => isPublished(post));
  return posts.sort(
    (a, b) =>
      new Date(b.data.post_hero.date).getTime() -
      new Date(a.data.post_hero.date).getTime(),
  );
}
