
const http = require('http');
const handler = require('./public/api/sync').default;

const server = http.createServer(async (req, res) => {
  // Mock Vercel's req/res objects
  req.headers['vercel-cron-secret'] = process.env.VERCEL_CRON_SECRET;
  
  await handler(req, res);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
