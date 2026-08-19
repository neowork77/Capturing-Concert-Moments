const postgres = require('postgres');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ No DATABASE_URL");
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  console.log("Adding deposit_amount column to bookings table if not exists...");
  await sql`
    ALTER TABLE "bookings" 
    ADD COLUMN IF NOT EXISTS "deposit_amount" integer DEFAULT 0;
  `;

  console.log("✅ deposit_amount column added successfully!");
  await sql.end();
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
