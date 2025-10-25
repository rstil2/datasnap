#!/usr/bin/env node

/**
 * Clean debug code for production build
 * Removes console.log, console.debug, and TODO comments from source files
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const sourceDir = './src';
const excludeDirs = ['__tests__', '__test__', 'tests', 'test', 'node_modules', 'dist'];
const includeExts = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessFile(filePath) {
  const ext = extname(filePath);
  if (!includeExts.includes(ext)) return false;
  
  // Skip test files and specific files
  if (filePath.includes('.test.') || filePath.includes('.spec.')) return false;
  if (filePath.includes('ErrorBoundary.tsx')) return false; // Keep error logging
  if (filePath.includes('PerformanceMonitor.ts')) return false; // Keep performance logging
  
  return true;
}

function cleanDebugCode(content, filePath) {
  let cleaned = content;
  let changes = 0;

  // Remove console.log statements (but keep console.error and console.warn in error handling contexts)
  const consoleLogRegex = /^\s*console\.log\([^;]*\);?\s*$/gm;
  cleaned = cleaned.replace(consoleLogRegex, () => {
    changes++;
    return '';
  });
  
  // Remove console.debug statements
  const consoleDebugRegex = /^\s*console\.debug\([^;]*\);?\s*$/gm;
  cleaned = cleaned.replace(consoleDebugRegex, () => {
    changes++;
    return '';
  });
  
  // Remove debugger statements
  const debuggerRegex = /^\s*debugger;?\s*$/gm;
  cleaned = cleaned.replace(debuggerRegex, () => {
    changes++;
    return '';
  });
  
  // Clean up TODO comments (make them less verbose for production)
  const todoRegex = /\/\/ TODO:?\s*([^\r\n]*)/g;
  cleaned = cleaned.replace(todoRegex, (match, content) => {
    if (content.trim()) {
      changes++;
      return `// TODO: ${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`;
    }
    return '';
  });
  
  // Remove empty lines created by removing console statements (max 2 consecutive empty lines)
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return { cleaned, changes };
}

function processDirectory(dir) {
  let totalChanges = 0;
  let filesProcessed = 0;
  
  function processDir(currentDir) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = join(currentDir, item);
      const stat = statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          processDir(itemPath);
        }
      } else if (shouldProcessFile(itemPath)) {
        const content = readFileSync(itemPath, 'utf8');
        const { cleaned, changes } = cleanDebugCode(content, itemPath);
        
        if (changes > 0) {
          writeFileSync(itemPath, cleaned);
          console.log(`✓ Cleaned ${itemPath.replace(process.cwd() + '/', '')} (${changes} changes)`);
          totalChanges += changes;
        }
        filesProcessed++;
      }
    }
  }
  
  processDir(dir);
  return { totalChanges, filesProcessed };
}

console.log('🧹 Cleaning debug code for production...\n');

try {
  const { totalChanges, filesProcessed } = processDirectory(sourceDir);
  
  console.log(`\n✅ Production cleanup complete!`);
  console.log(`📁 Files processed: ${filesProcessed}`);
  console.log(`🔧 Changes made: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n📝 Changes included:');
    console.log('   - Removed console.log statements');
    console.log('   - Removed console.debug statements');
    console.log('   - Removed debugger statements');
    console.log('   - Shortened TODO comments');
    console.log('   - Cleaned up empty lines');
  }
  
  console.log('\n🎉 Code is now production-ready!');
  
} catch (error) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
}