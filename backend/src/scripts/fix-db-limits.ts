import { DataSource } from 'typeorm';
import config from '../database/data-source';

async function run() {
  console.log('Veritabanı limitleri genişletiliyor...');
  const ds = new DataSource(config);
  try {
    await ds.initialize();
    await ds.query('ALTER TABLE trips ALTER COLUMN "originPlace" TYPE TEXT');
    await ds.query('ALTER TABLE trips ALTER COLUMN "destPlace" TYPE TEXT');
    await ds.query('ALTER TABLE trips ALTER COLUMN "description" TYPE TEXT');
    await ds.query('ALTER TABLE passengers ALTER COLUMN "firstName" TYPE VARCHAR(255)');
    await client.query('ALTER TABLE passengers ALTER COLUMN "lastName" TYPE VARCHAR(255)');
    console.log('BAŞARILI: Veritabanı limitleri sınırsız hale getirildi.');
  } catch (error) {
    console.error('HATA:', error.message);
  } finally {
    if (ds.isInitialized) await ds.destroy();
    process.exit(0);
  }
}
run();