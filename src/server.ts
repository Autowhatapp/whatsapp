import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import flowRoutes from './routes/flowRoutes';
import messageRoutes from './routes/messageRoutes';
import orchestrateFlowRouter from './routes/orchestrateFlowRouter';
import mongoRoutes from './routes/mongoRoutes';

dotenv.config();

const app = express();

app.use(cors({ origin: 'http://127.0.0.1:5500' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/flows', flowRoutes);
app.use('/api', messageRoutes);
app.use('/api', orchestrateFlowRouter);
app.use('/api', mongoRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.SERVER_FLOW_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;