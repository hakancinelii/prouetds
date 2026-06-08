import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../.env') });

import { Tenant } from '../src/database/entities/tenant.entity';

const updateTenant = async () => {
  console.log('🚀 Veritabanı güncelleme süreci başlatılıyor...');
  const url = process.env.POSTGRES_URL;
  
  const AppDataSource = new DataSource({
    type: 'postgres',
    url: url,
    host: !url ? process.env.DB_HOST : undefined,
    port: !url ? parseInt(process.env.DB_PORT || '5432') : undefined,
    username: !url ? process.env.DB_USERNAME : undefined,
    password: !url ? process.env.DB_PASSWORD : undefined,
    database: !url ? process.env.DB_DATABASE : undefined,
    entities: [__dirname + '/../src/database/entities/*.ts'],
    synchronize: false,
    ssl: url ? { rejectUnauthorized: false } : false,
  });

  await AppDataSource.initialize();
  console.log('🔗 Veritabanına bağlandı.');

  const tenantRepo = AppDataSource.getRepository(Tenant);

  // Find the tenant by tax number
  const tenant = await tenantRepo.findOne({ where: { taxNumber: '0680902920' } });

  if (!tenant) {
    console.error('❌ HATA: ALYA KARDEŞLER firması (VKN: 0680902920) bulunamadı!');
    await AppDataSource.destroy();
    return;
  }

  console.log(`🏢 Firma Bulundu: ${tenant.companyName}`);

  // Update credentials
  tenant.uetdsUsername = '920929';
  tenant.uetdsPasswordEncrypted = 'NS9QDS1GUU';
  
  // Update environment setting without wiping other settings
  tenant.settings = { ...tenant.settings, uetdsEnvironment: 'production' };

  await tenantRepo.save(tenant);
  
  console.log('✅ UETDS Canlı ortam bilgileri başarıyla veritabanına mühürlendi!');
  await AppDataSource.destroy();
};

updateTenant().catch((err) => {
  console.error('❌ Güncelleme sırasında hata oluştu:', err);
});
