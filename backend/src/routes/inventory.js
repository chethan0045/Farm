const express = require('express');
const Inventory = require('../models/Inventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const items = await Inventory.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const items = await Inventory.find({ $expr: { $lte: ['$currentStock', '$minStockLevel'] } });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transactions
router.get('/transactions', async (req, res) => {
  try {
    const { inventoryId } = req.query;
    const filter = inventoryId ? { inventory: inventoryId } : {};
    const txns = await InventoryTransaction.find(filter).populate('inventory', 'name unit').populate('batch', 'batchNumber').sort({ date: -1 });
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const txn = await InventoryTransaction.create(req.body);
    // Update stock
    const inc = (req.body.type === 'purchase') ? req.body.quantity : -Math.abs(req.body.quantity);
    await Inventory.findByIdAndUpdate(req.body.inventory, { $inc: { currentStock: inc } });
    const populated = await txn.populate([{ path: 'inventory', select: 'name unit' }, { path: 'batch', select: 'batchNumber' }]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
