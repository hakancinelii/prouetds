const { Client } = require('pg');

async function run() {
  console.log('Veritabanı limitleri genişletiliyor...');
  const client = new Client({
    connectionString: 'postgresql://postgres:123456@localhost:5432/prouetds'
  });
  try {
    await client.connect();
    console.log('Veritabanı bağlantısı kuruldu.');
    await client.query('ALTER TABLE trips ALTER COLUMN "originPlace" TYPE TEXT');
    await client.query('ALTER TABLE trips ALTER COLUMN "destPlace" TYPE TEXT');
    await client.query('ALTER TABLE trips ALTER COLUMN "description" TYPE TEXT');
    await client.query('ALTER TABLE passengers ALTER COLUMN "firstName" TYPE VARCHAR(255)');
    await client.query('ALTER TABLE passengers ALTER COLUMN "lastName" TYPE VARCHAR(255)');
    console.log('------------------------------------------');
    console.log('BAŞARILI: Veritabanı limitleri sınırsız hale getirildi.');
    console.log('------------------------------------------');
  } catch (error) {
    console.error('HATA:', error.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}
run();