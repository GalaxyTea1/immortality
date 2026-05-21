import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { testConnection } from './db/index.js';
import { initSocket } from './socket.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { CORS_ORIGINS, NODE_ENV, PORT } from './config.js';
import { fail, ok } from './http/response.js';

// Import routes
import characterRoutes from './routes/character.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import authRoutes from './routes/auth.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import eventsRoutes from './routes/events.routes.js';
import shopRoutes from './routes/shop.routes.js';
import cultivationRoutes from './routes/cultivation.routes.js';
import worldRoutes from './routes/world.routes.js';
import alchemyRoutes from './routes/alchemy.routes.js';
import questRoutes from './routes/quest.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());

// Rate limiting
app.use('/api/', generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Immortality API Documentation'
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  ok(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Immortality Backend is running!'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/cultivation', cultivationRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/alchemy', alchemyRoutes);
app.use('/api/quests', questRoutes);

// 404 Handler
app.use((req, res) => {
  fail(res, 404, 'Endpoint not found');
});

// Error Handler
app.use((err, req, res, next) => {
  void next;
  console.error('Server Error:', err);
  fail(res, 500, 'Internal server error');
});

// Start server
export const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Create HTTP server and init Socket.IO
    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`WebSocket ready on same port`);
      console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Cannot start server:', error);
    process.exit(1);
  }
};

export { app };

if (NODE_ENV !== 'test') {
  startServer();
}
