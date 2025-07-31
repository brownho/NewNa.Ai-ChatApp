#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');
const path = require('path');

// Open database
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'sqlite> '
});

console.log('SQLite Interactive Console');
console.log('Type .help for commands, .exit to quit\n');

rl.prompt();

rl.on('line', (line) => {
    const query = line.trim();
    
    if (query === '.exit' || query === '.quit') {
        console.log('Goodbye!');
        db.close();
        process.exit(0);
    } else if (query === '.help') {
        console.log(`
Commands:
  .tables         Show all tables
  .schema [table] Show table schema
  .count [table]  Count rows in table
  .exit/.quit     Exit console
  
Or enter any SQL query
`);
        rl.prompt();
    } else if (query === '.tables') {
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                console.log('Tables:');
                rows.forEach(row => console.log(`  ${row.name}`));
            }
            rl.prompt();
        });
    } else if (query.startsWith('.schema')) {
        const parts = query.split(' ');
        let schemaQuery;
        
        if (parts.length > 1) {
            schemaQuery = `SELECT sql FROM sqlite_master WHERE type='table' AND name='${parts[1]}'`;
        } else {
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
            rl.prompt();
        });
    } else if (query.startsWith('.count')) {
        const parts = query.split(' ');
        if (parts.length > 1) {
            db.get(`SELECT COUNT(*) as count FROM ${parts[1]}`, (err, row) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log(`Count: ${row.count}`);
                }
                rl.prompt();
            });
        } else {
            console.log('Usage: .count <table_name>');
            rl.prompt();
        }
    } else if (query) {
        // Execute SQL query
        db.all(query, (err, rows) => {
            if (err) {
                console.error('Error:', err);
            } else {
                if (rows.length > 0) {
                    console.table(rows);
                } else {
                    console.log('Query executed successfully.');
                }
            }
            rl.prompt();
        });
    } else {
        rl.prompt();
    }
});

rl.on('close', () => {
    console.log('\nGoodbye!');
    db.close();
    process.exit(0);
});