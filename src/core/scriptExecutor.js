/**
 * Core script execution functionality
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ScriptExecutor {
    /**
     * Execute AppleScript command
     * @param {string} script - The AppleScript to execute
     * @returns {string} The result of the AppleScript execution
     */
    static async executeAppleScript(script) {
        try {
            const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
            return result.trim();
        } catch (error) {
            throw new Error(`AppleScript execution failed: ${error.message}`);
        }
    }

    /**
     * Execute InDesign script via AppleScript
     * @param {string} script - The ExtendScript to execute
     * @returns {string} The result of the script execution
     */
    static async executeInDesignScript(script) {
        try {
            // Write script to temporary file
            const tempScriptPath = path.join(__dirname, '../../temp_script.jsx');
            fs.writeFileSync(tempScriptPath, script);

            // Execute via AppleScript with persistent session
            const appleScript = `
        tell application "Adobe InDesign 2026"
          activate
          do script POSIX file "${tempScriptPath}" language javascript
        end tell
      `;

            const result = await this.executeAppleScript(appleScript);

            // Clean up temporary file
            try {
                fs.unlinkSync(tempScriptPath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }

            return result;
        } catch (error) {
            throw new Error(`Error executing tool: ${error.message}`);
        }
    }
} 