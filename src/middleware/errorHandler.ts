import { Response } from 'express';

export const errorHandler = (error: any, res: Response) => {
  console.error('Error:', error.response?.data || error.message);
  res.status(error.response?.status || 500).json({
    error: error.response?.data?.error?.message || error.message,
    details: error.response?.data
  });
};