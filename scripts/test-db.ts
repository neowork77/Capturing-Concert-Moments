import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  try {
    // Dynamically import DB files after env is loaded
    const { db } = await import('../src/db/db');
    const { images } = await import('../src/db/schema');

    console.log('Querying images table...');
    const result = await db.select().from(images);
    console.log('Successfully connected and queried images table!');
    console.log('Results:', result);
    process.exit(0);
  } catch (error) {
    console.error('Failed to query database:', error);
    process.exit(1);
  }
}

main();
