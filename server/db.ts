import { Pool } from "pg";

const connString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  "postgresql://postgres:DVdHIeNDcAFoRjeZNHDWtyNpWOitDQNK@zephyr.proxy.rlwy.net:34640/railway";

export const pool = new Pool({
  connectionString: connString,
  ssl: connString.includes("railway.internal") ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        nickname TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_data BYTEA,
        file_type TEXT,
        file_size BIGINT DEFAULT 0,
        audio_data BYTEA,
        audio_type TEXT,
        audio_title TEXT,
        views BIGINT DEFAULT 0,
        likes BIGINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(video_id, user_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comments_vid ON comments(video_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_likes_vid ON likes(video_id);`);
    console.log("DB ready");
  } finally {
    client.release();
  }
}

export function genNick(): string {
  return `Anonymous#${Math.floor(10000000 + Math.random() * 90000000)}`;
}
