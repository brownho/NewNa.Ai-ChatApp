#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Open database
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`
SQLite Database Query Tool
-------------------------
Usage: node db-query.js "<SQL query>"

Examples:
  node db-query.js "SELECT * FROM users"
  node db-query.js "SELECT COUNT(*) FROM traffic_logs"
  node db-query.js ".tables"
  node db-query.js ".schema traffic_logs"

Special commands:
  .tables     - Show all tables
  .schema     - Show all table schemas
  .schema <table> - Show specific table schema
`);
    process.exit(0);
}

const query = args.join(' ');

// Handle special commands
if (query === '.tables') {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Tables:');
            rows.forEach(row => console.log(`  ${row.name}`));
        }
        db.close();
    });
} else if (query.startsWith('.schema')) {
    const parts = query.split(' ');
    let schemaQuery;
    
    if (parts.length > 1) {
        // Show specific table schema
        schemaQuery = `SELECT sql FROM sqlite_master WHERE type='table' AND name='${parts[1]}'`;
    } else {
        // Show all schemas
        schemaQuery = "SELECT sql FROM sqlite_master WHERE type='table'";
    }
    
    db.all(schemaQuery, (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            rows.forEach(row => {
                if (row.sql) {
                    console.log(row.sql + ';\n');
                }
            });
        }
        db.close();
    });
} else {
    // Execute regular SQL query
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Error:', err);
        } else {
            if (rows.length > 0) {
                // Print results as table
                console.table(rows);
            } else {
                console.log('No results found.');
            }
        }
        db.close();
    });
}