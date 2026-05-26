import express from "express";
import { ALCHEMY_RECIPES, assertValidInventoryEntryFromDb, calculateAlchemyProgress, getReputationTitleFromDb } from "../domain/gameCatalog.js";
import { withTransaction } from "../db/index.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireCharacterOwner } from "../middleware/ownership.middleware.js";
import { gameplayLimiter } from "../middleware/rateLimit.js";
import { craftPillSchema, validate } from "../middleware/validation.js";
import { fail, failFromError, ok } from "../http/response.js";
import { trackQuestProgress } from "../services/questTracker.js";

const router = express.Router();

router.use("/:characterId", authMiddleware, requireCharacterOwner("characterId"));

router.post("/:characterId/craft", gameplayLimiter, validate(craftPillSchema), async (req, res) => {
    try {
        const { characterId } = req.params;
        const { recipeId } = req.body;
        const recipe = ALCHEMY_RECIPES[recipeId];

        if (!recipe) {
            return fail(res, 404, "Không tìm thấy công thức");
        }

        const result = await withTransaction(async (client) => {
            const characterResult = await client.query(
                `SELECT alchemy_level, alchemy_exp, reputation_points
         FROM characters
         WHERE id = $1
         FOR UPDATE`,
                [characterId]
            );

            if (characterResult.rows.length === 0) {
                const error = new Error("Không tìm thấy nhân vật");
                error.status = 404;
                throw error;
            }

            const character = characterResult.rows[0];
            if (Number(character.alchemy_level) < recipe.minLevel) {
                const error = new Error(`Cần luyện đan cấp ${recipe.minLevel}`);
                error.status = 400;
                throw error;
            }

            for (const material of recipe.materials) {
                const materialDef = await assertValidInventoryEntryFromDb({ itemId: material.itemId }, client);
                const materialResult = await client.query(
                    `SELECT id, quantity FROM inventory
           WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0
           FOR UPDATE`,
                    [characterId, material.itemId]
                );

                if (materialResult.rows.length === 0 || materialResult.rows[0].quantity < material.quantity) {
                    const itemName = materialDef.name || material.itemId;
                    const error = new Error(`Thiếu ${itemName}`);
                    error.status = 400;
                    throw error;
                }
            }

            for (const material of recipe.materials) {
                await client.query(
                    `UPDATE inventory
           SET quantity = quantity - $3
           WHERE character_id = $1 AND item_id = $2 AND enhance_level = 0`,
                    [characterId, material.itemId, material.quantity]
                );
            }

            await client.query("DELETE FROM inventory WHERE character_id = $1 AND quantity <= 0", [characterId]);

            const levelBonus = (Number(character.alchemy_level) - recipe.minLevel) * 0.1;
            const finalRate = Math.min(0.95, recipe.baseSuccessRate + levelBonus);
            const isSuccess = Math.random() < finalRate;

            if (!isSuccess) {
                await client.query(
                    `UPDATE characters
           SET inner_demon_value = LEAST(inner_demon_max, inner_demon_value + 3)
           WHERE id = $1`,
                    [characterId]
                );

                await client.query(
                    `INSERT INTO event_logs (character_id, event_type, message)
           VALUES ($1, 'danger', $2)`,
                    [characterId, "Luyện đan thất bại. Tâm Ma tăng lên."]
                );

                return {
                    success: false,
                    finalRate,
                    message: "Luyện đan thất bại",
                };
            }

            const outputDef = await assertValidInventoryEntryFromDb({ itemId: recipe.output.itemId }, client);
            await client.query(
                `INSERT INTO inventory (character_id, item_id, quantity, enhance_level)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (character_id, item_id, enhance_level)
         DO UPDATE SET quantity = inventory.quantity + $3`,
                [characterId, recipe.output.itemId, recipe.output.quantity]
            );

            const nextAlchemy = calculateAlchemyProgress(
                {
                    level: character.alchemy_level,
                    exp: character.alchemy_exp,
                },
                recipe.expGain
            );

            const nextReputation = Number(character.reputation_points) + 5;
            const title = await getReputationTitleFromDb(nextReputation, client);

            await client.query(
                `UPDATE characters
         SET alchemy_level = $2, alchemy_exp = $3,
             reputation_points = $4, reputation_level = $5, reputation_title = $6
         WHERE id = $1`,
                [characterId, nextAlchemy.level, nextAlchemy.exp, nextReputation, title.level, title.vietnm || title.title]
            );

            const outputName = outputDef.name || recipe.output.itemId;
            await client.query(
                `INSERT INTO event_logs (character_id, event_type, message)
         VALUES ($1, 'success', $2)`,
                [characterId, `Luyện thành ${outputName}`]
            );

            const questUpdate = await trackQuestProgress(characterId, "craft", client);

            return {
                success: true,
                finalRate,
                output: recipe.output,
                alchemy: nextAlchemy,
                reputation: {
                    value: nextReputation,
                    level: title.level,
                    title: title.vietnm || title.title,
                    vietnm: title.vietnm || title.title,
                    globalnm: title.globalnm,
                    color: title.color,
                },
                questUpdate,
                message: `Luyện thành ${recipe.output.quantity}x ${outputName}`,
            };
        });

        ok(res, result);
    } catch (error) {
        if (error.status) {
            return failFromError(res, error, "Không thể luyện đan");
        }
        console.error("Không thể luyện đan:", error);
        fail(res, 500, "Không thể luyện đan");
    }
});

export default router;
