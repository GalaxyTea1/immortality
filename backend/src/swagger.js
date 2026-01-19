import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
dotenv.config();

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Immortality API',
            version: '1.0.0',
            description: 'API Backend Immortality',
            contact: {
                name: 'Immortality Developer'
            }
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT}` || 'http://localhost:3001',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        tags: [
            { name: 'Auth', description: 'Register, login, verify' },
            { name: 'Characters', description: 'Manage characters' },
            { name: 'Inventory', description: 'Manage inventory' },
            { name: 'Equipment', description: 'Manage equipment' },
            { name: 'Skills', description: 'Manage skills' },
            { name: 'Events', description: 'Log events' },
            { name: 'Shop', description: 'Buy and sell' },
            { name: 'Leaderboard', description: 'Leaderboard' }
        ],
        paths: {
            '/api/health': {
                get: {
                    summary: 'Health Check',
                    description: 'Check server status',
                    responses: {
                        200: { description: 'Server is running' }
                    }
                }
            },
            // Auth
            '/api/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register new account',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'email', 'password'],
                                    properties: {
                                        username: { type: 'string', example: 'daoist_1' },
                                        email: { type: 'string', example: 'test@example.com' },
                                        password: { type: 'string', example: '123456' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: { description: 'Register success' },
                        400: { description: 'Invalid information' }
                    }
                }
            },
            '/api/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Login',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'password'],
                                    properties: {
                                        username: { type: 'string', example: 'daoist_1' },
                                        password: { type: 'string', example: '123456' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: 'Login success, return JWT token' },
                        401: { description: 'Invalid username or password' }
                    }
                }
            },
            '/api/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get current user information',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'User information' },
                        401: { description: 'Not logged in' }
                    }
                }
            },
            // Characters
            '/api/characters/{userId}': {
                get: {
                    tags: ['Characters'],
                    summary: 'Get character information',
                    parameters: [
                        { name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    responses: {
                        200: { description: 'Character information' },
                        404: { description: 'Character not found' }
                    }
                }
            },
            '/api/characters': {
                post: {
                    tags: ['Characters'],
                    summary: 'Create new character',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        userId: { type: 'integer', example: 1 },
                                        name: { type: 'string', example: 'Daoist' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 201: { description: 'Create success' } }
                }
            },
            '/api/characters/{id}': {
                put: {
                    tags: ['Characters'],
                    summary: 'Update character (Save game)',
                    parameters: [
                        { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        realm_index: { type: 'integer' },
                                        level: { type: 'integer' },
                                        exp: { type: 'integer' },
                                        spirit_stones: { type: 'integer' },
                                        hp: { type: 'integer' },
                                        attack: { type: 'integer' },
                                        defense: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Update success' } }
                }
            },
            // Inventory
            '/api/inventory/{characterId}': {
                get: {
                    tags: ['Inventory'],
                    summary: 'Get all inventory',
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'Inventory list' } }
                }
            },
            '/api/inventory/{characterId}/add': {
                post: {
                    tags: ['Inventory'],
                    summary: 'Add item to inventory',
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        itemId: { type: 'string', example: 'tieu_hoan_dan' },
                                        quantity: { type: 'integer', example: 5 }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Add success' } }
                }
            },
            // Equipment
            '/api/equipment/{characterId}': {
                get: {
                    tags: ['Equipment'],
                    summary: 'Get equipment',
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'Equipment list' } }
                }
            },
            '/api/equipment/{characterId}/equip': {
                post: {
                    tags: ['Equipment'],
                    summary: 'Equip equipment',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        slot: { type: 'string', example: 'weapon' },
                                        itemId: { type: 'string', example: 'moc_kiem' },
                                        enhanceLevel: { type: 'integer', example: 0 }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Equip success' } }
                }
            },
            // Shop
            '/api/shop/items': {
                get: {
                    tags: ['Shop'],
                    summary: 'Get shop items',
                    parameters: [
                        { name: 'category', in: 'query', schema: { type: 'string', enum: ['pill', 'material', 'equipment'] } }
                    ],
                    responses: { 200: { description: 'Shop items list' } }
                }
            },
            '/api/shop/buy': {
                post: {
                    tags: ['Shop'],
                    summary: 'Buy item',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        characterId: { type: 'integer', example: 1 },
                                        itemId: { type: 'string', example: 'tieu_hoan_dan' },
                                        quantity: { type: 'integer', example: 10 }
                                    }
                                }
                            }
                        }
                    },
                    responses: { 200: { description: 'Buy success' } }
                }
            },
            // Leaderboard
            '/api/leaderboard': {
                get: {
                    tags: ['Leaderboard'],
                    summary: 'Leaderboard',
                    parameters: [
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
                        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
                    ],
                    responses: { 200: { description: 'Leaderboard list' } }
                }
            },
            '/api/leaderboard/power': {
                get: {
                    tags: ['Leaderboard'],
                    summary: 'Leaderboard by power',
                    responses: { 200: { description: 'Leaderboard list' } }
                }
            },
            '/api/leaderboard/reputation': {
                get: {
                    tags: ['Leaderboard'],
                    summary: 'Leaderboard by reputation',
                    responses: { 200: { description: 'Leaderboard list' } }
                }
            },
            // Skills
            '/api/skills/{characterId}': {
                get: {
                    tags: ['Skills'],
                    summary: 'Get skills',
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } }
                    ],
                    responses: { 200: { description: 'Skills list' } }
                }
            },
            // Events
            '/api/events/{characterId}': {
                get: {
                    tags: ['Events'],
                    summary: 'Get events',
                    parameters: [
                        { name: 'characterId', in: 'path', required: true, schema: { type: 'integer' } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
                    ],
                    responses: { 200: { description: 'Events list' } }
                }
            }
        }
    },
    apis: [] // We define everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);
