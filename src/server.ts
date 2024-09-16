import express from 'express';
import * as dotenv from 'dotenv';
import flowRoutes from './routes/flowRoutes';
import messageRoutes from './routes/messageRoutes';
const cors = require('cors');
// Load environment variables
dotenv.config();

const app = express();
app.use(cors({ origin: 'http://127.0.0.1:5500' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use routers
app.use('/api/flows', flowRoutes);
app.use('/api', messageRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;