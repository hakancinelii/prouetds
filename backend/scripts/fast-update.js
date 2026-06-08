const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envFile.match(/POSTGRES_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) {
    console.error('Veritabanı URL bulunamadı!');
    process.exit(1);
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await client.connect();
    console.log("🔗 Veritabanına bağlandı. İşlem yapılıyor...");
    const res = await client.query(`
        UPDATE tenants 
        SET "uetdsUsername" = '920929', 
            "uetdsPasswordEncrypted" = 'NS9QDS1GUU',
            settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{uetdsEnvironment}', '"production"')
        WHERE "taxNumber" = '0680902920'
        RETURNING "companyName"
    `);
    
    if (res.rows.length > 0) {
        console.log("✅ Başarıyla Canlı (Production) kimlikleri güncellendi:", res.rows[0].companyName);
    } else {
        console.log("❌ Firma (VKN: 0680902920) bulunamadı.");
    }
    await client.end();
}

run().catch(console.error);
