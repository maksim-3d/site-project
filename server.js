const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Хранилище соответствия socket.id и userId
const socketToUser = new Map();
const userToSocket = new Map();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS - УВЕЛИЧЕН ЛИМИТ ДО 150МБ
const io = socketIo(server, {
  cors: {
    origin: ["https://messenger.ddns.net", "http://78.40.188.120:3000", "http://localhost:3000", "http://192.168.0.108:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 150 * 1024 * 1024, // 150 MB
  pingTimeout: 120000, // Увеличиваем таймаут для больших файлов
  pingInterval: 50000
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'maksim21325';

// LiveKit configuration
const LIVEKIT_API_KEY = 'APIViWqsMqmA4iz';
const LIVEKIT_SECRET_KEY = 'PkT8Oy93GUZNhr8in5ssesFLNrMdqAEsRfX0fu4yrs3A';

function generateLiveKitToken(userName, roomName) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: userName,
    aud: roomName,
    iat: now,
    exp: now + 3600,
    grants: {
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      room: roomName,
      roomJoin: true
    }
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', LIVEKIT_SECRET_KEY)
    .update(message)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${message}.${signature}`;
}

// Middleware - УВЕЛИЧЕН ЛИМИТ ДО 150МБ
app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ limit: '150mb', extended: true }));

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = ['https://messenger.ddns.net', 'http://78.40.188.120:3000', 'http://localhost:3000', 'http://192.168.0.108:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./messenger.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

function createTables() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    profile_pic TEXT,
    bio TEXT,
    custom_username TEXT UNIQUE,
    wallpaper TEXT,
    stars INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user',
    is_bot INTEGER DEFAULT 0,
    bot_owner_id INTEGER
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table created successfully');
      createOtherTables();
    }
  });
}

function createOtherTables() {
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    friend_id INTEGER,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  )`, (err) => {
    if (err) console.error('Error creating friends table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Error creating messages table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    gift_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Error creating gifts table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS wallpapers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT UNIQUE,
    wallpaper TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating wallpapers table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    creator_id INTEGER,
    script TEXT,
    status TEXT DEFAULT 'stopped',
    token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Error creating bots table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER,
    log TEXT,
    is_error INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id)
  )`, (err) => {
    if (err) console.error('Error creating bot_logs table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Error creating groups table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    user_id INTEGER,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(group_id, user_id)
  )`, (err) => {
    if (err) console.error('Error creating group_members table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    sender_id INTEGER,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Error creating group_messages table:', err);
  });

  db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER,
    user_id INTEGER,
    reaction TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(message_id, user_id, reaction)
  )`, (err) => {
    if (err) console.error('Error creating message_reactions table:', err);
  });

  console.log('✅ All tables created successfully');
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 5) return res.status(400).json({ error: 'Username must be at least 5 characters' });

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
    res.json({ message: 'User registered successfully' });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.username === 'maksim') {
      user.role = 'creator';
    } else {
      user.role = user.role || 'user';
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, profile_pic: user.profile_pic, bio: user.bio, custom_username: user.custom_username, wallpaper: user.wallpaper, stars: user.stars, role: user.role } });
  });
});

app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, username, custom_username, profile_pic, role FROM users WHERE id != ?', [req.user.id], (err, users) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(users);
  });
});

app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(`
    SELECT DISTINCT u.id, u.username, u.custom_username, u.profile_pic, u.role
    FROM friends f
    JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted' AND u.id != ?
  `, [req.user.id, req.user.id, req.user.id], (err, friends) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(friends);
  });
});

app.post('/api/add-friend', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Friend ID required' });

  db.run('INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
    [req.user.id, friendId, 'accepted'], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.run('INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
        [friendId, req.user.id, 'accepted'], function(err2) {
          if (err2) return res.status(500).json({ error: 'Database error' });
          res.json({ message: 'Friend added successfully' });
        });
    });
});

app.post('/api/update-profile', authenticateToken, (req, res) => {
  let { profile_pic, bio, custom_username, wallpaper, chatId } = req.body;

  if (custom_username && custom_username.length < 5) {
    return res.status(400).json({ error: 'Custom username must be at least 5 characters' });
  }

  if (wallpaper && wallpaper.startsWith('data:image/') && chatId) {
    db.run('INSERT OR REPLACE INTO wallpapers (chat_id, wallpaper) VALUES (?, ?)',
      [chatId, wallpaper], function(err) {
        if (err) {
          console.error('Error saving wallpaper:', err);
          return res.status(500).json({ error: 'Failed to save wallpaper' });
        }
        res.json({ message: 'Wallpaper updated' });
      });
    return;
  }

  db.run('UPDATE users SET profile_pic = ?, bio = ?, custom_username = ? WHERE id = ?',
    [profile_pic, bio, custom_username, req.user.id], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Custom username already taken' });
        }
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      res.json({ message: 'Profile updated' });
    });
});

app.get('/api/user/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  db.get('SELECT id, username, profile_pic, bio, custom_username, wallpaper, stars, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

app.get('/api/user/:id/gifts', authenticateToken, (req, res) => {
  const userId = req.params.id;
  db.all('SELECT gift_type, COUNT(*) as count FROM gifts WHERE receiver_id = ? GROUP BY gift_type', [userId], (err, gifts) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const total = gifts.reduce((sum, gift) => sum + gift.count, 0);
    res.json({ total, gifts });
  });
});

app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  db.all(`
    SELECT m.*, u.username as sender_username, u.profile_pic
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.timestamp
  `, [req.user.id, userId, userId, req.user.id], (err, messages) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(messages);
  });
});

app.get('/api/wallpaper/:chatId', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  db.get('SELECT wallpaper FROM wallpapers WHERE chat_id = ?', [chatId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ wallpaper: row ? row.wallpaper : null });
  });
});

app.post('/api/livekit-token', authenticateToken, (req, res) => {
  try {
    const { username, roomName } = req.body;
    if (!username || !roomName) {
      return res.status(400).json({ error: 'Missing username or roomName' });
    }
    const token = generateLiveKitToken(username, roomName);
    res.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ============= GROUPS =============

app.post('/api/groups/create', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Group name required' });
  
  db.run('INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)',
    [name, description || '', req.user.id],
    function(err) {
      if (err) {
        console.error('Error creating group:', err);
        return res.status(500).json({ error: 'Failed to create group' });
      }
      
      const groupId = this.lastID;
      
      db.run('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, req.user.id, 'admin']);
      
      res.json({ id: groupId, name, description });
    });
});

app.get('/api/groups', authenticateToken, (req, res) => {
  db.all(`
    SELECT g.*, gm.role 
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    ORDER BY g.created_at DESC
  `, [req.user.id], (err, groups) => {
    if (err) {
      console.error('Error loading groups:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(groups);
  });
});

app.get('/api/groups/:groupId/messages', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  
  db.get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, member) => {
    if (err || !member) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    db.all(`
      SELECT gm.*, u.username as sender_name, u.profile_pic
      FROM group_messages gm
      JOIN users u ON gm.sender_id = u.id
      WHERE gm.group_id = ?
      ORDER BY gm.timestamp ASC
    `, [groupId], (err, messages) => {
      if (err) {
        console.error('Error loading group messages:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(messages);
    });
  });
});

app.post('/api/groups/:groupId/send', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  
  if (!content) return res.status(400).json({ error: 'Content required' });
  
  db.get('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.user.id], (err, member) => {
    if (err || !member) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    db.run('INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)',
      [groupId, req.user.id, content],
      function(err) {
        if (err) {
          console.error('Error saving group message:', err);
          return res.status(500).json({ error: 'Failed to send message' });
        }
        
        const messageId = this.lastID;
        
        db.get('SELECT username, profile_pic FROM users WHERE id = ?', [req.user.id], (err, sender) => {
          db.all('SELECT user_id FROM group_members WHERE group_id = ?', [groupId], (err, members) => {
            const message = {
              id: messageId,
              group_id: parseInt(groupId),
              sender_id: req.user.id,
              sender_name: sender.username,
              profile_pic: sender.profile_pic,
              content: content,
              timestamp: new Date().toISOString()
            };
            
            members.forEach(member => {
              io.to(member.user_id.toString()).emit('newGroupMessage', message);
            });
            
            res.json({ success: true, message });
          });
        });
      });
  });
});

app.post('/api/groups/:groupId/add-member', authenticateToken, (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  
  if (!userId) return res.status(400).json({ error: 'User ID required' });
  
  db.get('SELECT * FROM groups WHERE id = ? AND creator_id = ?', [groupId, req.user.id], (err, group) => {
    if (err || !group) {
      return res.status(403).json({ error: 'You are not admin of this group' });
    }
    
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      db.run('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [groupId, userId, 'member'],
        function(err) {
          if (err) {
            console.error('Error adding member:', err);
            return res.status(500).json({ error: 'Failed to add member' });
          }
          
          io.to(userId.toString()).emit('addedToGroup', {
            group_id: groupId,
            group_name: group.name
          });
          
          res.json({ success: true });
        });
    });
  });
});

// ============= REACTIONS =============

app.post('/api/messages/:messageId/react', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  const { reaction } = req.body;
  
  if (!reaction) return res.status(400).json({ error: 'Reaction required' });
  
  db.get('SELECT id FROM messages WHERE id = ?', [messageId], (err, message) => {
    if (err || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    db.run(`INSERT OR REPLACE INTO message_reactions (message_id, user_id, reaction) VALUES (?, ?, ?)`,
      [messageId, req.user.id, reaction],
      function(err) {
        if (err) {
          console.error('Error adding reaction:', err);
          return res.status(500).json({ error: 'Failed to add reaction' });
        }
        
        db.all('SELECT reaction, COUNT(*) as count FROM message_reactions WHERE message_id = ? GROUP BY reaction',
          [messageId], (err, reactions) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }
            
            io.emit('messageReactionUpdated', {
              message_id: messageId,
              reactions: reactions
            });
            
            res.json({ reactions });
          });
      });
  });
});

app.get('/api/messages/:messageId/reactions', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  
  db.all('SELECT reaction, COUNT(*) as count FROM message_reactions WHERE message_id = ? GROUP BY reaction',
    [messageId], (err, reactions) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(reactions);
    });
});

// ============= BOTS =============

app.post('/api/create-bot', authenticateToken, (req, res) => {
  const { botName, botScript } = req.body;
  
  if (!botName || !botScript) {
    return res.status(400).json({ error: 'Bot name and script required' });
  }

  db.get('SELECT * FROM bots WHERE creator_id = ?', [req.user.id], (err, existingBot) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (existingBot) {
      return res.status(400).json({ error: 'You already have a bot' });
    }

    const timestamp = Date.now();
    const botUsername = `bot_${botName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}`;
    const botToken = crypto.randomBytes(32).toString('hex');
    const botPassword = crypto.randomBytes(16).toString('hex');

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        'INSERT INTO bots (name, creator_id, script, status, token) VALUES (?, ?, ?, ?, ?)',
        [botName, req.user.id, botScript, 'stopped', botToken],
        function(err) {
          if (err) {
            console.error('Error creating bot:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create bot: ' + err.message });
          }

          const botId = this.lastID;
          const hashedPassword = bcrypt.hashSync(botPassword, 10);
          
          db.run(
            `INSERT INTO users (username, password, role, is_bot, bot_owner_id, profile_pic, bio, stars)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [botUsername, hashedPassword, 'bot', 1, req.user.id, null, `🤖 Bot: ${botName}`, 0],
            function(err) {
              if (err) {
                console.error('Error creating bot user:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create bot user: ' + err.message });
              }

              db.run('COMMIT');
              res.json({ 
                message: 'Bot created successfully',
                botId: botId,
                botUsername: botUsername,
                botPassword: botPassword,
                botToken: botToken
              });
            }
          );
        }
      );
    });
  });
});

app.get('/api/my-bot', authenticateToken, (req, res) => {
  db.get(
    `SELECT b.*, u.id as bot_user_id, u.username as bot_username 
     FROM bots b 
     LEFT JOIN users u ON u.bot_owner_id = b.creator_id AND u.is_bot = 1
     WHERE b.creator_id = ?`,
    [req.user.id],
    (err, bot) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(bot || null);
    }
  );
});

app.post('/api/bot/:id/start', authenticateToken, (req, res) => {
  const botId = req.params.id;
  
  db.get('SELECT * FROM bots WHERE id = ? AND creator_id = ?', [botId, req.user.id], (err, bot) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const scriptPath = path.join(__dirname, 'temp', `bot_${botId}_${Date.now()}.py`);
    const tempDir = path.join(__dirname, 'temp');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    let script = bot.script;
    if (!script.includes('from botcreatemessenger import bot')) {
      script = 'from botcreatemessenger import bot\n\n' + script;
    }

    fs.writeFileSync(scriptPath, script);

    const botProcess = spawn('python3', [scriptPath], {
      env: {
        ...process.env,
        BOT_ID: botId,
        BOT_TOKEN: bot.token,
        PYTHONUNBUFFERED: '1'
      }
    });

    if (!global.botProcesses) global.botProcesses = {};
    global.botProcesses[botId] = {
      process: botProcess,
      scriptPath: scriptPath
    };

    botProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Bot ${bot.name} stdout: ${output}`);
      db.run('INSERT INTO bot_logs (bot_id, log) VALUES (?, ?)', [botId, output]);
    });

    botProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`Bot ${bot.name} stderr: ${error}`);
      db.run('INSERT INTO bot_logs (bot_id, log, is_error) VALUES (?, ?, ?)', [botId, error, 1]);
    });

    botProcess.on('close', (code) => {
      console.log(`Bot ${bot.name} exited with code ${code}`);
      try {
        fs.unlinkSync(scriptPath);
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }
      delete global.botProcesses[botId];
      db.run('UPDATE bots SET status = ? WHERE id = ?', ['stopped', botId]);
    });

    db.run('UPDATE bots SET status = ? WHERE id = ?', ['running', botId]);
    res.json({ message: 'Bot started successfully' });
  });
});

app.post('/api/bot/:id/stop', authenticateToken, (req, res) => {
  const botId = req.params.id;
  
  if (global.botProcesses && global.botProcesses[botId]) {
    global.botProcesses[botId].process.kill();
    try {
      fs.unlinkSync(global.botProcesses[botId].scriptPath);
    } catch (e) {
      console.error('Error deleting temp file:', e);
    }
    delete global.botProcesses[botId];
  }

  db.run('UPDATE bots SET status = ? WHERE id = ?', ['stopped', botId]);
  res.json({ message: 'Bot stopped successfully' });
});

app.post('/api/bot/:id/script', authenticateToken, (req, res) => {
  const botId = req.params.id;
  const { script } = req.body;

  db.run(
    'UPDATE bots SET script = ? WHERE id = ? AND creator_id = ?',
    [script, botId, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ message: 'Bot script updated' });
    }
  );
});

app.get('/api/bot/:id/logs', authenticateToken, (req, res) => {
  const botId = req.params.id;
  
  db.all(
    'SELECT * FROM bot_logs WHERE bot_id = ? ORDER BY timestamp DESC LIMIT 50',
    [botId],
    (err, logs) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(logs);
    }
  );
});

app.get('/api/bot/getUpdates', (req, res) => {
  const { token, last_update_id } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  db.get('SELECT * FROM bots WHERE token = ?', [token], (err, bot) => {
    if (err || !bot) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    db.get(
      'SELECT id FROM users WHERE bot_owner_id = ? AND is_bot = 1',
      [bot.creator_id],
      (err, botUser) => {
        if (err || !botUser) {
          return res.status(404).json({ error: 'Bot user not found' });
        }
        
        db.all(
          `SELECT m.*, u.username as sender_name 
           FROM messages m 
           LEFT JOIN users u ON m.sender_id = u.id
           WHERE m.receiver_id = ? AND m.id > ? 
           ORDER BY m.id ASC LIMIT 50`,
          [botUser.id, last_update_id || 0],
          (err, messages) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const formattedMessages = messages.map(msg => ({
              id: msg.id,
              chat_id: msg.sender_id,
              sender_id: msg.sender_id,
              sender_name: msg.sender_name || 'Пользователь',
              content: msg.content,
              timestamp: msg.timestamp
            }));
            
            res.json({ messages: formattedMessages });
          }
        );
      }
    );
  });
});

app.post('/api/bot/send', (req, res) => {
  const { token, chat_id, text } = req.body;
  
  if (!token || !chat_id || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get('SELECT * FROM bots WHERE token = ?', [token], (err, bot) => {
    if (err || !bot) {
      return res.status(401).json({ error: 'Invalid bot token' });
    }

    db.get(
      'SELECT id FROM users WHERE bot_owner_id = ? AND is_bot = 1',
      [bot.creator_id],
      (err, botUser) => {
        if (err || !botUser) {
          return res.status(404).json({ error: 'Bot user not found' });
        }

        db.run(
          'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
          [botUser.id, chat_id, text],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to send message' });
            }

            io.to(chat_id.toString()).emit('newMessage', {
              id: this.lastID,
              sender_id: botUser.id,
              receiver_id: parseInt(chat_id),
              content: text,
              timestamp: new Date().toISOString(),
              sender_username: bot.name,
              profile_pic: null
            });

            res.json({ success: true });
          }
        );
      }
    );
  });
});

// ============= SOCKET.IO =============

io.on('connection', (socket) => {
  console.log('🔌 Пользователь подключен к сокету:', socket.id);

  socket.on('join', (userId) => {
    const userIdStr = userId.toString();
    socket.join(userIdStr);
    socketToUser.set(socket.id, userIdStr);
    userToSocket.set(userIdStr, socket.id);
    
    console.log('👤 Пользователь', userId, 'присоединился к комнате');
    console.log('📊 Всего пользователей онлайн:', userToSocket.size);
    
    const onlineUsers = Array.from(userToSocket.keys());
    socket.emit('onlineUsers', onlineUsers);
    socket.broadcast.emit('userOnline', userId);
  });

  socket.on('userOnline', (userId) => {
    const userIdStr = userId.toString();
    console.log('✅ Получен сигнал userOnline от', userId);
    
    socketToUser.set(socket.id, userIdStr);
    
    if (userToSocket.has(userIdStr) && userToSocket.get(userIdStr) !== socket.id) {
      const oldSocketId = userToSocket.get(userIdStr);
      socketToUser.delete(oldSocketId);
      console.log('🔄 Обновлен сокет для пользователя', userId);
    }
    
    userToSocket.set(userIdStr, socket.id);
    socket.join(userIdStr);
    
    console.log('📊 Всего пользователей онлайн:', userToSocket.size);
    
    const onlineUsers = Array.from(userToSocket.keys());
    socket.emit('onlineUsers', onlineUsers);
    socket.broadcast.emit('userOnline', userId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Пользователь отключился:', socket.id);
    
    const userId = socketToUser.get(socket.id);
    if (userId) {
      console.log('👋 Пользователь', userId, 'вышел');
      socketToUser.delete(socket.id);
      userToSocket.delete(userId);
      console.log('📊 Осталось пользователей онлайн:', userToSocket.size);
      socket.broadcast.emit('userOffline', parseInt(userId));
    }
  });

  socket.on('typing', (data) => {
    const { userId, receiverId, isTyping } = data;
    io.to(receiverId.toString()).emit('userTyping', {
      userId: userId,
      isTyping: isTyping
    });
  });

  socket.on('sendMessage', (data) => {
    const { token, receiverId, content } = data;

    console.log('📨 Получено сообщение:', { token: token ? 'есть' : 'нет', receiverId, content: content?.substring(0, 50) });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('❌ Invalid token for sendMessage:', err);
        return;
      }

      console.log('👤 Отправитель:', user.id, user.username);

      db.run('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [user.id, receiverId, content], function(err) {
          if (err) {
            console.error('❌ Error saving message:', err);
            return;
          }

          console.log('✅ Сообщение сохранено, ID:', this.lastID);

          db.get('SELECT profile_pic, username FROM users WHERE id = ?', [user.id], (err, userData) => {
            const message = {
              id: this.lastID,
              sender_id: user.id,
              receiver_id: parseInt(receiverId),
              content,
              timestamp: new Date().toISOString(),
              sender_username: user.username,
              profile_pic: userData ? userData.profile_pic : null
            };

            console.log('📤 Отправка сообщения получателю:', receiverId);
            
            io.to(receiverId.toString()).emit('newMessage', message);
            io.to(user.id.toString()).emit('newMessage', message);
          });
        });
    });
  });
});

setInterval(() => {
  const connectedSockets = Array.from(io.sockets.sockets.keys());
  console.log('📊 Активные сокеты:', connectedSockets.length, 'Пользователей онлайн:', userToSocket.size);
}, 30000);

// Serve static files
app.use(express.static('public'));

// Handle all other routes - serve index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});