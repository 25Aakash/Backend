// Test Backend API - Run with: node test.js
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testBackend() {
  console.log('🧪 Testing Shopkeeper Marketplace Backend...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣  Testing health check...');
    const health = await axios.get('http://localhost:5000/api');
    console.log('✅ Health check passed:', health.data.message);
    console.log('');

    // Test 2: Categories
    console.log('2️⃣  Testing categories endpoint...');
    const categories = await axios.get(`${API_URL}/categories`);
    console.log(`✅ Categories loaded: ${categories.data.length} categories found`);
    categories.data.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.subcategories.length} subcategories)`);
    });
    console.log('');

    // Test 3: Products (should be empty initially)
    console.log('3️⃣  Testing products endpoint...');
    const products = await axios.get(`${API_URL}/products`);
    console.log(`✅ Products endpoint working: ${products.data.length} products found`);
    console.log('');

    // Test 4: Shops (should be empty initially)
    console.log('4️⃣  Testing shops endpoint...');
    const shops = await axios.get(`${API_URL}/shops`);
    console.log(`✅ Shops endpoint working: ${shops.data.length} shops found`);
    console.log('');

    console.log('🎉 All tests passed! Backend is working correctly.');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Start the frontend: cd ShopkeeperMarketplace && npx expo start');
    console.log('   2. Create a shopkeeper account in the app');
    console.log('   3. Add some products');
    console.log('   4. Create a customer account');
    console.log('   5. Start shopping!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.log('');
    console.log('💡 Make sure:');
    console.log('   - Backend server is running (node index.js)');
    console.log('   - MySQL database is set up');
    console.log('   - Database tables are created');
  }
}

testBackend();
