import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from '@sqlitecloud/drivers';

// Initialize SQLite Cloud connection
const db = new Database('sqlitecloud://cmq6frwshz.g4.sqlite.cloud:8860/System_ping.db?apikey=Dor8OwUECYmrbcS5vWfsdGpjCpdm9ecSDJtywgvRw8k');

async function initDb() {
  await db.sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`;
  await db.sql`CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, page_url TEXT NOT NULL, db_url TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))`;
}
initDb().catch(console.error);

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // Middleware to authenticate
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Ping logic (runs every 5 minutes)
  setInterval(async () => {
    try {
      const projects = await db.sql`SELECT * FROM projects`;
      for (const project of projects as any[]) {
        console.log(`Pinging project: ${project.page_url} and ${project.db_url}`);
        fetch(project.page_url).catch(e => console.error(`Ping failed for ${project.page_url}`, e));
        fetch(project.db_url).catch(e => console.error(`Ping failed for ${project.db_url}`, e));
      }
    } catch (error) {
      console.error('Ping job failed', error);
    }
  }, 5 * 60 * 1000);

  // Auth routes
  app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await db.sql`INSERT INTO users (username, password) VALUES (${username}, ${hashedPassword})`;
      res.status(201).json({ message: 'User registered' });
    } catch (error) {
      res.status(400).json({ error: 'Username already exists' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await db.sql`SELECT * FROM users WHERE username = ${username}`;
    const user = users[0] as any;
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username, id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // API to add a project (authenticated)
  app.post('/api/projects', authenticateToken, async (req: any, res: any) => {
    const { page_url, db_url } = req.body;
    const user_id = req.user.id;
    if (!page_url || !db_url) {
      return res.status(400).json({ error: 'page_url and db_url are required' });
    }
    try {
      await db.sql`INSERT INTO projects (user_id, page_url, db_url) VALUES (${user_id}, ${page_url}, ${db_url})`;
      res.status(201).json({ message: 'Project added' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add project' });
    }
  });

  // API to list projects for the logged-in user
  app.get('/api/projects', authenticateToken, async (req: any, res: any) => {
    try {
      const projects = await db.sql`SELECT * FROM projects WHERE user_id = ${req.user.id}`;
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // API Route for pinging
  app.get('/api/ping', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'PingMonitor/1.0' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      res.status(200).json({
        status: response.ok ? 'Online' : 'Offline',
        responseTime,
        statusCode: response.status
      });
    } catch (error: any) {
      res.status(200).json({
        status: 'Offline',
        responseTime: null,
        error: error.message
      });
    }
  });

  // API Route for cron job (keeps other sites awake)
  app.get('/api/cron', async (req, res) => {
    const urlsString = process.env.MONITOR_URLS || '';
    const urls = urlsString.split(',').map(u => u.trim()).filter(u => u);

    if (urls.length === 0) {
      return res.status(200).json({ 
        message: 'Nenhuma URL configurada. Adicione a variável MONITOR_URLS no Vercel/Render com os links separados por vírgula.' 
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
      } catch (error: any) {
        return { url, status: 'Offline', error: error.message };
      }
    }));

    res.status(200).json({ success: true, processed: urls.length, results });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
