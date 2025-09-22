import { StoryProcessor } from './story-processor.js';
import { SceneAnalyzer } from './scene-analyzer.js';
import { DADManager } from './dad-manager.js';
import { TaskQueue } from './task-queue.js';
import { generateImage } from '../api/image-generator.js';

export class GameController {
    constructor(store) {
        this.store = store;
        this.storyProcessor = new StoryProcessor(store);
        this.sceneAnalyzer = new SceneAnalyzer(store);
        this.dadManager = new DADManager();
        this.taskQueue = new TaskQueue();
    }

    async initialize() {
        console.log('GameController initialized.');

        // 0-turn story generation (initial world setting)
        const storyText = await this.storyProcessor.generateStory("게임 시작");

        const newScene = {
            id: `scene_0`,
            text: storyText,
            dadSnapshot: this.dadManager.createSnapshot(this.store.state.cache.dadSnapshots) // Initial snapshot
        };
        this.store.state.game.sceneArchive.push(newScene);
        this.store.update('game.currentSceneIndex', 0);

        // Placeholder for rendering to Story Panel (will be connected in CT010)
        console.log('Initial story generated. Ready to render to Story Panel.');
    }

    async processTurn(userInput) {
        this.store.update('ui.isGenerating', true);

        try {
            // 1st API Call: Generate Story
            const storyText = await this.storyProcessor.generateStory(userInput);
            
            // Update game state with new scene
            const newScene = {
                id: `scene_${this.store.state.game.sceneArchive.length + 1}`,
                text: storyText,
                dadSnapshot: this.dadManager.createSnapshot(this.store.state.cache.dadSnapshots) // Snapshot before analysis
            };
            this.store.state.game.sceneArchive.push(newScene);
            this.store.update('game.currentSceneIndex', this.store.state.game.sceneArchive.length - 1);

            // 2nd API Call: Analyze Scene in background
            this.taskQueue.addTask(async () => {
                const analysisResult = await this.sceneAnalyzer.analyzeScene(storyText, newScene.dadSnapshot);
                
                // Update DAD based on analysis
                const currentDad = this.store.state.cache.dadSnapshots;
                const updatedDad = this.dadManager.mergeDadSnapshot(currentDad, analysisResult.analysisResult);
                this.store.update('cache.dadSnapshots', updatedDad);

                // Queue image generation requests
                for (const request of analysisResult.assetGenerationRequests) {
                    this.taskQueue.addTask(async () => {
                        const imageUrl = await generateImage(request.prompt, request.type);
                        // Store image URL in cache or DAD
                        console.log(`Generated image for ${request.assetId}: ${imageUrl}`);
                    });
                }
            });

        } catch (error) {
            console.error("Error processing turn:", error);
        } finally {
            this.store.update('ui.isGenerating', false);
        }
    }
}