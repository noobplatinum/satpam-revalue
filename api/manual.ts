import { VercelRequest, VercelResponse } from '@vercel/node';
import { SubscriberBot } from '../src/bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DISCORD_BOT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new SubscriberBot();

  try {
    console.log('Manual sync triggered...');
    
    const apiBaseUrl = process.env.API_BASE_URL;
    console.log(`Fetching active subscribers from: ${apiBaseUrl}/api/users/active-subscribers`);

    await bot.initialize();
    
    const result = await bot.syncSubscriberRoles();
    
    await bot.cleanup();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      timestamp: new Date().toISOString(),
      trigger: 'manual'
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    
    try {
      await bot.cleanup();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}