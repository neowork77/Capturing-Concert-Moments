const { google } = require('googleapis');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { pgTable, serial, text, bigint, jsonb } = require('drizzle-orm/pg-core');
const path = require('path');
const fs = require('fs');

// Load .env.local
require('@next/env').loadEnvConfig(process.cwd());

const TIME_SLOTS = [
  "11:00-11:20", "11:30-11:50",
  "12:00-12:20", "12:30-12:50", "13:00-13:20", "13:30-13:50",
  "14:00-14:20", "14:30-14:50", "15:00-15:20", "15:30-15:50",
  "16:00-16:20", "16:30-16:50", "17:00-17:20", "17:30-17:50"
];

const schedules = pgTable('schedules', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  status: text('status').notNull().default('available'),
  eventName: text('event_name'),
  location: text('location'),
  imageUrl: text('image_url'),
  slots: jsonb('slots').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

async function migrate() {
  console.log("🚀 Starting Google Sheets to Supabase Migration...");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is missing!");
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  // 1. Read Google Credentials
  const credPath = path.join(process.cwd(), 'google-credentials.json');
  if (!fs.existsSync(credPath)) {
    throw new Error(`google-credentials.json not found at ${credPath}`);
  }
  const authCredentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials: authCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1Ki87mjVadZ5n1G4ZUqv44y4T91D2CXWOnKGFYyVs5f0';

  console.log(`📥 Fetching data from Google Sheets (${spreadsheetId})...`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A2:S',
  });

  const rows = response.data.values || [];
  console.log(`📊 Found ${rows.length} rows in Google Sheets.`);

  let insertedCount = 0;
  const nowUnix = Math.floor(Date.now() / 1000);

  for (const row of rows) {
    const date = row[0]?.trim();
    if (!date) continue;

    const status = row[1]?.trim().toLowerCase() || 'available';
    const eventName = row[2]?.trim() || null;
    const location = row[3]?.trim() || null;
    const imageUrl = row[18]?.trim() || null;

    const slots = TIME_SLOTS.map((timeLabel, index) => {
      const colIdx = 4 + index;
      const rawSlotStatus = row[colIdx]?.trim().toLowerCase();
      const slotStatus = rawSlotStatus === 'booked' || rawSlotStatus === 'เต็ม' ? 'booked' : 'available';
      return {
        time: timeLabel,
        status: slotStatus,
      };
    });

    try {
      await db.insert(schedules).values({
        date,
        status,
        eventName,
        location,
        imageUrl,
        slots,
        createdAt: nowUnix,
      });
      insertedCount++;
      console.log(`✅ Migrated date: ${date} (${eventName || 'No Event Name'})`);
    } catch (err) {
      console.error(`⚠️ Error inserting date ${date}:`, err.message);
    }
  }

  console.log(`\n🎉 Migration Complete! Total ${insertedCount} schedules inserted into Supabase.`);
  await client.end();
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
