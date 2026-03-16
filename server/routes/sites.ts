import express from 'express';
import { db } from '../database/db.js';
import { authenticate } from './auth.js';
import { checkSite } from '../services/monitor.js';

const router = express.Router();

router.use(authenticate);

router.get('/', (req: any, res) => {
  try {
    const sites = db.prepare('SELECT * FROM monitored_sites WHERE user_id = ?').all(req.userId);
    
    const sitesWithStats = sites.map((site: any) => {
      const lastLog = db.prepare('SELECT * FROM site_logs WHERE site_id = ? ORDER BY checked_at DESC LIMIT 1').get(site.id) as any;
      
      const totalChecks = db.prepare('SELECT COUNT(*) as count FROM site_logs WHERE site_id = ?').get(site.id) as any;
      const successfulChecks = db.prepare('SELECT COUNT(*) as count FROM site_logs WHERE site_id = ? AND status = "Online"').get(site.id) as any;
      
      const uptime = totalChecks.count > 0 ? (successfulChecks.count / totalChecks.count) * 100 : 0;

      return {
        ...site,
        status: lastLog ? lastLog.status : 'Unknown',
        response_time: lastLog ? lastLog.response_time : null,
        last_checked: lastLog ? lastLog.checked_at : null,
        uptime: uptime.toFixed(2),
      };
    });

    res.json(sitesWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

router.post('/', (req: any, res) => {
  const { url, db_url, description } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const stmt = db.prepare('INSERT INTO monitored_sites (user_id, url, db_url, description, check_interval) VALUES (?, ?, ?, ?, 300)');
    const info = stmt.run(req.userId, url, db_url || null, description);
    
    const newSite = db.prepare('SELECT * FROM monitored_sites WHERE id = ?').get(info.lastInsertRowid);
    
    // Perform initial check
    checkSite(newSite as any);

    res.json(newSite);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add site' });
  }
});

router.delete('/:id', (req: any, res) => {
  try {
    const stmt = db.prepare('DELETE FROM monitored_sites WHERE id = ? AND user_id = ?');
    const info = stmt.run(req.params.id, req.userId);
    
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Site not found or unauthorized' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

router.post('/:id/check', async (req: any, res) => {
  try {
    const site = db.prepare('SELECT * FROM monitored_sites WHERE id = ? AND user_id = ?').get(req.params.id, req.userId) as any;
    
    if (!site) {
      return res.status(404).json({ error: 'Site not found or unauthorized' });
    }
    
    const log = await checkSite(site);
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check site' });
  }
});

router.get('/:id/logs', (req: any, res) => {
  try {
    const site = db.prepare('SELECT id FROM monitored_sites WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    
    if (!site) {
      return res.status(404).json({ error: 'Site not found or unauthorized' });
    }

    const logs = db.prepare('SELECT * FROM site_logs WHERE site_id = ? ORDER BY checked_at DESC LIMIT 100').all(req.params.id);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
