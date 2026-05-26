import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { pool, initDb, genNick } from "./db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

function slug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "-").slice(0, 30);
  return `${base || "v"}-${uuidv4().slice(0, 8)}`;
}

/* ─── Health ─── */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ─── User ─── */
app.post("/api/user", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  let r = await pool.query("SELECT id, nickname FROM users WHERE id = $1", [userId]);
  if (!r.rows.length) {
    const nick = genNick();
    r = await pool.query("INSERT INTO users (id, nickname) VALUES ($1, $2) RETURNING id, nickname", [userId, nick]);
  }
  res.json(r.rows[0]);
});

/* ─── Feed ─── */
app.get("/api/videos", async (req, res) => {
  const lim = Math.min(Number(req.query.limit) || 10, 50);
  const off = Number(req.query.offset) || 0;
  const uid = String(req.query.userId || "");
  const q = `
    SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
      v.views, v.likes, v.created_at, v.user_id, v.audio_title,
      u.nickname AS user_nickname,
      (SELECT count(*) FROM comments c WHERE c.video_id=v.id) AS comment_count,
      ${uid ? "(SELECT count(*)>0 FROM likes l WHERE l.video_id=v.id AND l.user_id=$3)" : "false"} AS is_liked
    FROM videos v JOIN users u ON v.user_id=u.id
    ORDER BY v.created_at DESC LIMIT $1 OFFSET $2`;
  const r = await pool.query(q, uid ? [lim, off, uid] : [lim, off]);
  const tot = await pool.query("SELECT count(*) FROM videos");
  res.json({ videos: r.rows, total: Number(tot.rows[0].count), hasMore: off + lim < Number(tot.rows[0].count) });
});

/* ─── User videos ─── */
app.get("/api/users/:uid/videos", async (req, res) => {
  const { uid } = req.params;
  const me = String(req.query.userId || "");
  const q = `
    SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
      v.views, v.likes, v.created_at, v.user_id, v.audio_title,
      u.nickname AS user_nickname,
      (SELECT count(*) FROM comments c WHERE c.video_id=v.id) AS comment_count,
      ${me ? "(SELECT count(*)>0 FROM likes l WHERE l.video_id=v.id AND l.user_id=$2)" : "false"} AS is_liked
    FROM videos v JOIN users u ON v.user_id=u.id
    WHERE v.user_id=$1 ORDER BY v.created_at DESC`;
  const r = await pool.query(q, me ? [uid, me] : [uid]);
  res.json(r.rows);
});

/* ─── Single video ─── */
app.get("/api/videos/:slug", async (req, res) => {
  const uid = String(req.query.userId || "");
  const q = `
    SELECT v.id, v.slug, v.title, v.description, v.file_type, v.file_size,
      v.views, v.likes, v.created_at, v.user_id, v.audio_title,
      u.nickname AS user_nickname,
      (SELECT count(*) FROM comments c WHERE c.video_id=v.id) AS comment_count,
      ${uid ? "(SELECT count(*)>0 FROM likes l WHERE l.video_id=v.id AND l.user_id=$2)" : "false"} AS is_liked
    FROM videos v JOIN users u ON v.user_id=u.id WHERE v.slug=$1`;
  const r = await pool.query(q, uid ? [req.params.slug, uid] : [req.params.slug]);
  if (!r.rows.length) return res.status(404).json({ error: "Not found" });
  pool.query("UPDATE videos SET views=views+1 WHERE slug=$1", [req.params.slug]);
  res.json(r.rows[0]);
});

/* ─── Stream ─── */
app.get("/api/videos/:slug/stream", async (req, res) => {
  const r = await pool.query("SELECT file_data, file_type, file_size FROM videos WHERE slug=$1", [req.params.slug]);
  if (!r.rows.length || !r.rows[0].file_data) return res.status(404).end();
  const { file_data, file_type, file_size } = r.rows[0];
  const buf: Buffer = file_data;
  const size = Number(file_size);
  const range = req.headers.range;
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": file_type,
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buf.slice(start, end + 1));
  } else {
    res.writeHead(200, {
      "Content-Length": size,
      "Content-Type": file_type,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(buf);
  }
});

/* ─── Audio stream ─── */
app.get("/api/videos/:slug/audio", async (req, res) => {
  const r = await pool.query("SELECT audio_data, audio_type FROM videos WHERE slug=$1", [req.params.slug]);
  if (!r.rows.length || !r.rows[0].audio_data) return res.status(404).end();
  res.writeHead(200, { "Content-Type": r.rows[0].audio_type, "Cache-Control": "public, max-age=86400" });
  res.end(r.rows[0].audio_data);
});

/* ─── Upload ─── */
app.post("/api/upload", upload.fields([{ name: "files", maxCount: 10 }, { name: "audio", maxCount: 1 }]),
  async (req, res) => {
    const files = (req.files as Record<string, Express.Multer.File[]>)?.files || [];
    const audios = (req.files as Record<string, Express.Multer.File[]>)?.audio || [];
    if (!files.length) return res.status(400).json({ error: "No files" });
    const { title = "Untitled", description = "", userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const s = slug(title);
    const f = files[0];
    const r = await pool.query(
      `INSERT INTO videos (slug, title, description, user_id, file_data, file_type, file_size, audio_data, audio_type, audio_title)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, slug, title, description, user_id, file_type, file_size, views, likes, created_at, audio_title`,
      [s, title.slice(0, 200), description.slice(0, 1000), userId,
       f.buffer, f.mimetype, f.size,
       audios[0]?.buffer || null, audios[0]?.mimetype || null, audios[0]?.originalname || null]
    );
    const u = await pool.query("SELECT nickname FROM users WHERE id=$1", [userId]);
    res.json({ ...r.rows[0], user_nickname: u.rows[0].nickname, comment_count: 0, is_liked: false });
  }
);

/* ─── Delete ─── */
app.delete("/api/videos/:slug", async (req, res) => {
  const { userId } = req.body;
  const v = await pool.query("SELECT user_id FROM videos WHERE slug=$1", [req.params.slug]);
  if (!v.rows.length) return res.status(404).json({ error: "Not found" });
  if (v.rows[0].user_id !== userId) return res.status(403).json({ error: "Forbidden" });
  await pool.query("DELETE FROM videos WHERE slug=$1", [req.params.slug]);
  res.json({ ok: true });
});

/* ─── Like ─── */
app.post("/api/videos/:slug/like", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const v = await pool.query("SELECT id FROM videos WHERE slug=$1", [req.params.slug]);
  if (!v.rows.length) return res.status(404).json({ error: "Not found" });
  const vid = v.rows[0].id;
  const ex = await pool.query("SELECT id FROM likes WHERE video_id=$1 AND user_id=$2", [vid, userId]);
  let liked: boolean;
  if (ex.rows.length) {
    await pool.query("DELETE FROM likes WHERE video_id=$1 AND user_id=$2", [vid, userId]);
    await pool.query("UPDATE videos SET likes=GREATEST(0,likes-1) WHERE id=$1", [vid]);
    liked = false;
  } else {
    await pool.query("INSERT INTO likes (video_id, user_id) VALUES ($1,$2)", [vid, userId]);
    await pool.query("UPDATE videos SET likes=likes+1 WHERE id=$1", [vid]);
    liked = true;
  }
  const up = await pool.query("SELECT likes FROM videos WHERE id=$1", [vid]);
  res.json({ liked, likes: Number(up.rows[0].likes) });
});

/* ─── Comments ─── */
app.get("/api/videos/:slug/comments", async (req, res) => {
  const v = await pool.query("SELECT id FROM videos WHERE slug=$1", [req.params.slug]);
  if (!v.rows.length) return res.status(404).json({ error: "Not found" });
  const r = await pool.query(
    "SELECT c.id, c.text, c.created_at, u.nickname AS user_nickname FROM comments c JOIN users u ON c.user_id=u.id WHERE c.video_id=$1 ORDER BY c.created_at DESC LIMIT 100",
    [v.rows[0].id]
  );
  res.json(r.rows);
});

app.post("/api/videos/:slug/comments", async (req, res) => {
  const { text, userId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Text required" });
  if (!userId) return res.status(400).json({ error: "userId required" });
  const v = await pool.query("SELECT id FROM videos WHERE slug=$1", [req.params.slug]);
  if (!v.rows.length) return res.status(404).json({ error: "Not found" });
  const r = await pool.query(
    "INSERT INTO comments (video_id, user_id, text) VALUES ($1,$2,$3) RETURNING id, text, created_at",
    [v.rows[0].id, userId, text.slice(0, 500)]
  );
  const u = await pool.query("SELECT nickname FROM users WHERE id=$1", [userId]);
  res.json({ ...r.rows[0], user_nickname: u.rows[0].nickname });
});

/* ─── Static + SPA ─── */
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

/* ─── Error ─── */
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("ERR:", err.message);
  res.status(500).json({ error: "Server error" });
});

/* ─── Start ─── */
export function startServer() {
  initDb()
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server on :${PORT}`);
      });
    })
    .catch((e) => {
      console.error("DB init failed:", e.message);
      // Start anyway so healthcheck works and we can debug
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server on :${PORT} (DB init failed)`);
      });
    });
}

// Direct execution
if (process.argv[1] && (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"))) {
  startServer();
}
