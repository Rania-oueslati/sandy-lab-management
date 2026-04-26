const db = require('../db');

class DatabaseAgent {
  
  async getInventory() {
    try {
      const res = await db.query('SELECT * FROM inventory ORDER BY name ASC');
      return res.rows;
    } catch (err) {
      console.error('DatabaseAgent Error (getInventory):', err);
      return [];
    }
  }


  async getInventoryItem(name) {
    try {
      const res = await db.query('SELECT * FROM inventory WHERE name ILIKE $1', [`%${name}%`]);
      return res.rows[0] || null;
    } catch (err) {
      console.error('DatabaseAgent Error (getInventoryItem):', err);
      return null;
    }
  }

  async logAction(actionType, description, metadata = {}) {
    try {
      await db.query(
        'INSERT INTO ai_actions_log (action_type, description, metadata) VALUES ($1, $2, $3)',
        [actionType, description, JSON.stringify(metadata)]
      );
      return true;
    } catch (err) {
      console.error('DatabaseAgent Error (logAction):', err);
      return false;
    }
  }

  
  async updateInventoryQuantity(name, changeAmount, reason) {
    try {
      let item = await this.getInventoryItem(name);
      
      if (!item) {
        if (changeAmount < 0) {
           return { success: false, message: `Cannot remove ${name} because it does not exist in the inventory.` };
        }
      
        const insertRes = await db.query(
          'INSERT INTO inventory (name, category, quantity, unit) VALUES ($1, $2, $3, $4) RETURNING id',
          [name, 'General', changeAmount, 'units']
        );
        const newItemId = insertRes.rows[0].id;
        
        await db.query(
          'INSERT INTO inventory_transactions (inventory_id, change_amount, reason) VALUES ($1, $2, $3)',
          [newItemId, changeAmount, reason || 'AI Added New Item']
        );
        return { success: true, message: `Successfully added new item ${name} with quantity ${changeAmount}.` };
      }

      const newQuantity = item.quantity + changeAmount;
      if (newQuantity < 0) {
        return { success: false, message: `Not enough ${name} to remove. Current quantity is ${item.quantity}.` };
      }

      await db.query('UPDATE inventory SET quantity = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2', [newQuantity, item.id]);
      
      await db.query(
        'INSERT INTO inventory_transactions (inventory_id, change_amount, reason) VALUES ($1, $2, $3)',
        [item.id, changeAmount, reason || 'AI Update']
      );

      return { success: true, message: `Successfully updated ${name}. New quantity is ${newQuantity}.` };
    } catch (err) {
      console.error('DatabaseAgent Error (updateInventoryQuantity):', err);
      return { success: false, message: 'Database error while updating inventory.' };
    }
  }

  async deleteItemById(id) {
    try {
      await db.query('DELETE FROM inventory_transactions WHERE inventory_id = $1', [id]);
      await db.query('DELETE FROM inventory WHERE id = $1', [id]);
      return { success: true };
    } catch (err) {
      console.error('DatabaseAgent Error (deleteItemById):', err);
      throw err;
    }
  }

  async clearAll() {
    try {
      await db.query('DELETE FROM inventory_transactions');
      await db.query('DELETE FROM inventory');
      return { success: true };
    } catch (err) {
      console.error('DatabaseAgent Error (clearAll):', err);
      throw err;
    }
  }
}

module.exports = new DatabaseAgent();
