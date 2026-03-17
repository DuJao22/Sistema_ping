export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'PingMonitor/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: response.ok ? 'Online' : 'Offline',
      responseTime,
      statusCode: response.status
    });
  } catch (error) {
    res.status(200).json({
      status: 'Offline',
      responseTime: null,
      error: error.message
    });
  }
}
