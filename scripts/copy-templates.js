const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "../src/templates");
const destDir = path.join(__dirname, "../dist/templates");

// Ensure dist/templates exists
fs.mkdirSync(destDir, { recursive: true });

// Copy all .hbs templates
fs.readdirSync(srcDir).forEach(file => {
  if (file.endsWith(".hbs")) {
    fs.copyFileSync(
      path.join(srcDir, file),
      path.join(destDir, file)
    );
    console.log(`✅ Copied template: ${file}`);
  }
});
