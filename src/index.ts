import { drizzle } from "drizzle-orm/d1";
import { HTTPException } from "hono/http-exception";
import { legacyLinks, links } from "./schema";
import { Hono } from "hono";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.text(":)"));

app.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  let id = Number(c.req.param("id"));
  if (!id) {
    const legacyId = c.req.param("id");
    if (legacyId.match(/^....$/)) {
      const legacyLink = await db
        .select()
        .from(legacyLinks)
        .where(eq(legacyLinks.id, legacyId))
        .get();
      if (legacyLink) {
        id = legacyLink.newId;
      }
    }
  }
  if (!id) {
    throw new HTTPException(400, { message: "Invalid ID" });
  }
  const link = await db.select().from(links).where(eq(links.id, id)).get();
  if (!link) {
    throw new HTTPException(404, { message: "Not found" });
  }
  const targetUrl = new URL(link.url);
  if (navigator.sendBeacon) {
    const query = new URLSearchParams();
    query.set("hostname", new URL(c.req.url).hostname);
    query.set("action", "social");
    query.set("site", targetUrl.hostname);
    const body = new URLSearchParams();
    body.set("t", new Date().toJSON());
    navigator.sendBeacon(
      `https://us-central1-wonderful-software.cloudfunctions.net/webring-notify?${query}`,
      body
    );
  }
  return c.redirect(link.url);
});

app.post("/links", async (c) => {
  const apiKey = c.req.header("x-api-key");
  console.log(c.env.API_KEY);
  if (!apiKey || apiKey !== c.env.API_KEY) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  let { url, forceId } = await c.req.json();
  if (!url || typeof url !== "string") {
    throw new HTTPException(400, { message: "Invalid URL" });
  }
  url = new URL(url).toString();
  const force = forceId ? { id: Number(forceId) } : {};
  const db = drizzle(c.env.DB);
  const inserted = await db
    .insert(links)
    .values({ url, ...force })
    .returning({ insertedId: links.id })
    .onConflictDoNothing()
    .get();
  let id: number | undefined = inserted?.insertedId;
  if (!id) {
    const existing = await db
      .select()
      .from(links)
      .where(eq(links.url, url))
      .get();
    id = existing?.id;
  }
  const linkUrl = `${new URL(c.req.url).origin}/${id}`;
  return c.json({ url: linkUrl });
});

export type Env = {
  DB: D1Database;
  API_KEY: string;
};

export default app;
