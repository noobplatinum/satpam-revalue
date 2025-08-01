import { VercelRequest, VercelResponse } from '@vercel/node';
import { SubscriberBot } from '../src/bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional: Add authentication
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new SubscriberBot();

  try {
    console.log('Manual sync triggered...');
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