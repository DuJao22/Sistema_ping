export default async function handler(req, res) {
  // Pega as URLs da variável de ambiente no Vercel
  // Exemplo: MONITOR_URLS="https://meu-app.onrender.com, https://outro-app.onrender.com"
  const urlsString = process.env.MONITOR_URLS || '';
  const urls = urlsString.split(',').map(u => u.trim()).filter(u => u);

  if (urls.length === 0) {
    return res.status(200).json({ 
      message: 'Nenhuma URL configurada. Adicione a variável MONITOR_URLS no Vercel com os links separados por vírgula.' 
    });
  }

  const results = await Promise.all(urls.map(async (url) => {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'PingMonitor-Cron/1.0' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return { url, status: response.ok ? 'Online' : 'Offline', responseTime };
    } catch (error) {
      return { url, status: 'Offline', error: error.message };
    }
  }));

  res.status(200).json({ success: true, processed: urls.length, results });
}
