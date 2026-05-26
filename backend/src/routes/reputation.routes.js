import express from 'express';
import { listReputationTitlesFromDb } from '../domain/gameCatalog.js';
import { fail, ok } from '../http/response.js';

const router = express.Router();

// GET /api/reputation/titles - Product reputation catalog
router.get('/titles', async (req, res) => {
  try {
    const titles = await listReputationTitlesFromDb();
    ok(res, { titles });
  } catch (error) {
    console.error('Error fetching reputation titles:', error);
    fail(res, 500, 'Không thể tải danh hiệu danh vọng');
  }
});

export default router;
