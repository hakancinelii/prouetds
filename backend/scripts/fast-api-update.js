async function updateTenant() {
  const loginRes = await fetch('https://prouetds-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@prouetds.com', password: '12345678' })
  });
  const dataLogin = await loginRes.json();
  const access_token = dataLogin.accessToken || dataLogin.access_token;

  if (!access_token) {
    console.error("❌ Login failed");
    return;
  }

  const tenantsRes = await fetch('https://prouetds-production.up.railway.app/api/tenants', {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const data = await tenantsRes.json();

  // Find ALYA KARDESLER
  const tenant = data.tenants.find(t => t.taxNumber === '0680902920' || t.companyName.includes('ALYA'));

  if (!tenant) {
    console.error("❌ Tenant not found");
    return;
  }

  console.log("✅ Found Tenant ID:", tenant.id, tenant.companyName);

  const updateRes = await fetch(`https://prouetds-production.up.railway.app/api/tenants/${tenant.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uetdsUsername: '920929',
      uetdsPasswordEncrypted: 'NS9QDS1GUU',
      settings: {
        ...tenant.settings,
        uetdsEnvironment: 'production'
      }
    })
  });

  const updatedData = await updateRes.json();
  console.log("✅ Update Success!", updatedData.companyName, updatedData.uetdsUsername);
}

updateTenant().catch(console.error);
