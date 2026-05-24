const mysql = require('mysql2');

const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'danya08082006',
    database: 'ElectroTool_IS',
    connectionLimit: 10
});

module.exports = pool.promise();