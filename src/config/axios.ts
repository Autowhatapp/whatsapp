import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN!;
const API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/`;

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${FB_ACCESS_TOKEN}`
  }
});