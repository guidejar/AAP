import { generateText } from '../api/text-generator.js'; // Using text-generator for analysis as well
import { analysisSystemPrompt } from '../core/constants/prompts.js';
import { parseJsonWithFallback } from '../utils/json-parser.js';

export class SceneAnalyzer {
    constructor(store) {
        this.store = store;
    }

    async analyzeScene(storyText, dadSnapshot) {
        const context = [{ role: 'user', parts: [{ text: `Story: ${storyText}\nDAD Snapshot: ${JSON.stringify(dadSnapshot)}` }] }];

        try {
            const analysisResultJson = await generateText(context, analysisSystemPrompt);

            // Default fallback structure for scene analysis
            const defaultAnalysis = {
                characters: {},
                items: {},
                locations: {},
                skills: {},
                assetGenerationRequests: []
            };

            const analysisResult = parseJsonWithFallback(analysisResultJson, defaultAnalysis);
            console.log('Scene analysis result:', analysisResult);

            return {
                analysisResult: analysisResult,
                assetGenerationRequests: analysisResult.assetGenerationRequests || []
            };
        } catch (error) {
            console.error("Error analyzing scene:", error);

            // Return fallback structure instead of throwing
            return {
                analysisResult: {
                    characters: {},
                    items: {},
                    locations: {},
                    skills: {}
                },
                assetGenerationRequests: []
            };
        }
    }
}