
const http = require('http');
const handler = require('./public/api/sync').default;

const server = http.createServer(async (req, res) => {
  // Always add the required cron secret header for the handler.
  req.headers['vercel-cron-secret'] = process.env.VERCEL_CRON_SECRET;
  
  await handler(req, res);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
