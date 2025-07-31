const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a random token
const token = crypto.randomBytes(32).toString('hex');

// Create a symlink in public directory with the token
const dbPath = path.join(__dirname, 'chat.db');
const linkPath = path.join(__dirname, 'public', `db-${token}.db`);

try {
    // Create a hard link (not symlink for security)
    fs.linkSync(dbPath, linkPath);
    
    console.log('\n✅ Database download link created!');
    console.log('\n📥 Download URL:');
    console.log(`https://localhost:3000/db-${token}.db`);
    console.log('\n⚠️  This link will expire in 5 minutes for security.');
    
    // Delete the link after 5 minutes
    setTimeout(() => {
        try {
            fs.unlinkSync(linkPath);
            console.log('\n🔒 Download link expired and removed.');
        } catch (err) {
            // Ignore error if already deleted
        }
    }, 5 * 60 * 1000);
    
} catch (error) {
    console.error('Error creating download link:', error);
}