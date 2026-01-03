// MySQL connection setup for ShopkeeperMarketplace backend
const mysql = require('mysql2');

// Use DATABASE_URL if provided by Railway, otherwise use individual env vars
let pool;
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL connection');
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  console.log('Database Config:', {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'shopkeeper_marketplace',
    passwordSet: !!process.env.DB_PASSWORD
  });
  
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Aakash@123',
    database: process.env.DB_NAME || 'shopkeeper_marketplace',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

console.log('Server starting...');

module.exports = pool.promise();
