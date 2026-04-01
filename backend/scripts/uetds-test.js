const soap = require('soap');

async function testUetds() {
  console.log("=========================================");
  console.log("🚀 LOKAL BİLGİSAYARDAN UETDS TESTİ BAŞLIYOR...");
  console.log("=========================================\n");

  const wsdlUrlProd = 'https://servis.turkiye.gov.tr/services/g2g/kdgm/uetdsarizi?wsdl';
  const prodUser = '920929';
  const prodPass = 'NS9QDS1GUU';

  const wsdlUrlTest = 'https://servis.turkiye.gov.tr/services/g2g/kdgm/test/uetdsarizi?wsdl';
  const testUser = '999999';
  const testPass = '999999testtest';

  try {
    console.log("🟡 1. CANLI (PRODUCTION) KİMLİKLERİ DENENİYOR...");
    const clientProd = await soap.createClientAsync(wsdlUrlProd);
    clientProd.setSecurity(new soap.BasicAuthSecurity(prodUser, prodPass));
    const [resultProd] = await clientProd.kullaniciKontrolAsync({ kullaniciAdi: prodUser, sifre: prodPass });
    console.log("✅ CANLI ŞİFRE BAŞARILI! SONUÇ:", resultProd);
  } catch (error) {
    console.error("❌ CANLI ŞİFRE BAŞARISIZ:", error.message);
  }

  console.log("\n-----------------------------------------\n");

  try {
    console.log("🟡 2. TEST (SANDBOX) KİMLİKLERİ DENENİYOR...");
    const clientTest = await soap.createClientAsync(wsdlUrlTest);
    clientTest.setSecurity(new soap.BasicAuthSecurity(testUser, testPass));
    const [resultTest] = await clientTest.kullaniciKontrolAsync({ kullaniciAdi: testUser, sifre: testPass });
    console.log("✅ TEST ŞİFRE BAŞARILI! SONUÇ:", resultTest);
  } catch (error) {
    console.error("❌ TEST ŞİFRE BAŞARISIZ:", error.message);
  }
}

testUetds();
