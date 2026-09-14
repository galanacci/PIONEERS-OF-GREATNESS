const BOILERPLATE = [
    /^watch uncut\b/i,
    /^follow\b/i,
    /^subscribe\b/i,
    /^special thanks\b/i,
    /^timestamps?\b/i,
    /^chapters?\b/i,
    /^instagram\b/i,
    /^tiktok\b/i,
    /^linkedin\b/i,
    /^music(?:ian)?\b/i,
    /^galanacci-verse\.com\b/i,
    /^https?:\/\//i,
    /^\d{1,2}:\d{2}\b/,
    /^day \d+ of my entrepreneurial journey\.?$/i
];

const cleanTitle = (title) => String(title || "")
    .replace(/#UNCUTBYGTC/gi, "")
    .replace(/\|\s*LOG[_\s-]*\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");

const cleanParagraph = (paragraph) => paragraph
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !BOILERPLATE.some((pattern) => pattern.test(line)))
    .join(" ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/^in this entry of #?uncut(?: by gtc|bygtc)?,?\s*/i, "")
    .replace(/^in this entry,?\s*/i, "")
    .replace(/^in this video,?\s*/i, "")
    .replace(/^I I\b/, "I")
    .replace(/^Discussing\b/i, "I discuss")
    .replace(/^Reflecting\b/i, "I reflect")
    .replace(/\s+/g, " ")
    .trim();

const shorten = (value, limit = 360) => {
    const sentences = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    let summary = "";

    for (const sentence of sentences.slice(0, 2)) {
        const candidate = `${summary} ${sentence.trim()}`.trim();
        if (summary && candidate.length > limit) break;
        summary = candidate;
        if (summary.length >= 190) break;
    }

    if (!summary) return "";
    if (summary.length <= limit) return /[.!?…🌱]$/.test(summary) ? summary : `${summary}.`;
    const clipped = summary.slice(0, limit - 1).replace(/\s+\S*$/, "").trim();
    return `${clipped}…`;
};

export function createDocumentarySummary(description, title) {
    const paragraphs = String(description || "")
        .split(/(?:\r?\n){2,}/)
        .map(cleanParagraph)
        .filter((paragraph) => paragraph && !BOILERPLATE.some((pattern) => pattern.test(paragraph)));

    const summary = shorten(paragraphs.slice(0, 3).join(" "));
    if (summary) return summary;

    const fallbackTitle = cleanTitle(title);
    return fallbackTitle ? `An early archive entry: ${fallbackTitle}.` : "An early entry from the UNCUT archive.";
}
