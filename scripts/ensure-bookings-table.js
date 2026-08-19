const postgres = require('postgres');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("No DATABASE_URL");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  console.log("Creating bookings table if not exists...");
  await sql`
    CREATE TABLE IF NOT EXISTS "bookings" (
      "id" serial PRIMARY KEY NOT NULL,
      "date" text NOT NULL,
      "event_name" text NOT NULL,
      "time_slot" text NOT NULL,
      "customer_name" text NOT NULL,
      "customer_phone" text NOT NULL,
      "line_display_name" text,
      "line_user_id" text,
      "status" text DEFAULT 'pending' NOT NULL,
      "notes" text,
      "created_at" bigint NOT NULL
    );
  `;

  console.log("✅ bookings table created successfully!");
  await sql.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
