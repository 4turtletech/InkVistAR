const fs = require('fs');
const path = "C:\\Users\\Ella\\AppData\\Local\\Android\\Sdk\\ndk\\27.0.12077973";

try {
  if (fs.existsSync(path)) {
    console.log('Found corrupted NDK directory: ' + path);
    fs.rmSync(path, { recursive: true, force: true });
    console.log('Successfully deleted the corrupted NDK directory.');
  } else {
    console.log('Directory not found. It might have already been deleted.');
  }
} catch (error) {
  console.error('Failed to delete directory:', error);
}
