import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, testConnection } from './db/index.js';

// Import routes
import characterRoutes from './routes/character.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Tu Tiên Backend đang hoạt động!'
  });
});

// API Routes
app.use('/api/characters', characterRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/inventory', inventoryRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint không tồn tại' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Tu Tiên Backend sẵn sàng!\n`);
    });
  } catch (error) {
    console.error('Không thể khởi động server:', error);
    process.exit(1);
  }
};

startServer();
