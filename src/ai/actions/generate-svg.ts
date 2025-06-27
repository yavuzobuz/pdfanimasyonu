'use server';
/**
 * @fileOverview A server action to generate an SVG from a text description.
 */
import { ai } from '@/ai/genkit';

// This is the function that will be called from the client for each scene.
export async function generateSvg(description: string): Promise<string> {
  try {
    const designerPrompt = `You are an expert SVG illustrator who creates clear, professional, and visually appealing educational graphics. Your primary goal is to create an SVG that makes a concept easy to understand.

**Critical Rule: Objects must be recognizable.** A person must look like a person, not a stick figure. A car must look like a car, not a box with circles. An office building should be detailed, not a simple rectangle. Your drawings must be literal and tangible. **AVOID abstract shapes, symbolic representations, and overly simplistic icons.** The user wants visuals that resemble real-world objects.

**Style Guide:**
*   **Modern & Clean:** Use a flat design aesthetic.
*   **Color:** Use a professional and harmonious color palette. Use \`hsl(var(--...))\` CSS variables for colors, like \`fill="hsl(var(--primary))"\` or \`stroke="hsl(var(--foreground))"\`. Use colors to add clarity and emphasis.
*   **Background:** The SVG background must be transparent. Do not add a background color to the root svg element.

**Example Task:**
*   **Scene Description:** "A manager gives a bonus to an employee for their hard work."
*   **Your Output (SVG):** An SVG showing a person in a suit (the manager) smiling and handing a check or a bag with a money symbol to another person (the employee) who looks happy. The setting could be a simple office background. An arrow could point from the manager to the employee, labeled "Bonus".

**Technical Requirements:**
*   **Output SVG Only:** Your entire response must be ONLY the raw SVG code. Start with \`<svg ...>\` and end with \`</svg>\`. Do not include explanations, notes, or markdown formatting like \`\`\`svg.
*   **VALIDATION:** The SVG MUST contain visible, tangible shape elements like \`<path>\`, \`<rect>\`, or \`<circle>\`. An empty SVG or one with only text is an invalid failure.
*   **Valid & Self-Contained:** The SVG must be well-formed XML with no external dependencies.
*   **Responsive:** The SVG must have a \`viewBox\` attribute.

**Now, create an SVG for the following scene:**
${description}`;

    const svgGenerationResponse = await ai.generate({ prompt: designerPrompt, model: 'googleai/gemini-1.5-flash-latest' });
    const svgCode = svgGenerationResponse.text;
    
    if (typeof svgCode !== 'string') {
      throw new Error('SVG generation returned a non-text response.');
    }

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    if (!svgMatch) {
      throw new Error("SVG generation failed: No SVG tag found in response.");
    }

    const extractedSvg = svgMatch[0];
    const hasDrawingElements = /<path|<rect|<circle|<ellipse|<polygon|<polyline|<line/i.test(extractedSvg);
    const hasThemeColors = extractedSvg.includes('hsl(var');

    if (hasDrawingElements && hasThemeColors) {
        return extractedSvg;
    }
    
    throw new Error("SVG generation failed: Validation checks failed.");

  } catch (error) {
    console.error(`SVG generation failed for description "${description}":`, error);
    // Return a fallback SVG
    return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Görselleştirme başarısız.</text></svg>`;
  }
};
