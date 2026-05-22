import { appendFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE = join(__dirname, '../../../../.brain/history/decision_log.md');
const ARCH_FILE = join(__dirname, '../../../../.brain/knowledge/architecture.md');

const message = process.argv[2];

if (!message) {
    console.error('Usage: node update_brain.js "Decision message"');
    process.exit(1);
}

const date = new Date().toISOString().split('T')[0];
const entry = `\n## ${date}\n- ${message}\n`;

try {
    const historyDir = dirname(LOG_FILE);
    if (!existsSync(historyDir)) {
        mkdirSync(historyDir, { recursive: true });
    }

    if (!existsSync(LOG_FILE)) {
        writeFileSync(LOG_FILE, '# Decision Log\n\nRegistro cronológico de decisiones técnicas y cambios arquitectónicos.\n', 'utf-8');
    }
    appendFileSync(LOG_FILE, entry, 'utf-8');
    console.log(`✅ Brain updated: ${message}`);
} catch (err) {
    console.error('❌ Failed to update brain:', err);
    process.exit(1);
}
