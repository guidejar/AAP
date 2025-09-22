import { generateText } from '../api/text-generator.js';
import { storyGeneratorSystemPrompt, worldBuilderSystemPrompt } from '../core/constants/prompts.js';

export class StoryProcessor {
    constructor(store) {
        this.store = store;
    }

    async generateStory(userInput) {
        const isInitialTurn = this.store.state.game.currentSceneIndex === -1;
        const systemPrompt = isInitialTurn ? worldBuilderSystemPrompt : storyGeneratorSystemPrompt;

        let context;
        if (isInitialTurn) {
            // 첫 턴에는 장르와 모험 설정을 포함한 프롬프트 생성
            const genre = this.store.state.config.genre || "인디아나존스처럼";
            const adventure = this.store.state.config.adventure || "대한제국시대로떨어진한국여자아이돌들";
            const initialPrompt = `장르: ${genre}\n배경 설정: ${adventure}\n\n이 설정을 바탕으로 흥미진진한 모험 스토리를 시작해주세요.`;
            context = [{ role: 'user', parts: [{ text: initialPrompt }] }];
        } else {
            const currentScene = this.store.state.game.sceneArchive[this.store.state.game.currentSceneIndex];
            context = [
                { role: 'model', parts: [{ text: currentScene.text }] },
                { role: 'user', parts: [{ text: userInput }] }
            ];
        }

        try {
            const apiKey = this.store.state.config.apiKey;
            const storyText = await generateText(context, systemPrompt, apiKey);
            return storyText;
        } catch (error) {
            console.error("Error generating story:", error);
            throw error;
        }
    }
}