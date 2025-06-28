'use server';
/**
 * @fileOverview A server action to generate diagrams/flowcharts/mindmaps from descriptions.
 */
import { ai } from '@/ai/genkit';

// Function specifically for generating diagrams/flowcharts/mindmaps
export async function generateDiagram(description: string): Promise<string> {
  try {
    const diagramPrompt = `You are a professional SVG diagram creator. You receive detailed instructions for educational diagrams and create precise SVG code based on those instructions.

**Critical Rules:**
- Follow the given instructions EXACTLY as specified
- Use the exact text labels mentioned in the description
- Place elements in the positions described
- Use geometric shapes (rectangles, circles, diamonds, lines, arrows)
- Include all elements and connections mentioned

**SVG Technical Requirements:**
*   **Colors:** Use theme CSS variables: \`hsl(var(--primary))\`, \`hsl(var(--secondary))\`, \`hsl(var(--accent))\`, \`hsl(var(--muted))\`
*   **Text:** Use readable font sizes (12-16px), Turkish text as specified
*   **Shapes:** \`<rect>\` for boxes, \`<circle>\` for circles, \`<path>\` for arrows, \`<line>\` for connections
*   **Layout:** Position elements with proper spacing, use viewBox="0 0 800 600" for standard size
*   **Background:** Transparent (no background color on root SVG)

**Arrow Drawing:**
- Use \`<path>\` with \`<marker>\` for arrowheads
- Example: \`<path d="M x1,y1 L x2,y2" stroke="color" marker-end="url(#arrowhead)"/>\`

**Text Labels:**
- Center text in shapes using \`text-anchor="middle"\` and \`dominant-baseline="central"\`
- Use appropriate font-size based on shape size

**Output Requirements:**
*   Return ONLY SVG code, no explanations
*   Valid XML structure with viewBox
*   All text in Turkish as specified in instructions

**Create SVG diagram following these exact instructions:**
${description}`;

    const diagramResponse = await ai.generate({ prompt: diagramPrompt, model: 'googleai/gemini-2.5-flash' });
    const svgCode = diagramResponse.text;
    
    if (typeof svgCode !== 'string') {
      throw new Error('Diagram generation returned a non-text response.');
    }

    const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
    if (!svgMatch) {
      throw new Error("Diagram generation failed: No SVG tag found in response.");
    }

    const extractedSvg = svgMatch[0];
    const hasDrawingElements = /<path|<rect|<circle|<ellipse|<polygon|<polyline|<line/i.test(extractedSvg);
    const hasThemeColors = extractedSvg.includes('hsl(var');

    if (hasDrawingElements && hasThemeColors) {
        return extractedSvg;
    }
    
    throw new Error("Diagram generation failed: Validation checks failed.");

  } catch (error) {
    console.error(`Diagram generation failed for description "${description}":`, error);
    // Return a fallback diagram SVG
    return `<svg width="500" height="300" viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Diyagram oluşturulamadı.</text></svg>`;
  }
}