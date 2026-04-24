/**
 * test-auth.js — Simple test script to diagnose auth and data fetching issues
 * Run with: node test-auth.js
 */

const BASE_URL = 'http://localhost:3000/api';

async function test() {
  console.log('🧪 Starting authentication and data fetching tests...\n');

  try {
    // 1. Test health endpoint
    console.log('1️⃣  Testing health endpoint...');
    const healthRes = await fetch(`http://localhost:3000/api/health`);
    const health = await healthRes.json();
    console.log('✅ Health check passed:', health);

    // 2. Test signup
    console.log('\n2️⃣  Testing signup...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `testuser${Date.now()}@example.com`,
        password: 'password123'
      })
    });
    const signupData = await signupRes.json();
    console.log('Signup response status:', signupRes.status);
    console.log('Signup response:', JSON.stringify(signupData, null, 2));

    if (!signupData.success || !signupData.token) {
      console.error('❌ Signup failed or no token returned');
      return;
    }

    const token = signupData.token;
    const userId = signupData.user.id;
    console.log(`✅ Signup successful! Token: ${token.substring(0, 20)}...`);
    console.log(`✅ User ID: ${userId}`);

    // 3. Test authenticated request
    console.log('\n3️⃣  Testing authenticated request (transactions summary)...');
    const summaryRes = await fetch(`${BASE_URL}/transactions/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const summaryData = await summaryRes.json();
    console.log('Summary response status:', summaryRes.status);
    console.log('Summary response:', JSON.stringify(summaryData, null, 2));

    if (summaryRes.status === 401) {
      console.error('❌ Authentication failed - token was not accepted');
      console.error('   This means the token is invalid or the auth middleware is not working');
      return;
    }

    if (!summaryData.success) {
      console.error('❌ Failed to fetch summary:', summaryData.message);
      return;
    }

    console.log('✅ Successfully fetched data!');
    console.log('   Total Income:', summaryData.data.totalIncome);
    console.log('   Total Expense:', summaryData.data.totalExpense);
    console.log('   Balance:', summaryData.data.balance);

    // 4. Test login with created user
    console.log('\n4️⃣  Testing login with created user...');
    const email = signupData.user.email;
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }

    console.log('✅ Login successful!');

  } catch (err) {
    console.error('❌ Test error:', err);
  }

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

// Wait for server to be ready
setTimeout(test, 1000);
