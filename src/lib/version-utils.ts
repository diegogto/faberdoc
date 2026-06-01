/**
 * Helper to generate alphabetical letter label for a 0-based index (0 -> A, 1 -> B, etc.)
 */
export function getLetterForIndex(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Helper to get a 0-based index from a string letter (A -> 0, B -> 1, AA -> 26, etc.)
 */
export function getIndexForLetter(letter: string): number {
  if (!letter) return 0;
  let index = 0;
  const upper = letter.trim().toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const charCode = upper.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      index = index * 26 + (charCode - 64);
    }
  }
  return Math.max(0, index - 1);
}

/**
 * Formats internal iterations (elaboración interna) simply as sequential numbers "1", "2", "3"...
 */
export function formatIterationLabel(iterationIndex: number): string {
  return String(iterationIndex + 1);
}

/**
 * Formats official external emission version label based on Clásico (MIXED) or Moderno (SEPARATE_EMISSION).
 * 
 * - Clásico (MIXED): uses letters (A, B, C...) for "info" and numbers (00, 01...) for "approved".
 * - Moderno (SEPARATE_EMISSION): uses sequential numbers (00, 01...) for all emissions.
 */
export function formatVersionLabel(
  versionIndex: number,
  logic: string,
  type: "info" | "approved",
  formatConfig: any
): string {
  const isClassic = logic === "MIXED" || logic === "classic";

  if (isClassic) {
    if (type === "info") {
      const startLetter = formatConfig?.classic_config?.info_start_letter || "A";
      const startIndex = getIndexForLetter(startLetter);
      return getLetterForIndex(versionIndex + startIndex);
    } else {
      const startNumber = Number(formatConfig?.classic_config?.approved_start_number ?? 0);
      const padding = Number(formatConfig?.classic_config?.approved_padding ?? 2);
      const numericValue = versionIndex + startNumber;
      return String(numericValue).padStart(padding, "0");
    }
  } else {
    // Moderno (SEPARATE_EMISSION)
    const startNumber = Number(formatConfig?.modern_config?.start_number ?? 0);
    const padding = Number(formatConfig?.modern_config?.padding ?? 2);
    const numericValue = versionIndex + startNumber;
    return String(numericValue).padStart(padding, "0");
  }
}

/**
 * Combines document code, version label, and emission code based on a configured pattern.
 * Pattern example: "{CODE} - Rev {REV}" or "{CODE}_{EMISSION}"
 */
export function formatEmittedCode(
  documentCode: string,
  versionLabel: string,
  emissionCode: string | null,
  formatConfig: any
): string {
  const pattern = formatConfig?.emission_pattern || "{CODE} - Rev {REV}";
  
  let result = pattern
    .replace("{CODE}", documentCode)
    .replace("{REV}", versionLabel)
    .replace("{EMISSION}", emissionCode || "");

  return result.trim();
}
