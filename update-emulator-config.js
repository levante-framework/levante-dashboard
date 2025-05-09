/**
 * Script to update all Firebase emulator port references in the project
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define old and new ports
const PORT_UPDATES = {
  '127.0.0.1:9099': '127.0.0.1:9199',
  '127.0.0.1:8080': '127.0.0.1:8180',
  '127.0.0.1:5002': '127.0.0.1:5102'
};

// Add the http:// variant for Auth emulator
Object.assign(PORT_UPDATES, {
  'http://127.0.0.1:9099': 'http://127.0.0.1:9199',
  'http://127.0.0.1:5002': 'http://127.0.0.1:5102'
});

/**
 * Find all files containing the old port values
 */
function findFiles() {
  console.log('Finding files with old emulator port references...');
  
  const searchPatterns = Object.keys(PORT_UPDATES).map(p => p.replace(/:/g, '\\:')).join('\\|');
  const command = `grep -r "${searchPatterns}" --include="*.ts" --include="*.js" --include="*.json" src/`;
  
  try {
    const result = execSync(command, { encoding: 'utf-8' });
    const fileMatches = result.split('\n')
      .filter(Boolean)
      .map(line => {
        const parts = line.split(':');
        return parts[0];
      })
      .filter(Boolean);
    
    // Get unique file paths
    const uniqueFiles = [...new Set(fileMatches)];
    console.log(`Found ${uniqueFiles.length} files with references to old port values`);
    return uniqueFiles;
  } catch (error) {
    console.error('Error finding files:', error.message);
    return [];
  }
}

/**
 * Update port values in a file
 */
function updateFile(filePath) {
  try {
    console.log(`Updating file: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let hasChanges = false;
    
    for (const [oldPort, newPort] of Object.entries(PORT_UPDATES)) {
      if (content.includes(oldPort)) {
        content = content.replace(new RegExp(oldPort.replace(/\./g, '\\.'), 'g'), newPort);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated ${filePath}`);
      return true;
    } else {
      console.log(`No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('Updating Firebase emulator port references');
  console.log('Old -> New port mappings:');
  for (const [oldPort, newPort] of Object.entries(PORT_UPDATES)) {
    if (!oldPort.startsWith('http://') || !Object.keys(PORT_UPDATES).some(k => 
        k !== oldPort && oldPort.includes(k))) {
      console.log(`  ${oldPort} -> ${newPort}`);
    }
  }
  
  // Find and update files
  const files = findFiles();
  
  if (files.length === 0) {
    console.log('No files found to update.');
    return;
  }
  
  let updatedCount = 0;
  
  for (const file of files) {
    if (updateFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\nUpdated ${updatedCount} files to use new emulator ports.`);
  console.log('Remember to restart your emulators and dev server!');
}

// Run the script
main(); 