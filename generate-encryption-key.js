#!/usr/bin/env node

/**
 * Generate TOKEN_ENCRYPTION_KEY for AES-256-GCM
 * 
 * Usage:
 *   node generate-encryption-key.js
 * 
 * Then copy the output and set it as TOKEN_ENCRYPTION_KEY in:
 * - Render environment variables (CRITICAL!)
 * - Local .env file (for development only)
 */

const { generateEncryptionKey } = require('./src/api/services/token-encryption');

const key = generateEncryptionKey();

console.log('\n' + '='.repeat(70));
console.log('🔐 TOKEN ENCRYPTION KEY GENERATED');
console.log('='.repeat(70));
console.log('\n✅ New encryption key (256-bit AES):\n');
console.log(key);
console.log('\n📋 Instructions:\n');
console.log('1. Go to Render Dashboard → agent-saas service');
console.log('2. Click "Environment"');
console.log('3. Add new variable:');
console.log('   KEY: TOKEN_ENCRYPTION_KEY');
console.log('   VALUE: ' + key);
console.log('4. Click "Save" → Service will redeploy\n');
console.log('⚠️  IMPORTANT:\n');
console.log('   • Save this key in a SECURE location');
console.log('   • Do NOT commit it to git');
console.log('   • If lost, you cannot decrypt existing tokens');
console.log('   • Changing the key will invalidate all existing tokens\n');
console.log('='.repeat(70) + '\n');
