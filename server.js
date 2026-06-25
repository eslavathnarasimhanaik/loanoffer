const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Database connection state
let pool = null;
let supabase = null;
let dbMode = 'memory'; // 'supabase', 'mysql', or 'memory'

// In-Memory mock storage fallback (if MySQL is not running)
let inMemoryLeads = [];

// Authentication variables
const ADMIN_TOKEN = 'loonemi-admin-token-secret-xyz';
const ALLOWED_ADMIN_EMAIL = 'eslavathnarasimhanaik@gmail.com';

// Initialize Database with Fallback Hierarchy
async function initDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  const isSupabaseConfigured = supabaseUrl && supabaseKey && 
    supabaseUrl !== 'https://your-project-reference.supabase.co' && 
    supabaseKey !== 'your-supabase-anon-key-here' &&
    supabaseUrl.trim() !== '' && 
    supabaseKey.trim() !== '';

  if (isSupabaseConfigured) {
    try {
      console.log('[Database] Initializing Supabase Cloud Client...');
      supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test the connection by running a query
      const { data, error } = await supabase.from('leads').select('id').limit(1);
      if (error) {
        throw error;
      }
      
      dbMode = 'supabase';
      console.log('--------------------------------------------------');
      console.log('[Database] Connected to Supabase Cloud Database.');
      console.log(`[Database] Target URL: ${supabaseUrl}`);
      console.log('--------------------------------------------------');
      return;
    } catch (error) {
      console.log('--------------------------------------------------');
      console.log('[Database Warning] Supabase connection failed. Details:');
      console.log(error.message);
      console.log('[Database Warning] Falling back to local MySQL...');
      console.log('--------------------------------------------------');
    }
  } else {
    console.log('[Database] Supabase is not configured or placeholders used. Checking MySQL...');
  }

  // Attempt local MySQL connection
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  try {
    // 1. Connect without database name to ensure DB exists
    const tempConnection = await mysql.createConnection(connectionConfig);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'loonemi_db'}\``);
    await tempConnection.end();

    // 2. Establish connection pool to the created database
    pool = mysql.createPool({
      ...connectionConfig,
      database: process.env.DB_NAME || 'loonemi_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 3. Create leads table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        address VARCHAR(255) DEFAULT 'N/A',
        emi DECIMAL(12, 2) DEFAULT 0.00,
        bank VARCHAR(50) NOT NULL,
        hasStudentLoan VARCHAR(5) NOT NULL,
        studentLoanBank VARCHAR(100) DEFAULT 'N/A',
        studentLoanAmount DECIMAL(12, 2) DEFAULT 0.00,
        studentLoanYear INT DEFAULT 0,
        loanType VARCHAR(20) NOT NULL,
        paymentMode VARCHAR(20) NOT NULL,
        upiId VARCHAR(50) DEFAULT 'N/A',
        status VARCHAR(20) DEFAULT 'Pending',
        reward INT DEFAULT 0,
        transactionId VARCHAR(100) DEFAULT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        paidDate DATETIME DEFAULT NULL
      )
    `;
    
    await pool.query(createTableQuery);
    dbMode = 'mysql';
    console.log('--------------------------------------------------');
    console.log('[Database] MySQL connected and table synchronized successfully.');
    console.log(`[Database] Target: ${process.env.DB_NAME || 'loonemi_db'} table: leads`);
    console.log('--------------------------------------------------');
  } catch (error) {
    console.log('--------------------------------------------------');
    console.log('[Database Warning] MySQL connection failed. Details:');
    console.log(error.message);
    console.log('\n[Fallback Status] Falling back to IN-MEMORY Mock Storage.');
    console.log('[Hint] Make sure MySQL service is running on Port 3306 and credentials in .env are correct.');
    console.log('--------------------------------------------------');
    dbMode = 'memory';
  }
}

// Middleware: Check Authorization Header for Admin Routes
function checkAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin session is invalid or expired.' });
  }
  next();
}

// --- AUTHENTICATION API ROUTES ---

// 1. Admin Login (POST /api/auth/login)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  // Validate allowed admin email
  if (email.trim().toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
    return res.status(403).json({ success: false, message: 'Access denied. Unauthorized administrator email.' });
  }

  // Verify password from env configuration
  const envPassword = process.env.ADMIN_PASSWORD || 'naik123';
  if (password !== envPassword) {
    return res.status(401).json({ success: false, message: 'Invalid admin password. Please try again.' });
  }

  // Successful login
  res.json({ success: true, token: ADMIN_TOKEN, message: 'Authentication successful.' });
});


// --- LEADS MANAGEMENT API ROUTES ---

// 1. Create a lead (POST /api/leads) - PUBLIC (No Auth required)
app.post('/api/leads', async (req, res) => {
  const lead = {
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address || 'N/A',
    emi: parseFloat(req.body.emi || 0),
    bank: req.body.bank,
    hasStudentLoan: req.body.hasStudentLoan,
    studentLoanBank: req.body.studentLoanBank || 'N/A',
    studentLoanAmount: parseFloat(req.body.studentLoanAmount || 0),
    studentLoanYear: parseInt(req.body.studentLoanYear || 0),
    loanType: req.body.loanType,
    paymentMode: req.body.paymentMode,
    upiId: req.body.upiId || 'N/A',
    status: req.body.status || 'Pending',
    reward: parseInt(req.body.reward || 0),
    transactionId: req.body.transactionId || null,
    date: req.body.date ? new Date(req.body.date).toISOString() : new Date().toISOString(),
    paidDate: req.body.paidDate ? new Date(req.body.paidDate).toISOString() : null
  };

  if (dbMode === 'supabase') {
    try {
      const { error } = await supabase.from('leads').insert([lead]);
      if (error) throw error;
      res.status(201).json({ success: true, message: 'Lead saved to Supabase.', lead });
    } catch (error) {
      console.error('[API Error] Failed to insert lead into Supabase:', error);
      res.status(500).json({ success: false, message: 'Supabase database insert failed.' });
    }
  } else if (dbMode === 'mysql') {
    try {
      const query = `
        INSERT INTO leads 
        (id, name, email, phone, address, emi, bank, hasStudentLoan, studentLoanBank, studentLoanAmount, studentLoanYear, loanType, paymentMode, upiId, status, reward, transactionId, date, paidDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        lead.id, lead.name, lead.email, lead.phone, lead.address, lead.emi, lead.bank,
        lead.hasStudentLoan, lead.studentLoanBank, lead.studentLoanAmount, lead.studentLoanYear,
        lead.loanType, lead.paymentMode, lead.upiId, lead.status, lead.reward, lead.transactionId,
        lead.date, lead.paidDate
      ];

      await pool.query(query, values);
      res.status(201).json({ success: true, message: 'Lead saved to MySQL.', lead });
    } catch (error) {
      console.error('[API Error] Failed to insert lead:', error);
      res.status(500).json({ success: false, message: 'Database insert failed.' });
    }
  } else {
    // In-memory fallback
    inMemoryLeads.unshift(lead);
    res.status(201).json({ success: true, message: 'Lead saved to In-Memory Fallback.', lead });
  }
});

// 2. Fetch leads (GET /api/leads) - SECURED
app.get('/api/leads', checkAuth, async (req, res) => {
  const statusFilter = req.query.status || 'all';
  const searchQuery = req.query.search || '';

  if (dbMode === 'supabase') {
    try {
      let query = supabase.from('leads').select('*');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchQuery) {
        const cleanSearch = searchQuery.replace(/,/g, '');
        const wild = `%${cleanSearch}%`;
        query = query.or(`name.ilike.${wild},phone.ilike.${wild},email.ilike.${wild},bank.ilike.${wild}`);
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('[API Error] Failed to fetch leads from Supabase:', error);
      res.status(500).json({ success: false, message: 'Supabase query failed.' });
    }
  } else if (dbMode === 'mysql') {
    try {
      let query = 'SELECT * FROM leads';
      const conditions = [];
      const values = [];

      // Add status condition
      if (statusFilter !== 'all') {
        conditions.push('status = ?');
        values.push(statusFilter);
      }

      // Add search query condition
      if (searchQuery) {
        conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR bank LIKE ?)');
        const wild = `%${searchQuery}%`;
        values.push(wild, wild, wild, wild);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Order by date descending
      query += ' ORDER BY date DESC';

      const [rows] = await pool.query(query, values);
      res.json(rows);
    } catch (error) {
      console.error('[API Error] Failed to fetch leads:', error);
      res.status(500).json({ success: false, message: 'Database query failed.' });
    }
  } else {
    // In-memory filter fallback
    let filtered = [...inMemoryLeads];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.bank.toLowerCase().includes(q)
      );
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(filtered);
  }
});

// 3. Update status / approve payout (PUT /api/leads/:id/status) - SECURED
app.put('/api/leads/:id/status', checkAuth, async (req, res) => {
  const { id } = req.params;
  const { status, reward, transactionId } = req.body;
  const paidDate = status === 'Paid' ? new Date() : null;

  if (dbMode === 'supabase') {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          status,
          reward: reward || 0,
          transactionId: transactionId || null,
          paidDate: paidDate ? paidDate.toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true, message: 'Lead updated successfully in Supabase.' });
    } catch (error) {
      console.error('[API Error] Failed to update lead in Supabase:', error);
      res.status(500).json({ success: false, message: 'Supabase update failed.' });
    }
  } else if (dbMode === 'mysql') {
    try {
      const query = `
        UPDATE leads 
        SET status = ?, reward = ?, transactionId = ?, paidDate = ? 
        WHERE id = ?
      `;
      await pool.query(query, [status, reward || 0, transactionId || null, paidDate, id]);
      res.json({ success: true, message: 'Lead updated successfully in MySQL.' });
    } catch (error) {
      console.error('[API Error] Failed to update lead status:', error);
      res.status(500).json({ success: false, message: 'Database update failed.' });
    }
  } else {
    // In-memory fallback
    const index = inMemoryLeads.findIndex(l => l.id === id);
    if (index !== -1) {
      inMemoryLeads[index] = {
        ...inMemoryLeads[index],
        status,
        reward: reward || 0,
        transactionId: transactionId || null,
        paidDate
      };
      res.json({ success: true, message: 'Lead updated in-memory.' });
    } else {
      res.status(404).json({ success: false, message: 'Lead not found.' });
    }
  }
});

// 4. Erase database (DELETE /api/leads) - SECURED
app.delete('/api/leads', checkAuth, async (req, res) => {
  if (dbMode === 'supabase') {
    try {
      const { error } = await supabase.from('leads').delete().neq('id', '');
      if (error) throw error;
      res.json({ success: true, message: 'Supabase leads table cleared.' });
    } catch (error) {
      console.error('[API Error] Failed to clear Supabase table:', error);
      res.status(500).json({ success: false, message: 'Supabase clear failed.' });
    }
  } else if (dbMode === 'mysql') {
    try {
      await pool.query('TRUNCATE TABLE leads');
      res.json({ success: true, message: 'MySQL leads table truncated.' });
    } catch (error) {
      console.error('[API Error] Failed to truncate table:', error);
      res.status(500).json({ success: false, message: 'Database clear failed.' });
    }
  } else {
    // In-memory fallback
    inMemoryLeads = [];
    res.json({ success: true, message: 'In-memory database cleared.' });
  }
});

// 5. Inject bulk mock leads (POST /api/leads/mock) - SECURED
app.post('/api/leads/mock', checkAuth, async (req, res) => {
  const mockLeads = req.body.leads || [];
  
  if (mockLeads.length === 0) {
    return res.status(400).json({ success: false, message: 'No mock leads provided.' });
  }

  if (dbMode === 'supabase') {
    try {
      const formattedMockLeads = mockLeads.map(l => ({
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        address: l.address || 'N/A',
        emi: parseFloat(l.emi || 0),
        bank: l.bank,
        hasStudentLoan: l.hasStudentLoan,
        studentLoanBank: l.studentLoanBank || 'N/A',
        studentLoanAmount: parseFloat(l.studentLoanAmount || 0),
        studentLoanYear: parseInt(l.studentLoanYear || 0),
        loanType: l.loanType,
        paymentMode: l.paymentMode,
        upiId: l.upiId || 'N/A',
        status: l.status || 'Pending',
        reward: parseInt(l.reward || 0),
        transactionId: l.transactionId || null,
        date: l.date ? new Date(l.date).toISOString() : new Date().toISOString(),
        paidDate: l.paidDate ? new Date(l.paidDate).toISOString() : null
      }));

      const { error } = await supabase.from('leads').insert(formattedMockLeads);
      if (error) throw error;
      res.json({ success: true, message: `Successfully injected ${mockLeads.length} mock leads into Supabase.` });
    } catch (error) {
      console.error('[API Error] Failed to inject mock leads into Supabase:', error);
      res.status(500).json({ success: false, message: 'Supabase injection failed.' });
    }
  } else if (dbMode === 'mysql') {
    try {
      const query = `
        INSERT INTO leads 
        (id, name, email, phone, address, emi, bank, hasStudentLoan, studentLoanBank, studentLoanAmount, studentLoanYear, loanType, paymentMode, upiId, status, reward, transactionId, date, paidDate)
        VALUES ?
      `;

      const values = mockLeads.map(l => [
        l.id, l.name, l.email, l.phone, l.address, parseFloat(l.emi || 0), l.bank,
        l.hasStudentLoan, l.studentLoanBank, parseFloat(l.studentLoanAmount || 0), parseInt(l.studentLoanYear || 0),
        l.loanType, l.paymentMode, l.upiId, l.status, parseInt(l.reward || 0), l.transactionId || null,
        new Date(l.date), l.paidDate ? new Date(l.paidDate) : null
      ]);

      await pool.query(query, [values]);
      res.json({ success: true, message: `Successfully injected ${mockLeads.length} mock leads into MySQL.` });
    } catch (error) {
      console.error('[API Error] Failed to inject mock leads:', error);
      res.status(500).json({ success: false, message: 'MySQL injection failed.' });
    }
  } else {
    // In-memory fallback
    inMemoryLeads = [...mockLeads, ...inMemoryLeads];
    res.json({ success: true, message: `Successfully injected ${mockLeads.length} mock leads in-memory.` });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log('==================================================');
  console.log(`Loonemi Backend Server running at http://localhost:${PORT}`);
  console.log('==================================================');
  await initDatabase();
});
