import { promises as fsPromises, existsSync, mkdirSync, readdir, copyFile } from 'fs';
import * as path from 'path';

// Define source and destination paths
const srcDir: string = path.join(__dirname, '..', '..', 'src', 'templates');
const destDir: string = path.join(__dirname, '..', 'templates');

if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
}

readdir(srcDir, (err: NodeJS.ErrnoException | null, files: string[]) => {
    if (err) {
        console.error(`Failed to read source directory: ${err.message}`);
        process.exit(1);
    }

    files.forEach((file: string) => {
        if (file.endsWith('.hbs')) {
            const srcFile: string = path.join(srcDir, file);
            const destFile: string = path.join(destDir, file);

            copyFile(srcFile, destFile, (err: NodeJS.ErrnoException | null) => {
                if (err) {
                    console.error(`Failed to copy ${file}: ${err.message}`);
                } else {
                    console.log(`${file} copied successfully.`);
                }
            });
        }
    });
});
