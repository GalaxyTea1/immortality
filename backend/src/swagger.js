import swaggerJsdoc from 'swagger-jsdoc';
import { PORT } from './config.js';

const json = (schema) => ({
  required: true,
  content: {
    'application/json': { schema },
  },
});

const characterId = {
  name: 'characterId',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};

const ok = (description = 'Success') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessEnvelope' },
    },
  },
});

const error = (description = 'Error') => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorEnvelope' },
    },
  },
});

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Immortality API',
      version: '1.1.0',
      description: 'Backend API for Immortality. Successful responses use `{ success: true, data }`; errors use `{ success: false, error: { message, details? } }`. Gameplay mutation routes are limited separately at 600 requests/minute per authenticated user + character.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: { type: 'object' },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string' },
                details: {},
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Characters' },
      { name: 'Inventory' },
      { name: 'Equipment' },
      { name: 'Gameplay' },
      { name: 'Quests' },
      { name: 'Shop' },
      { name: 'Leaderboard' },
      { name: 'Events' },
      { name: 'Skills' },
    ],
    paths: {
      '/api/health': {
        get: {
          tags: ['Gameplay'],
          summary: 'Health check',
          responses: { 200: ok('Backend is running') },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register and create the first character',
          requestBody: json({
            type: 'object',
            required: ['username', 'email', 'password'],
            properties: {
              username: { type: 'string', example: 'daoist1' },
              email: { type: 'string', example: 'daoist1@example.com' },
              password: { type: 'string', example: 'secret123' },
            },
          }),
          responses: { 201: ok('Registered'), 400: error('Invalid input') },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login by username or email',
          requestBody: json({
            type: 'object',
            required: ['username', 'password'],
            properties: {
              username: { type: 'string' },
              password: { type: 'string' },
            },
          }),
          responses: { 200: ok('JWT token and user'), 401: error('Invalid credentials') },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user and character summary',
          security: [{ bearerAuth: [] }],
          responses: { 200: ok(), 401: error('Not logged in') },
        },
      },
      '/api/auth/change-password': {
        post: {
          tags: ['Auth'],
          summary: 'Change password',
          security: [{ bearerAuth: [] }],
          requestBody: json({
            type: 'object',
            required: ['currentPassword', 'newPassword'],
            properties: {
              currentPassword: { type: 'string' },
              newPassword: { type: 'string' },
            },
          }),
          responses: { 200: ok(), 401: error('Wrong current password') },
        },
      },
      '/api/characters/{id}': {
        get: {
          tags: ['Characters'],
          summary: 'Get owned character by character id',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: ok('Character'), 403: error('Not owner'), 404: error('Not found') },
        },
        put: {
          tags: ['Characters'],
          summary: 'Metadata-only character save',
          description: 'Only safe metadata such as `name` is accepted. Progression, resources, inventory, and equipment are mutated through gameplay routes.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: json({
            type: 'object',
            properties: { name: { type: 'string', maxLength: 100 } },
          }),
          responses: { 200: ok('Character'), 400: error('Invalid metadata') },
        },
      },
      '/api/inventory/{characterId}': {
        get: {
          tags: ['Inventory'],
          summary: 'List owned character inventory',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok('Inventory array') },
        },
      },
      '/api/inventory/{characterId}/use': {
        post: {
          tags: ['Inventory'],
          summary: 'Use a pill or skill book server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({
            type: 'object',
            required: ['itemId'],
            properties: {
              itemId: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, default: 1 },
              enhanceLevel: { type: 'integer', minimum: 0, default: 0 },
            },
          }),
          responses: { 200: ok(), 400: error('Invalid item or quantity') },
        },
      },
      '/api/equipment/{characterId}': {
        get: {
          tags: ['Equipment'],
          summary: 'Get equipped items',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok() },
        },
      },
      '/api/equipment/{characterId}/equip': {
        post: {
          tags: ['Equipment'],
          summary: 'Equip inventory item server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({
            type: 'object',
            required: ['slot', 'itemId'],
            properties: {
              slot: { type: 'string' },
              itemId: { type: 'string' },
              enhanceLevel: { type: 'integer', default: 0 },
            },
          }),
          responses: { 200: ok(), 400: error('Invalid equipment') },
        },
      },
      '/api/equipment/{characterId}/unequip': {
        post: {
          tags: ['Equipment'],
          summary: 'Unequip item server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', required: ['slot'], properties: { slot: { type: 'string' } } }),
          responses: { 200: ok() },
        },
      },
      '/api/equipment/{characterId}/upgrade': {
        post: {
          tags: ['Equipment'],
          summary: 'Upgrade equipped item server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', required: ['slot'], properties: { slot: { type: 'string' } } }),
          responses: { 200: ok(), 400: error('Missing materials') },
        },
      },
      '/api/shop/items': {
        get: {
          tags: ['Shop'],
          summary: 'List purchasable catalog items',
          parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
          responses: { 200: ok() },
        },
      },
      '/api/shop/buy': {
        post: {
          tags: ['Shop'],
          summary: 'Buy catalog item server-side',
          security: [{ bearerAuth: [] }],
          requestBody: json({
            type: 'object',
            required: ['characterId', 'itemId'],
            properties: {
              characterId: { type: 'integer' },
              itemId: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, maximum: 999, default: 1 },
            },
          }),
          responses: { 200: ok(), 403: error('Not owner') },
        },
      },
      '/api/shop/sell': {
        post: {
          tags: ['Shop'],
          summary: 'Sell inventory item server-side',
          security: [{ bearerAuth: [] }],
          requestBody: json({
            type: 'object',
            required: ['characterId', 'itemId'],
            properties: {
              characterId: { type: 'integer' },
              itemId: { type: 'string' },
              quantity: { type: 'integer', minimum: 1, maximum: 99, default: 1 },
            },
          }),
          responses: { 200: ok(), 400: error('Not enough items') },
        },
      },
      '/api/cultivation/{characterId}/cultivate': {
        post: {
          tags: ['Gameplay'],
          summary: 'Server-authoritative cultivation tick',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', properties: { mode: { type: 'string', enum: ['manual', 'meditation'], default: 'manual' } } }),
          responses: { 200: ok() },
        },
      },
      '/api/cultivation/{characterId}/cultivate/batch': {
        post: {
          tags: ['Gameplay'],
          summary: 'Batch server-authoritative manual cultivation ticks',
          description: 'Used by the client to coalesce rapid manual clicks into one request. Maximum 10 ticks per request.',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({
            type: 'object',
            required: ['ticks'],
            properties: {
              mode: { type: 'string', enum: ['manual', 'meditation'], default: 'manual' },
              ticks: { type: 'integer', minimum: 1, maximum: 10 },
            },
          }),
          responses: { 200: ok(), 400: error('Invalid tick count') },
        },
      },
      '/api/cultivation/{characterId}/breakthrough': {
        post: {
          tags: ['Gameplay'],
          summary: 'Attempt breakthrough server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', properties: { usePill: { type: 'boolean', default: false } } }),
          responses: { 200: ok(), 400: error('Requirements not met') },
        },
      },
      '/api/cultivation/{characterId}/meditation/start': {
        post: {
          tags: ['Gameplay'],
          summary: 'Start server-managed meditation session',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('Already started') },
        },
      },
      '/api/cultivation/{characterId}/meditation/finish': {
        post: {
          tags: ['Gameplay'],
          summary: 'Finish meditation session; server computes elapsed duration',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('No active session') },
        },
      },
      '/api/cultivation/{characterId}/meditate': {
        post: {
          tags: ['Gameplay'],
          summary: 'Short HP recovery meditation with server cooldown',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('Cooldown') },
        },
      },
      '/api/world/{characterId}/explore': {
        post: {
          tags: ['Gameplay'],
          summary: 'Explore a zone server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', required: ['zoneId'], properties: { zoneId: { type: 'string' } } }),
          responses: { 200: ok(), 400: error('Cannot enter zone') },
        },
      },
      '/api/world/{characterId}/refresh-exploration': {
        post: {
          tags: ['Gameplay'],
          summary: 'Spend Spirit Stones to reset daily exploration count',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('Not enough stones') },
        },
      },
      '/api/alchemy/{characterId}/craft': {
        post: {
          tags: ['Gameplay'],
          summary: 'Craft pill server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          requestBody: json({ type: 'object', required: ['recipeId'], properties: { recipeId: { type: 'string' } } }),
          responses: { 200: ok(), 400: error('Missing materials') },
        },
      },
      '/api/quests/{characterId}/active': {
        get: {
          tags: ['Quests'],
          summary: 'Get or create today active quest',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok() },
        },
      },
      '/api/quests/{characterId}/claim': {
        post: {
          tags: ['Quests'],
          summary: 'Claim completed quest reward server-side',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('Quest incomplete') },
        },
      },
      '/api/leaderboard': {
        get: {
          tags: ['Leaderboard'],
          summary: 'Cultivation leaderboard',
          responses: { 200: ok() },
        },
      },
      '/api/leaderboard/power': {
        get: {
          tags: ['Leaderboard'],
          summary: 'Power leaderboard',
          responses: { 200: ok() },
        },
      },
      '/api/leaderboard/reputation': {
        get: {
          tags: ['Leaderboard'],
          summary: 'Reputation leaderboard',
          responses: { 200: ok() },
        },
      },
      '/api/events/{characterId}': {
        get: {
          tags: ['Events'],
          summary: 'Get event logs',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok() },
        },
        post: {
          tags: ['Events'],
          summary: 'Add event log',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 201: ok() },
        },
      },
      '/api/skills/{characterId}': {
        get: {
          tags: ['Skills'],
          summary: 'Get learned skills',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok() },
        },
      },
      '/api/skills/{characterId}/learn': {
        post: {
          tags: ['Skills'],
          summary: 'Learn skill from a book item',
          security: [{ bearerAuth: [] }],
          parameters: [characterId],
          responses: { 200: ok(), 400: error('Invalid book') },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
