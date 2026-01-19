import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { pool, testConnection } from './db/index.js';

// Import routes
import characterRoutes from './routes/character.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import authRoutes from './routes/auth.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import eventsRoutes from './routes/events.routes.js';
import shopRoutes from './routes/shop.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3002', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

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
  res.json({
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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Cannot start server:', error);
    process.exit(1);
  }
};

startServer();
