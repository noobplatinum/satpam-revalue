// test-bot.js
require('dotenv').config();
const { SubscriberBot } = require('./src/bot');

async function testBot() {
  const bot = new SubscriberBot();
  
  try {
    console.log('🤖 Testing bot initialization...');
    await bot.initialize();
    
    console.log('🔄 Testing role sync...');
    const result = await bot.syncSubscriberRoles();
    
    console.log('📊 Result:', result);
    
    console.log('🧹 Cleaning up...');
    await bot.cleanup();
    
    console.log('✅ Test complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    await bot.cleanup();
  }
}

testBot();