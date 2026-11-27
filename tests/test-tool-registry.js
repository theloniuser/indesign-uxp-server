/**
 * Static check, no InDesign needed: every tool advertised to MCP clients must be
 * dispatched by the server, and every dispatched tool must be advertised.
 * Run: npm run test:static
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allToolDefinitions } from '../src/types/index.js';

const serverPath = fileURLToPath(new URL('../src/core/InDesignMCPServer.js', import.meta.url));
const server = readFileSync(serverPath, 'utf8');
const dispatched = new Set([...server.matchAll(/case '([a-z_]+)':/g)].map(m => m[1]));
const names = allToolDefinitions.map(t => t.name);
const advertised = new Set(names);

const problems = [];
const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
if (duplicates.length) problems.push(`Advertised more than once: ${[...new Set(duplicates)].join(', ')}`);
const notDispatched = [...advertised].filter(n => !dispatched.has(n));
if (notDispatched.length) problems.push(`Advertised but not dispatched (calls fail with "not implemented"): ${notDispatched.join(', ')}`);
const notAdvertised = [...dispatched].filter(n => !advertised.has(n));
if (notAdvertised.length) problems.push(`Dispatched but not advertised (clients cannot see them): ${notAdvertised.join(', ')}`);
for (const t of allToolDefinitions) {
    const props = Object.keys(t.inputSchema?.properties || {});
    const missing = (t.inputSchema?.required || []).filter(r => !props.includes(r));
    if (missing.length) problems.push(`${t.name}: required but not in properties: ${missing.join(', ')}`);
}

console.log(`Tool registry: ${advertised.size} advertised, ${dispatched.size} dispatched`);
if (problems.length) {
    for (const p of problems) console.log(`  ✗ ${p}`);
    console.log(`Results: 0 passed, ${problems.length} failed`);
    process.exit(1);
}
console.log('  ✓ advertised and dispatched tools match');
console.log('Results: 1 passed, 0 failed');
