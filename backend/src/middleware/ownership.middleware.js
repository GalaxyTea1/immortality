import { query } from '../db/index.js';

export const assertCharacterOwner = async (userId, characterId) => {
    const result = await query(
        'SELECT id FROM characters WHERE id = $1 AND user_id = $2',
        [characterId, userId]
    );

    return result.rows.length > 0;
};

export const requireCharacterOwner = (paramName = 'characterId') => {
    return async (req, res, next) => {
        try {
            const characterId = req.params[paramName] || req.body[paramName];

            if (!characterId) {
                return res.status(400).json({ error: 'Missing characterId' });
            }

            const isOwner = await assertCharacterOwner(req.user.id, characterId);
            if (!isOwner) {
                return res.status(403).json({ error: 'Forbidden character access' });
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({ error: 'Ownership check failed' });
        }
    };
};
