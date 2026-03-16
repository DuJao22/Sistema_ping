import { db } from '../database/db.js';

export async function checkSite(site: any) {
  const start = Date.now();
  let status = 'Offline';
  let responseTime = null;

  try {
    // Adding a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const requests = [fetch(site.url, { signal: controller.signal })];
    if (site.db_url) {
      requests.push(fetch(site.db_url, { signal: controller.signal }));
    }
    
    const results = await Promise.allSettled(requests);
    clearTimeout(timeoutId);
    
    responseTime = Date.now() - start;
    
    const mainResult = results[0];
    if (mainResult.status === 'fulfilled' && mainResult.value.ok) {
      status = 'Online';
      if (responseTime > 2000) {
        status = 'Slow';
      }
    } else {
      status = 'Offline';
    }
  } catch (error) {
    status = 'Offline';
    responseTime = Date.now() - start;
  }

  const stmt = db.prepare('INSERT INTO site_logs (site_id, status, response_time) VALUES (?, ?, ?)');
  const info = stmt.run(site.id, status, responseTime);
  
  return db.prepare('SELECT * FROM site_logs WHERE id = ?').get(info.lastInsertRowid);
}

export function startMonitoring() {
  setInterval(() => {
    const sites = db.prepare('SELECT * FROM monitored_sites').all();
    
    sites.forEach((site: any) => {
      const lastLog = db.prepare('SELECT checked_at FROM site_logs WHERE site_id = ? ORDER BY checked_at DESC LIMIT 1').get(site.id) as any;
      
      let shouldCheck = true;
      if (lastLog) {
        // SQLite CURRENT_TIMESTAMP is UTC but lacks 'Z'
        const lastCheckTime = new Date(lastLog.checked_at + 'Z').getTime();
        const now = Date.now();
        const intervalMs = site.check_interval * 1000;
        
        if (now - lastCheckTime < intervalMs) {
          shouldCheck = false;
        }
      }
      
      if (shouldCheck) {
        checkSite(site);
      }
    });
  }, 10000); // Check every 10 seconds if any site needs to be checked
}
