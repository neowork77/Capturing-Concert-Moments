const postgres = require('postgres');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ No DATABASE_URL");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  console.log("Creating admin_sessions table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "admin_sessions" (
      "line_user_id" text PRIMARY KEY NOT NULL,
      "step" text NOT NULL,
      "draft_booking" jsonb NOT NULL,
      "updated_at" bigint NOT NULL
    );
  `;

  console.log("✅ admin_sessions table created successfully!");
  await sql.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
