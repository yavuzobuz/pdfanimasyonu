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

const SvgValidationSchema = z.object({
    approved: z.boolean().describe("True if the SVG is high-quality and accurately represents the scene. False otherwise."),
    feedback: z.string().describe("If not approved, provide concise, actionable feedback for the designer to improve the SVG. Explain WHY it was rejected based on the provided criteria."),
});

const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;

const SimplifyTopicOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students, in Turkish.'),
  animationScenario: z.array(
    z.object({
      scene: z.string().describe("A short title for the animation scene."),
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
          scene: z.string().describe("A short, descriptive title for the scene (e.g., 'Scene 1: The Sun's Energy')."),
          description: z.string().describe("A detailed description of what happens in this scene, focusing on the visual elements, in Turkish."),
          animatedSvgPrompt: z.string().describe("A highly detailed and descriptive prompt in English for an AI that generates professional, visually rich animated SVGs. The prompt should describe a scene that is both educational and aesthetically pleasing, avoiding over-simplification. Focus on clear actions and detailed objects.")
      })
  ).describe('A scene-by-scene breakdown for an animation that explains the topic. Generate between 3 and 5 scenes.'),
});

const simplifyTopicPrompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicPromptOutputSchema},
  prompt: `You are an expert educator and animator specializing in simplifying complex topics for students. Your responses for summary and description must be in Turkish.

Your task is to take a topic and break it down into a simplified summary and a multi-scene animation script. For each scene in the animation, you will provide a title (can be in English), a description of the action in Turkish, and a specific, detailed prompt for an AI model to generate a corresponding **animated SVG** (this prompt must be in English).

The visual style for the animated SVGs should be a professional, visually rich, and detailed educational illustration with a smooth, looping animation. It should be engaging and clear, but not childish or overly simplistic. The drawing must accurately and literally represent the objects and concepts in the scene description.

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

    const MAX_RETRIES = 2;

    const scenarioWithAnimations = await Promise.all(
        promptOutput.animationScenario.map(async (scene) => {
          try {
            let approved = false;
            let svgCode = '';
            let attempts = 0;
            let feedbackHistory = '';

            while (!approved && attempts < MAX_RETRIES) {
                attempts++;
                
                let designerPrompt = `You are a world-class SVG animator and illustrator. Your task is to generate a high-quality, professional, and visually compelling animated SVG.

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
${scene.animatedSvgPrompt}`;

                if (feedbackHistory) {
                    designerPrompt += `\n\n**IMPORTANT:** Your previous attempt was rejected. You MUST incorporate the following feedback from the art director to improve your design:\n${feedbackHistory}`;
                }

                const svgGenerationResponse = await ai.generate({ prompt: designerPrompt });
                
                let generatedSvg = svgGenerationResponse.text;
                const svgMatch = generatedSvg.match(/<svg[\s\S]*?<\/svg>/s);
                if (!svgMatch) {
                    feedbackHistory += `\n- Attempt ${attempts}: Your output was not valid SVG code. Ensure the output is only raw SVG starting with <svg> and ending with </svg>.`;
                    if (attempts >= MAX_RETRIES) {
                      svgCode = "<!-- SVG generation failed after multiple attempts -->";
                    }
                    continue;
                }
                generatedSvg = svgMatch[0];

                const patronPrompt = `You are a critical art director (Patron). Your role is to review an animated SVG created by a designer based on a scene description. Your standards are exceptionally high.

**Review Criteria:**
1.  **Relevance & Literalism:** Does the animation accurately and literally represent the scene description? If the description says "a person," does it clearly look like a human figure, not an abstract representation?
2.  **Quality & Detail:** Is the illustration style professional, detailed, and visually rich? It MUST NOT be made of simple, primitive, or childish geometric shapes (e.g., a stick figure for a person). It should be a modern, high-quality illustration.
3.  **Technical Validity:** Is it a valid, self-contained, animated SVG that does not contain any raster images (<image> tags)?

**Scene Description:**
\`\`\`
${scene.animatedSvgPrompt}
\`\`\`

**Designer's Submitted SVG Code:**
\`\`\`xml
${generatedSvg}
\`\`\`

**Your Task:**
Based on the strict criteria above, decide if you approve this SVG. Provide your response in the requested JSON format. If you do not approve, you MUST provide specific, actionable feedback for the designer to address in their next attempt. Be firm and clear.
`;
                
                const { output: validationResult } = await ai.generate({
                    prompt: patronPrompt,
                    output: { schema: SvgValidationSchema },
                });

                if (validationResult?.approved) {
                    approved = true;
                    svgCode = generatedSvg;
                } else {
                    const feedback = validationResult?.feedback || "The SVG is not satisfactory. Improve quality and relevance based on the initial prompt.";
                    feedbackHistory += `\n- Attempt ${attempts}: ${feedback}`;
                    svgCode = generatedSvg; // Keep the last attempt even if it fails
                }
            }
            
            if (!svgCode) {
              svgCode = "<!-- SVG generation failed. -->";
            }
    
            const svgDataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgCode).toString('base64');
    
            return {
                scene: scene.scene,
                description: scene.description,
                imageDataUri: svgDataUri,
            };
          } catch (error) {
            console.error(`Error generating animation for scene "${scene.scene}":`, error);
            const fallbackSvg = `<!-- Animation generation failed for this scene. -->`;
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
