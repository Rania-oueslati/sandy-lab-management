const express = require('express');
const cors = require('cors');
require('dotenv').config();

const LeadPlanner = require('./agents/LangGraphPlanner');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.static('public'));


app.get('/api/health', async (req, res) => {
  try {
   
    await db.query('SELECT 1');
    res.json({ status: 'OK', message: 'Treedome Lab Backend is running and connected to the database!' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed.', error: err.message });
  }
});


app.get('/api/inventory', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

const DatabaseAgent = require('./agents/DatabaseAgent');


app.post('/api/inventory/update', async (req, res) => {
  const { item, changeAmount } = req.body;
  if (!item || typeof changeAmount !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await DatabaseAgent.updateInventoryQuantity(item, changeAmount);
    res.json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});


app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await DatabaseAgent.deleteItemById(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});


app.delete('/api/inventory', async (req, res) => {
  try {
    await DatabaseAgent.clearAll();
    res.json({ message: 'Cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Clear failed' });
  }
});


app.post('/api/chat', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Please provide a query.' });
  }

  try {
    const response = await LeadPlanner.processRequest(query);
    res.json({ response });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`[System] Treedome Lab Backend is running on http://localhost:${PORT}`);
});
