/**
 * Jest Setup File
 * Runs before all tests
 */

// Load environment variables from .env
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment variables
process.env.NODE_ENV = 'test';

// Extend Jest timeout for database operations
jest.setTimeout(30000);
