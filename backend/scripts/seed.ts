import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../.env') });

import { User } from '../src/database/entities/user.entity';
import { Tenant } from '../src/database/entities/tenant.entity';

const seed = async () => {
  console.log('🚀 Seed süreci başlatılıyor...');
  const url = process.env.POSTGRES_URL;
  console.log('🔗 Veritabanına bağlanılıyor...');
  
  const AppDataSource = new DataSource({
    type: 'postgres',
    url: url,
    host: !url ? process.env.DB_HOST : undefined,
    port: !url ? parseInt(process.env.DB_PORT || '5432') : undefined,
    username: !url ? process.env.DB_USERNAME : undefined,
    password: !url ? process.env.DB_PASSWORD : undefined,
    database: !url ? process.env.DB_DATABASE : undefined,
    entities: [__dirname + '/../src/database/entities/*.ts'],
    synchronize: true, // tablolar yoksa canlıda yaratsın
    ssl: url ? { rejectUnauthorized: false } : false,
  });


  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const tenantRepo = AppDataSource.getRepository(Tenant);

  // 1. Create a Test Tenant (Company)
  let tenant = await tenantRepo.findOne({ where: { taxNumber: '11111111111' } });
  if (!tenant) {
    tenant = tenantRepo.create({
      companyName: 'ProUETDS Örnek Turizm A.Ş.',
      taxNumber: '11111111111',
      taxOffice: 'Ankara',
      phone: '08501111111',
      email: 'info@prouetds.local',
      settings: { crmApiKey: 'TEST-SECRET-KEY-12345' }
    });
    await tenantRepo.save(tenant);
    console.log('✅ Örnek Şirket (Tenant) oluşturuldu.');
  }

  // 2. Create the Super Admin User mapped to that company
  let superAdmin = await userRepo.findOne({ where: { email: 'admin@prouetds.com' } });
  if (!superAdmin) {
    superAdmin = userRepo.create({
      email: 'admin@prouetds.com',
      passwordHash: await bcrypt.hash('12345678', 12),
      firstName: 'Süper',
      lastName: 'Admin',
      role: 'super_admin' as any, // Admin yetkisi 
      tenantId: tenant.id
    });
    await userRepo.save(superAdmin);
    console.log('✅ Süper Admin (admin@prouetds.com) oluşturuldu.');
  } else {
    console.log('⚠️ Süper Admin zaten sistemde mevcut.');
  }

  console.log('🎉 Kurulum Tamamlandı!');
  await AppDataSource.destroy();
};

seed().catch((err) => {
  console.error('Seed sırasında hata oluştu:', err);
});
