const OBSIDIAN_EMBED = /!\[\[([^\]\n]+)\]\]/g;
const IMAGE_FILE_EXTENSION = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i;
const MARKDOWN_INLINE_IMAGE = /!\[[^\]\n]*\]\([^\n)]*\)/g;
const MARKDOWN_REFERENCE_IMAGE = /!\[[^\]\n]*\]\[[^\]\n]*\]/g;

function removeImagesFromText(text: string): string {
  return text
    .replace(OBSIDIAN_EMBED, (embed, value: string) => {
      const target = value.split("|", 1)[0].split("#", 1)[0].trim();
      return IMAGE_FILE_EXTENSION.test(target) ? "" : embed;
    })
    .replace(MARKDOWN_INLINE_IMAGE, "")
    .replace(MARKDOWN_REFERENCE_IMAGE, "");
}

function removeImagesOutsideInlineCode(line: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < line.length) {
    const opening = line.slice(cursor).match(/`+/);
    if (!opening || opening.index === undefined) {
      return result + removeImagesFromText(line.slice(cursor));
    }

    const openingIndex = cursor + opening.index;
    result += removeImagesFromText(line.slice(cursor, openingIndex));

    const delimiter = opening[0];
    const closingIndex = line.indexOf(delimiter, openingIndex + delimiter.length);
    if (closingIndex === -1) return result + line.slice(openingIndex);

    const codeEnd = closingIndex + delimiter.length;
    result += line.slice(openingIndex, codeEnd);
    cursor = codeEnd;
  }

  return result;
}

export function removeMarkdownImages(markdown: string): string {
  let fence: { character: string; length: number } | null = null;
  let changed = false;
  const lines = markdown.split("\n");
  const keptLines: Array<{ text: string; originalIndex: number }> = [];

  lines.forEach((line, originalIndex) => {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      keptLines.push({ text: line, originalIndex });
      if (new RegExp(`^ {0,3}${fence.character}{${fence.length},}\\s*$`).test(line)) fence = null;
      return;
    }
    if (fenceMatch) {
      fence = { character: fenceMatch[1][0], length: fenceMatch[1].length };
      keptLines.push({ text: line, originalIndex });
      return;
    }

    const withoutImages = removeImagesOutsideInlineCode(line);
    if (withoutImages !== line) changed = true;
    const normalized = withoutImages === line
      ? line
      : withoutImages.replace(/[ \t]{2,}/g, " ").trimEnd();

    if (normalized.trim() || withoutImages === line) {
      keptLines.push({ text: normalized, originalIndex });
    }
  });

  if (!changed) return markdown;

  const normalizedLines = keptLines
    .filter((line, index) => {
      const previous = keptLines[index - 1];
      return line.text.trim()
        || !previous
        || previous.text.trim()
        || line.originalIndex === previous.originalIndex + 1;
    });

  if (normalizedLines[0]?.text.trim() === "" && normalizedLines[0].originalIndex > 0) {
    normalizedLines.shift();
  }
  const lastLine = normalizedLines[normalizedLines.length - 1];
  if (lastLine?.text.trim() === "" && lastLine.originalIndex < lines.length - 1) {
    normalizedLines.pop();
  }

  return normalizedLines.map(line => line.text).join("\n");
}
