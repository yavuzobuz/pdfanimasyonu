'use server';
/**
 * @fileOverview A topic simplification AI agent.
 *
 * - simplifyTopic - A function that handles the topic simplification process.
 * - SimplifyTopicInput - The input type for the simplifyTopic function.
 * - SimplifyTopicOutput - The return type for the simplifyTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;

const SimplifyTopicOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene, in Turkish."),
      description: z.string().describe("A detailed description of what happens in this scene, in Turkish."),
      imageDataUri: z.string().describe("The generated image for the scene as a data URI.")
    })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic, complete with generated visuals.'),
});
export type SimplifyTopicOutput = z.infer<typeof SimplifyTopicOutputSchema>;

export async function simplifyTopic(input: SimplifyTopicInput): Promise<SimplifyTopicOutput> {
  return simplifyTopicFlow(input);
}

const SimplifyTopicPromptOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  animationScenario: z.array(
      z.object({
          scene: z.string().describe("A short, descriptive title for the scene in Turkish (e.g., '1. Sahne: Güneşin Enerjisi')."),
          description: z.string().describe("A detailed description of what happens in this scene, focusing on the visual elements, in Turkish. This description will be used to generate an animated SVG."),
      })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic. Generate between 3 and 5 scenes.'),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and animator specializing in simplifying complex topics for students. Your responses must be in Turkish. The overall tone must be serious, professional, and educational.

Your task is to take a topic and break it down into:
1.  A simplified summary suitable for students.
2.  A multi-scene animation storyboard to explain the topic visually.

The animation storyboard must be very clear, logically structured, and directly faithful to the core concepts of the topic. The goal is to create an educational tool, not entertainment. Each scene should build upon the previous one to tell a coherent and easy-to-follow story for a student.

For each scene, provide:
-   **scene:** A short, descriptive title (in Turkish).
-   **description:** A detailed, visually rich description of the scene (in Turkish). This description must be highly descriptive and provide clear instructions on the objects, characters, and actions in the scene, as it will be directly used by an AI to generate an animated SVG. The description must ensure the generated animation is professional, detailed, and literally represents the concepts. For example, if the concept is "izaleyi şüyu davası", the description should include visuals like a shared property (like land or a building), disagreeing co-owners, and a courthouse scene to represent the legal process. Avoid generic descriptions.

Topic: {{{topic}}}
`,
});

const simplifyTopicFlow = ai.defineFlow(
  {
    name: 'simplifyTopicFlow',
    inputSchema: SimplifyTopicInputSchema,
    outputSchema: SimplifyTopicOutputSchema,
  },
  async (input) => {
    const { output: promptOutput } = await simplifyTopicPrompt(input);

    if (!promptOutput) {
      throw new Error("Failed to generate topic summary and scenario.");
    }

    const scenarioWithAnimations = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
          try {
            const designerPrompt = `You are a world-class SVG animator and illustrator. Your task is to generate a high-quality, professional, and visually compelling animated SVG suitable for an educational context.

**Tone:** The style must be serious, informative, and professional. Avoid cartoonish, whimsical, or overly playful elements. The final output should look like a premium educational animation.

**Style requirements:**
- **Animation:** The animation must be a smooth, continuous, and seamless loop.
- **Self-Contained:** The SVG must be self-contained using CSS animations. No external scripts or assets are allowed.
- **Aesthetics:** Use a modern, clean, flat-iconography style. The illustration must be detailed and sophisticated.
- **NO Simple Shapes:** Avoid overly simplistic, abstract, or childish geometric shapes. The output must be a professional-grade illustration.
- **NO Raster Images:** Do not use \`<image>\` tags or embed any raster graphics (like PNGs or JPEGs) within the SVG. The entire illustration must be composed of vector elements (\`<path>\`, \`<circle>\`, \`<rect>\`, etc.).
- **Responsive:** The SVG must be responsive and scale correctly by using a 'viewBox' attribute.
- **Background:** The background must be transparent.
- **Colors:** Use a harmonious and professional color palette. You have creative freedom.

**Content Requirements:**
- **Literal Representation:** The generated SVG must accurately and literally represent the objects, characters, and concepts described in the scene prompt. For example, if the prompt mentions a 'person', the SVG must clearly depict a human figure. If it mentions a 'house', it must look like a house. If it mentions a 'courthouse', it must resemble a courthouse building. The drawing must be a faithful visual translation of the text.

**Output format:**
- Only output the raw SVG code.
- Start with '<svg ...>' and end with '</svg>'.
- Do NOT include any other text, explanations, or markdown code fences like \`\`\`.

**Task:**
Create an animated SVG for the following scene:
${scene.description}`;

            const svgGenerationResponse = await ai.generate({ prompt: designerPrompt });
            let svgCode = svgGenerationResponse.text;

            const svgMatch = svgCode.match(/<svg[\s\S]*?<\/svg>/s);
            if (svgMatch) {
                svgCode = svgMatch[0];
            } else {
                svgCode = `<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Animasyon oluşturulamadı.</text></svg>`;
            }
    
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgCode).toString('base64');
    
            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: svgDataUri,
            };
          } catch (error) {
            console.error(`Error generating animation for scene "${scene.scene}":`, error);
            const fallbackSvg = `<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" fill="hsl(var(--card-foreground))"><rect width="100%" height="100%" fill="hsl(var(--muted))" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20px">Animasyon hatası.</text></svg>`;
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(fallbackSvg).toString('base64');
            return {
              scene: scene.scene,
              description: "Bu sahne için animasyon oluşturulurken bir hata oluştu.",
              imageDataUri: svgDataUri,
            };
          }
        })
    );

    return {
      summary: promptOutput.summary,
      animationScenario: scenarioWithAnimations,
    };
  }
);
