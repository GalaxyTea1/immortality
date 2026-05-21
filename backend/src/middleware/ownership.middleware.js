import { query } from '../db/index.js';
import { fail } from '../http/response.js';

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
                return fail(res, 400, 'Missing characterId');
            }

            const isOwner = await assertCharacterOwner(req.user.id, characterId);
            if (!isOwner) {
                return fail(res, 403, 'Forbidden character access');
            }

            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            fail(res, 500, 'Ownership check failed');
        }
    };
};
