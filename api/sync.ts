import { VercelRequest, VercelResponse } from '@vercel/node';
import { SubscriberBot } from '../src/bot';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security check for cron jobs
  const cronSecret = req.headers['vercel-cron-secret'];
  if (cronSecret !== process.env.VERCEL_CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new SubscriberBot();

  try {
    console.log('Initializing Discord bot...');
    await bot.initialize();
    
    console.log('Syncing subscriber roles...');
    const result = await bot.syncSubscriberRoles();
    
    console.log('Cleaning up bot connection...');
    await bot.cleanup();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Handler error:', error);
    
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