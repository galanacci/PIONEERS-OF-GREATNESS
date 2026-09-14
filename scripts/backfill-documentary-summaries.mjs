import { readFile, writeFile } from "node:fs/promises";
import { createDocumentarySummary } from "./documentary-summary.mjs";
import { validateDocumentary } from "./validate-content.mjs";

const archivePath = "data/documentary.json";
const archive = JSON.parse(await readFile(archivePath, "utf8"));

archive.episodes = archive.episodes.map((episode) => ({
    ...episode,
    summary: createDocumentarySummary(episode.description, episode.title)
}));

validateDocumentary(archive);
await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`, "utf8");

console.log(`Updated ${archive.episodes.length} Video Journal summaries.`);
