const axios = require('axios');

const testEndpoint = async () => {
  try {
    const baseUrl = 'http://localhost:5000/api';
    console.log('Logging in as admin...');
    const loginRes = await axios.post(`${baseUrl}/admin/login`, {
      email: 'tech.visaandvoyage@gmail.com',
      password: 'admin123',
    });

    if (!loginRes.data.success || !loginRes.data.token) {
      console.error('Login failed:', loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('Login successful! Token acquired.');

    // 1. Fetch current settings
    console.log('\nFetching current settings...');
    const getRes = await axios.get(`${baseUrl}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Current popularCountries:', getRes.data.settings.popularCountries);

    // 2. Perform PUT request with a modified popularCountries array
    const testList = ['USA', 'UK', 'Singapore'];
    console.log(`\nSending PUT request to update popularCountries to:`, testList);
    const putRes = await axios.put(
      `${baseUrl}/admin/settings`,
      { popularCountries: testList },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (putRes.data.success) {
      console.log('PUT request succeeded!');
      console.log('Returned popularCountries from response:', putRes.data.settings.popularCountries);
    } else {
      console.error('PUT request failed:', putRes.data);
    }

    // 3. Fetch again to verify DB state
    console.log('\nRefetching settings to confirm DB persistence...');
    const getRes2 = await axios.get(`${baseUrl}/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Persisted popularCountries in DB:', getRes2.data.settings.popularCountries);

    // 4. Reset settings back to defaults
    console.log('\nResetting back to defaults...');
    await axios.put(
      `${baseUrl}/admin/settings`,
      { popularCountries: ['USA', 'UK', 'EU Schengen', 'Dubai', 'Japan'] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Defaults restored.');

    process.exit(0);
  } catch (err) {
    console.error('Endpoint test error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
};

testEndpoint();
