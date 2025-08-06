const http = require('http');
const url = require('url');
const syncHandler = require('./public/api/sync').default;
const manualHandler = require('./public/api/manual').default;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
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
  
  // Route requests based on path
  if (parsedUrl.pathname === '/api/sync') {
    await syncHandler(req, vercelRes);
  } else if (parsedUrl.pathname === '/api/manual') {
    await manualHandler(req, vercelRes);
  } else if (parsedUrl.pathname === '/') {
    // Health check endpoint for cron
    await syncHandler(req, vercelRes);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});