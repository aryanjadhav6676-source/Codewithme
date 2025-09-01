require('dotenv').config();
const AIService = require('./aiService');

async function testAI() {
  console.log('🧪 Testing AI Service...');
  
  if (!process.env.AI_API_KEY) {
    console.log('❌ AI_API_KEY not found in environment variables');
    console.log('Please create a .env file with your OpenAI API key');
    return;
  }

  const aiService = new AIService();
  
  try {
    // Test basic AI ask
    console.log('\n📝 Testing basic AI ask...');
    const result = await aiService.askAI('test-room', 'Hello! Can you help me with JavaScript?', {
      files: [{ name: 'main.js', content: 'console.log("Hello World");' }],
      language: 'javascript',
      recentChat: []
    });
    
    console.log('✅ AI Response:', result.message);
    
    // Test code explanation
    console.log('\n🔍 Testing code explanation...');
    const explanation = await aiService.explainCode('function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); }', 'javascript');
    
    console.log('✅ Code Explanation:', explanation.explanation);
    
    console.log('\n🎉 All tests passed! AI service is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAI();
