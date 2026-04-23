import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const toFrontmatter = (data) => {
  const lines = ["---"];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          lines.push("  -");
          for (const [nestedKey, nestedValue] of Object.entries(item)) {
            lines.push(`      ${nestedKey}: ${JSON.stringify(nestedValue)}`);
          }
        } else {
          lines.push(`  - ${JSON.stringify(item)}`);
        }
      }
      continue;
    }

    if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
      continue;
    }

    lines.push(`${key}: ${JSON.stringify(value)}`);
  }

  lines.push("---", "");
  return lines.join("\n");
};

const authors = [
  {
    name: "Carlo ter Woord",
    slug: "carlo-ter-woord",
    bio: "Maker and breaker of things. Writes occasionally. Fascinated by underdogs and simplicity.",
    avatar: "https://www.carloterwoord.com/_vercel/image?url=%2Fimg%2Fprofiel-foto-carlo-675x675.webp&w=1536&q=100",
    socialLinks: [
      { label: "Twitter", url: "#" },
      { label: "LinkedIn", url: "#" },
      { label: "Instagram", url: "#" },
      { label: "Website", url: "#" }
    ]
  }
];

const categories = [
  {
    name: "Underdog Principles",
    slug: "underdog-principles",
    description: "Everything you can listen to, we put here."
  },
  {
    name: "The Business of Making",
    slug: "the-business-of-making",
    description: "Stories and lessons about making a sustainable creative business."
  },
  {
    name: "Category",
    slug: "category",
    description: "General episodes and articles."
  }
];

const posts = [
  {
    title: "I've been trying to find something that appears not to exist.",
    slug: "ive-been-trying-to-find-something-that-appears-not-to-exist",
    date: "2025-02-09",
    excerpt:
      "<section><p>You used to be yourself, authentically and unapologetically. Whether in business meetings or social gatherings, your uniqueness was your strength.</p><p>Today, most people are copies. Not original, but <em>replicated</em>. <u class=\"underline--wavy\">Following the latest trends</u> enters you into an endless <u>cycle of conformity.</u></p></section>",
    author: "carlo-ter-woord",
    categories: ["category"],
    tags: ["Underdogs", "Less but better", "First principles"],
    coverImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop",
    readTime: "4 min read",
    draft: false,
    body: `You used to be yourself, authentically and unapologetically. Whether in business meetings or social gatherings, your uniqueness was your strength. And it was beautiful.

Today, most people are copies. Not original, but *replicated*. <u class="underline--wavy">Following the latest trends</u> enters you into an endless <u>cycle of conformity.</u> Every day you wake up trying to be <u class="underline--red">someone else's version</u> of success.

<blockquote>
  <q>Simply put, we get more work done, quicker, and better. <mark class="highlight--blue">Productivity is up. Errors are down. Clients are happier.</mark></q>
  <cite>Patrick Sheffield, Moore Communications Group</cite>
</blockquote>

## Introducing Built by Underdogs, a movement to help people find their voice.

<mark class="highlight--yellow">For nearly two decades, the personal branding playbook has benefited the loud and the privileged.</mark> With carefully curated feeds and filters, careers have soared on the backs of people pressured to fit into boxes they never belonged in.

### This is about two fundamental beliefs

- Embrace what makes you different.
- We guide the journey, you write the story.
- We provide the framework, you bring the authenticity.
- Raw and real, not polished and performative.

<section>
  <div class="details">
    <details>
      <summary><p>Focus on less</p></summary>
      <article>
        <p>By doing less, you focus on what’s essential, the basics, and the fundamentals.</p>
      </article>
    </details>
  </div>
</section>

<figure>
  <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop" alt="A descriptive alt text" loading="lazy" />
  <figcaption>Image description here.</figcaption>
</figure>

<figure>
  <div class="iframe__video-wrapper">
    <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen loading="lazy"></iframe>
  </div>
  <figcaption>Best video ever.</figcaption>
</figure>

<iframe
  src="https://open.spotify.com/embed/episode/18Rzzn04BEgVDMxvsaRes6?utm_source=generator&t=0"
  width="100%"
  height="152"
  frameborder="0"
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture;"
  loading="lazy"
></iframe>

The era of the Underdog is just beginning. Stay true.`
  },
  {
    title: "The Power of Simplicity: Why Less is Always More",
    slug: "the-power-of-simplicity-why-less-is-always-more",
    date: "2025-02-04",
    excerpt:
      "<section><p>In a world overflowing with choices, noise, and distractions, simplicity is becoming the ultimate luxury.</p></section><section><p>Simplicity allows for clarity. When you keep things simple, you make space for better decisions and less confusion.</p></section>",
    author: "carlo-ter-woord",
    categories: ["underdog-principles"],
    tags: ["Simplicity", "Principles"],
    coverImage: "",
    readTime: "3 min read",
    draft: false,
    body: `In a world overflowing with choices, noise, and distractions, simplicity is becoming the ultimate luxury.

Simplicity allows for clarity. When you keep things simple, you make space for better decisions and less confusion.

- Embrace what makes you different.
- We guide the journey, you write the story.
- We provide the framework, you bring the authenticity.
- Raw and real, not polished and performative.`
  },
  {
    title: "How Simplicity Drives Innovation: Embracing Less-is-More",
    slug: "how-simplicity-drives-innovation-embracing-less-is-more",
    date: "2025-02-01",
    excerpt:
      "<section><p>Innovation is often seen as complex, a realm for the overly ambitious. But in reality, simplicity is the true catalyst for groundbreaking ideas.</p></section>",
    author: "carlo-ter-woord",
    categories: ["the-business-of-making"],
    tags: ["Innovation", "Business"],
    coverImage:
      "https://images.unsplash.com/photo-1726137569906-14f8079861fa?q=80&w=1770&auto=format&fit=crop",
    readTime: "5 min read",
    draft: false,
    body: `Innovation is often seen as complex, a realm for the overly ambitious, with intricate solutions for complicated problems. But in reality, simplicity is the true catalyst for groundbreaking ideas.

There’s this idea that innovation has to be complicated. But some of the most groundbreaking ideas are actually the simplest ones.

That clarity is where innovation lives. Not in the fluff, but in the function.`
  }
];

const dedupe = (items, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const writeCollection = async (collection, items, bodySelector = null) => {
  const dir = path.join(root, "src", "content", collection);
  await ensureDir(dir);

  for (const item of items) {
    const { body, ...frontmatter } = item;
    const fm = toFrontmatter(frontmatter);
    const fileContent = `${fm}${bodySelector ? bodySelector(item) : body || ""}\n`;
    await fs.writeFile(path.join(dir, `${item.slug}.md`), fileContent, "utf8");
  }
};

const run = async () => {
  const dedupedPosts = dedupe(posts, (post) => `${post.title}|${post.date}`);

  await writeCollection("authors", authors.map((author) => ({ ...author, body: "" })));
  await writeCollection("categories", categories.map((category) => ({ ...category, body: "" })));
  await writeCollection("posts", dedupedPosts);

  console.log(`Seeded ${authors.length} authors, ${categories.length} categories, ${dedupedPosts.length} posts.`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
