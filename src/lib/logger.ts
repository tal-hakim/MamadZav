import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function formatMessage(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] ${level}: ${message}${dataStr}\n`;
}

export const logger = {
  info: (message: string, data?: any) => {
    const logMessage = formatMessage('INFO', message, data);
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(message, data || '');
  },
  
  error: (message: string, error?: any) => {
    const logMessage = formatMessage('ERROR', message, error);
    fs.appendFileSync(LOG_FILE, logMessage);
    console.error(message, error || '');
  },
  
  debug: (message: string, data?: any) => {
    const logMessage = formatMessage('DEBUG', message, data);
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(message, data || '');
  }
}; 