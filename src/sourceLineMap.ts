export interface SourceSectionLike {
  type: string;
  position: {
    start: {
      line: number;
    };
  };
}

const NON_RENDERED_SECTION_TYPES = new Set(["yaml", "frontmatter"]);

export function pairBlocksWithSourceLines<T>(blocks: T[], sections: SourceSectionLike[]): Array<{ block: T; sourceLine: number }> {
  const sourceLines = sections
    .filter((section) => !NON_RENDERED_SECTION_TYPES.has(section.type))
    .map((section) => section.position.start.line);

  return blocks.slice(0, sourceLines.length).map((block, index) => ({
    block,
    sourceLine: sourceLines[index]
  }));
}

export function parseSourceLine(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const line = Number(value);
  return Number.isInteger(line) && line >= 0 ? line : null;
}

export function resolvePageLineMap(pageSourceLines: Array<number | null>, fallbackLines: number[]): number[] {
  let previousLine = 0;
  return pageSourceLines.map((sourceLine, index) => {
    const line = sourceLine ?? fallbackLines[index] ?? previousLine;
    previousLine = line;
    return line;
  });
}
