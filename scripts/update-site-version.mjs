import { readFileSync, writeFileSync } from 'node:fs';
const path = 'data/site-version.json';
const state = JSON.parse(readFileSync(path, 'utf8'));
const sha = process.env.PUSH_SHA;
if (!sha || !/^[a-f0-9]{40}$/.test(sha)) throw new Error('A valid push SHA is required');
if (!state.processedPushes.includes(sha)) {
    // Increment once for every new release push; reruns are deduplicated by SHA.
    state.version += 1;
    state.processedPushes.push(sha);
    const html = readFileSync('index.html', 'utf8');
    const label = `VERSION_${String(state.version).padStart(3, '0')}`;
    if (!/<p class="menu-version">VERSION_\d+<\/p>/.test(html)) throw new Error('Version label missing');
    writeFileSync('index.html', html.replace(/(<p class="menu-version">)VERSION_\d+(<\/p>)/, `$1${label}$2`));
    writeFileSync(path, JSON.stringify(state, null, 2) + '\n');
}
