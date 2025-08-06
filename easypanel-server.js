const http = require('http');
const handler = require('./public/api/sync').default;

const server = http.createServer(async (req, res) => {
  // Always add the required cron secret header for the handler.
  req.headers['vercel-cron-secret'] = process.env.VERCEL_CRON_SECRET;
  
  // Create a minimal Vercel-compatible response wrapper
  const vercelRes = {
    status: (code) => {
      res.statusCode = code;
      return {
        json: (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        }
      };
    }
  };
  
  await handler(req, vercelRes);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});