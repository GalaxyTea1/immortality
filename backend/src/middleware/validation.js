import Joi from 'joi';
import { fail } from '../http/response.js';

// ==================== AUTH SCHEMAS ====================

export const registerSchema = Joi.object({
    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username must not exceed 30 characters',
            'string.alphanum': 'Username must only contain letters and numbers',
            'any.required': 'Username is required',
        }),
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Invalid email format',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .min(6)
        .max(100)
        .required()
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'any.required': 'Password is required',
        }),
});

export const loginSchema = Joi.object({
    username: Joi.string().required().messages({
        'any.required': 'Username or email is required',
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required',
    }),
});

// ==================== CHARACTER SCHEMAS ====================

export const updateCharacterSchema = Joi.object({
    name: Joi.string().max(100),
    realm_index: Joi.number().integer().min(0),
    level: Joi.number().integer().min(1),
    exp: Joi.number().integer().min(0),
    max_exp: Joi.number().integer().min(1),
    spirit_stones: Joi.number().integer().min(0),
    hp: Joi.number().integer().min(0),
    max_hp: Joi.number().integer().min(1),
    attack: Joi.number().integer().min(0),
    defense: Joi.number().integer().min(0),
    agility: Joi.number().integer().min(0),
    spirit: Joi.number().integer().min(0),
    cultivation_speed: Joi.number().min(0),
    foundation_value: Joi.number().integer().min(0),
    foundation_max: Joi.number().integer().min(1),
    inner_demon_value: Joi.number().integer().min(0),
    inner_demon_max: Joi.number().integer().min(1),
    reputation_points: Joi.number().integer().min(0),
    reputation_level: Joi.number().integer().min(1),
    reputation_title: Joi.string().max(100),
    alchemy_level: Joi.number().integer().min(1),
    alchemy_exp: Joi.number().integer().min(0),
    exploration_count: Joi.number().integer().min(0),
    exploration_last_reset: Joi.string().allow(null),
    last_meditation_time: Joi.string().allow(null),
}).min(1); // At least 1 field required

export const saveCharacterMetadataSchema = Joi.object({
    name: Joi.string().max(100),
}).min(1);

// ==================== INVENTORY SCHEMAS ====================

export const removeItemSchema = Joi.object({
    itemId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).default(1),
    enhanceLevel: Joi.number().integer().min(0).default(0),
});

export const useItemSchema = Joi.object({
    itemId: Joi.string().required(),
    quantity: Joi.number().integer().min(1).default(1),
    enhanceLevel: Joi.number().integer().min(0).default(0),
});

// ==================== EQUIPMENT SCHEMAS ====================

export const equipSchema = Joi.object({
    itemId: Joi.string().required(),
    slot: Joi.string().required(),
    enhanceLevel: Joi.number().integer().min(0).default(0),
});

// ==================== CULTIVATION SCHEMAS ====================

export const cultivateSchema = Joi.object({
    mode: Joi.string().valid('manual', 'meditation').default('manual'),
});

export const cultivateBatchSchema = Joi.object({
    mode: Joi.string().valid('manual', 'meditation').default('manual'),
    ticks: Joi.number().integer().min(1).max(10).required(),
});

export const breakthroughSchema = Joi.object({
    usePill: Joi.boolean().default(false),
});

// ==================== WORLD / ALCHEMY SCHEMAS ====================

export const exploreSchema = Joi.object({
    zoneId: Joi.string().required(),
});

export const craftPillSchema = Joi.object({
    recipeId: Joi.string().required(),
});

// ==================== VALIDATION MIDDLEWARE ====================

/**
 * Create validation middleware for a given schema
 * @param {Joi.ObjectSchema} schema
 * @returns {Function} Express middleware
 */
export function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,       // Return all errors, not just the first
            stripUnknown: true,      // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(d => d.message);
            return fail(res, 400, 'Validation failed', errors);
        }

        req.body = value; // Use sanitized values
        next();
    };
}
