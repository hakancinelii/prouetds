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
    console.log("🔗 DB'ye bağlanıldı...");
    
    // Bütün grupsuz seferleri bulalım
    const tripRes = await client.query('SELECT id, "tenantId" FROM trips WHERE id NOT IN (SELECT "tripId" FROM trip_groups)');
    
    if (tripRes.rows.length === 0) {
        console.log("✅ Bütün seferlerin grubu var.");
    } else {
        for (const trip of tripRes.rows) {
            await client.query(`
                INSERT INTO trip_groups ("id", "tripId", "tenantId", "groupName", "groupDescription", "originCountryCode", "destCountryCode", "groupFee")
                VALUES (gen_random_uuid(), $1, $2, 'Genel Kafileniz', 'Otomatik Oluşturulan Grup', 'TR', 'TR', 0)
            `, [trip.id, trip.tenantId]);
            console.log("✅ Grubu olmayan bir sefere grup eklendi:", trip.id);
        }
    }
    
    await client.end();
}

run().catch(console.error);
