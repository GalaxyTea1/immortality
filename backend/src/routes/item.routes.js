import express from 'express';
import { getItemDefinitionFromDb, listItemDefinitionsFromDb } from '../domain/gameCatalog.js';
import { fail, ok } from '../http/response.js';

const router = express.Router();

// GET /api/items - Product item catalog
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const items = await listItemDefinitionsFromDb({ type });
    ok(res, { items });
  } catch (error) {
    console.error('Error fetching item catalog:', error);
    fail(res, 500, 'Error fetching item catalog');
  }
});

// GET /api/items/:itemId - Product item detail
router.get('/:itemId', async (req, res) => {
  try {
    const item = await getItemDefinitionFromDb(req.params.itemId);
    if (!item) {
      return fail(res, 404, 'Item not found');
    }

    ok(res, { item });
  } catch (error) {
    console.error('Error fetching item detail:', error);
    fail(res, 500, 'Error fetching item detail');
  }
});

export default router;
