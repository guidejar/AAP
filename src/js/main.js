/**
 * 파일명: main.js
 * 목적: 애플리케이션의 메인 로직, 게임 흐름 제어, 이벤트 리스너 등록을 담당합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:11 - 초기 생성: VV3.md의 핵심 로직과 이벤트 리스너 통합
 * 2025-09-14 14:40 - v4 아키텍처 리팩토링: 2-API 호출, DAD 스냅샷, 작업 큐 로직 적용
 * 2025-09-16 13:50 - 사용자 요구사항에 맞춰 API 재시도 및 오류 처리 로직 전면 개편
 * 2025-09-16 14:00 - 사용자 설계안에 맞춰 이미지 생성(processTask) 로직 전면 재설계
 * 2025-09-16 14:20 - UX 개선: 1차 API 완료 후 즉시 렌더링 및 백그라운드 처리 로직 도입
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';
import * as cfg from './config.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

// --- SECTION: 핵심 게임 흐름 (Orchestrator) (v4) ---

async function startGame() {
    try {
        const genre = dom.genreInput.value;
        const adventure = dom.adventureInput.value;
        if (!genre || !adventure) {
            alert('장르와 모험 내용을 모두 입력해주세요.');
            return;
        }

        ui.showPageLoader("세계관 구성 중...");
        const worldBuildContext = [{ role: "user", parts: [{ text: `장르: ${genre}\n모험: ${adventure}` }] }];
        
        const briefJsonResponse = await api.callGenerativeAPI(worldBuildContext, cfg.worldBuilderSystemPrompt, !!state.userApiKey);
        
        if (!briefJsonResponse) throw new Error("캠페인 생성 AI로부터 응답을 받지 못했습니다.");

        const initialDadSnapshot = utils.parseCampaignBrief(briefJsonResponse);
        initialDadSnapshot.genre = genre;
        initialDadSnapshot.adventure = adventure;
        state.setInitialDadSnapshot(initialDadSnapshot);

        dom.setupScreen.classList.add('hidden');
        dom.storyScreen.classList.remove('hidden');
        dom.storyScreen.classList.add('grid');

        await processTurn(`모험이 시작됩니다. 당신은 방금 생성된 세계관에 따라 이야기를 진행해야 합니다. 주인공을 '새로운 핵심 인물'로서 생성하고, 모험을 시작하는 첫 번째 장면을 완성해주세요.`, true);

    } catch (error) {
        console.error("Game start error:", error);
        
        if (error instanceof api.ApiError && !state.userApiKey) {
            alert("API 호출 중 오류가 발생했습니다. 내부 API 사용량이 소진되었을 수 있습니다. 설정 메뉴를 열어 API 키를 입력해주세요.");
            dom.settingsModal.classList.remove('hidden');
        } else {
            alert(error.message || "게임 시작 중 오류가 발생했습니다.");
        }

        dom.setupScreen.classList.remove('hidden');
        dom.storyScreen.classList.add('hidden');
    } finally {
        ui.hidePageLoader();
    }
}

async function handleUserInput(e) {
    if (e) e.preventDefault();
    const text = dom.userInput.value.trim();
    if (!text || state.isGenerating) return;

    if (state.isBranchingActive) {
        await handleBranching(state.currentSceneIndex, text);
        return;
    }

    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
    ui.clearChoices();
    await processTurn(text);
}

async function handleBranching(branchIndex, userChoice) {
    state.setSceneArchive(state.sceneArchive.slice(0, branchIndex + 1));
    state.setCurrentSceneIndex(branchIndex);
    state.setIsBranchingActive(false);
    dom.userInput.placeholder = "다음 행동을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)";

    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
    ui.clearChoices();
    await processTurn(userChoice);
}

export async function processTurn(userText, isFirstScene = false) {
    state.setIsGenerating(true);
    ui.updateGlobalLoadingState();

    try {
        const previousDadSnapshot = isFirstScene ? state.initialDadSnapshot : state.sceneArchive[state.currentSceneIndex].dadSnapshot;

        const storyContext = buildStoryContext(userText, previousDadSnapshot);
        const storyResponse = await api.callGenerativeAPI(storyContext, cfg.storyGeneratorSystemPrompt, !!state.userApiKey);
        if (!storyResponse) throw new Error("1차 API(서사 생성)로부터 응답을 받지 못했습니다.");
        const { title, story } = utils.parseModelResponse(storyResponse);
        
        if (isFirstScene) ui.hidePageLoader();

        const tempSceneData = {
            user_input: userText,
            title,
            story,
            isComplete: false,
            dadSnapshot: previousDadSnapshot,
        };

        if (state.currentSceneIndex < state.sceneArchive.length - 1) {
            state.setSceneArchive(state.sceneArchive.slice(0, state.currentSceneIndex + 1));
        }
        state.sceneArchive.push(tempSceneData);
        state.setCurrentSceneIndex(state.sceneArchive.length - 1);
        
        ui.renderScene(state.currentSceneIndex);

        finishSceneGeneration(state.currentSceneIndex, previousDadSnapshot, story, storyResponse);

    } catch (error) {
        console.error("Turn processing error:", error);
        state.setIsGenerating(false);
        ui.updateGlobalLoadingState();
        
        if (error instanceof api.ApiError && !state.userApiKey) {
            alert("API 호출 중 오류가 발생했습니다. 내부 API 사용량이 소진되었을 수 있습니다. 설정 메뉴를 열어 API 키를 입력해주세요.");
            dom.settingsModal.classList.remove('hidden');
        } else {
            alert(error.message || "오류가 발생했습니다.");
        }

        if (isFirstScene) {
            dom.setupScreen.classList.remove('hidden');
            dom.storyScreen.classList.add('hidden');
        }
    }
}

async function finishSceneGeneration(sceneIndex, previousDadSnapshot, story, storyResponse) {
    try {
        const analysisContext = buildAnalysisContext(story, previousDadSnapshot);
        let analysisResponse;
        try {
            analysisResponse = await api.callGenerativeAPI(analysisContext, cfg.analysisSystemPrompt, false);
        } catch (error) {
            if (error instanceof api.ApiError && error.status === 429 && state.userApiKey) {
                console.warn("내부 API(분석) 할당량 초과. API 키를 사용하여 재시도합니다.");
                analysisResponse = await api.callGenerativeAPI(analysisContext, cfg.analysisSystemPrompt, true);
            } else {
                throw error;
            }
        }
        if (!analysisResponse) throw new Error("2차 API(분석)로부터 응답을 받지 못했습니다.");
        const analysisResult = utils.parseModelResponse(analysisResponse);

        const newDadSnapshot = mergeDadSnapshot(previousDadSnapshot, analysisResult.newAssets);

        await executeTaskQueue(analysisResult.taskQueue, newDadSnapshot);

        const finalSceneData = {
            ...state.sceneArchive[sceneIndex],
            hints: analysisResult.hints,
            choices: analysisResult.choices,
            displayImageId: analysisResult.displayImageId,
            dadSnapshot: newDadSnapshot,
            raw_story_response: storyResponse,
            raw_analysis_response: analysisResponse,
            taskQueue: analysisResult.taskQueue,
            isComplete: true,
        };
        state.sceneArchive[sceneIndex] = finalSceneData;

    } catch (error) {
        console.error("Background scene generation error:", error);
        state.sceneArchive[sceneIndex].error = true;
    } finally {
        state.setIsGenerating(false);
        if (state.currentSceneIndex === sceneIndex) {
            ui.renderScene(sceneIndex);
        }
        ui.updateGlobalLoadingState();
    }
}

function buildStoryContext(currentUserAction, dadSnapshot) {
    const narrativeContext = buildNarrativeContext();
    return [
        { role: "user", parts: [{ text: JSON.stringify({ dynamicAssetDatabase: dadSnapshot, narrativeContext, currentUserAction }) }] }
    ];
}

function buildAnalysisContext(storyForAnalysis, dadSnapshot) {
    const recentStoryContext = state.sceneArchive.slice(-2).map(scene => scene.story);
    return [
        { role: "user", parts: [{ text: JSON.stringify({ dynamicAssetDatabase: dadSnapshot, storyForAnalysis, recentStoryContext }) }] }
    ];
}

function buildNarrativeContext() {
    const shortTermMemoryCount = 4;
    let history = [];

    if (state.sceneArchive.length > 0) {
        const longTermScenes = state.sceneArchive.slice(0, -shortTermMemoryCount);
        const shortTermScenes = state.sceneArchive.slice(-shortTermMemoryCount);

        if (longTermScenes.length > 0) {
            const longTermStorySummary = longTermScenes.map((scene, i) => `[SCENE ${i + 1} STORY]:\n${scene.story}`).join('\n\n');
            history.push({ role: "user", parts: [{ text: `[LONG_TERM_MEMORY_SUMMARY]\n${longTermStorySummary}` }] });
            history.push({ role: "model", parts: [{ text: "알겠습니다. 장기 기억(이전 이야기들)을 확인했습니다." }] });
        }

        shortTermScenes.forEach(scene => {
            history.push({ role: "user", parts: [{ text: scene.user_input }] });
            if(scene.raw_analysis_response) history.push({ role: "model", parts: [{ text: scene.raw_analysis_response }] });
        });
    }
    return history;
}

function mergeDadSnapshot(previousSnapshot, newAssets) {
    const newSnapshot = JSON.parse(JSON.stringify(previousSnapshot));
    if (!newAssets) return newSnapshot;

    const merge = (targetArray, sourceArray) => {
        if (!sourceArray || !Array.isArray(sourceArray)) return;
        sourceArray.forEach(newItem => {
            const existingIndex = targetArray.findIndex(item => item.id === newItem.id);
            if (existingIndex > -1) {
                targetArray[existingIndex] = { ...targetArray[existingIndex], ...newItem };
            } else {
                targetArray.push(newItem);
            }
        });
    };

    merge(newSnapshot.keyCharacters, newAssets.keyCharacters);
    merge(newSnapshot.keyItems, newAssets.keyItems);
    merge(newSnapshot.keyLocations, newAssets.keyLocations);
    merge(newSnapshot.keySkills, newAssets.keySkills);

    return newSnapshot;
}

async function executeTaskQueue(taskQueue, dadSnapshot) {
    if (!taskQueue || taskQueue.length === 0) return;

    const keyVisualTask = taskQueue.find(t => t.type === 'key_visual');
    if (keyVisualTask && !state.imageCache.has(keyVisualTask.assetId)) {
        await processTask(keyVisualTask, dadSnapshot);
    }

    for (const task of taskQueue) {
        if (task.type !== 'key_visual') {
            const imageCacheKey = `${task.assetId}_${task.type}`;
            if (!state.imageCache.has(imageCacheKey)) {
                await processTask(task, dadSnapshot);
            }
        }
    }
}

async function processTask(task, dadSnapshot) {
    const imageCacheKey = task.type === 'key_visual' ? task.assetId : `${task.assetId}_${task.type}`;
    
    // 이 부분은 ui.js로 옮겨져야 할 수 있습니다.
    // dom.imageLoader.classList.remove('hidden');
    // dom.imageLoaderText.textContent = `에셋 생성 중: ${task.assetId} (${task.type})`;

    const promptTemplate = cfg.promptTemplates[task.type];
    if (!promptTemplate) {
        console.warn(`알 수 없는 작업 유형: ${task.type}`);
        return;
    }

    let promptData = { ...promptTemplate };
    const referenceImages = [];
    
    switch (task.type) {
        case 'key_visual':
            promptData.data_payload = dadSnapshot;
            break;

        case '3_view_reference':
            promptData.data_payload = dadSnapshot.keyCharacters.find(c => c.id === task.assetId) || dadSnapshot.keyItems.find(i => i.id === task.assetId) || {};
            if (state.imageCache.has('campaign_key_visual')) {
                referenceImages.push({ id: 'campaign_key_visual', base64Data: state.imageCache.get('campaign_key_visual').split(',')[1] });
            }
            break;

        case 'head_portrait':
            promptData.data_payload = dadSnapshot.keyCharacters.find(c => c.id === task.assetId) || {};
            if (state.imageCache.has('campaign_key_visual')) {
                referenceImages.push({ id: 'campaign_key_visual', base64Data: state.imageCache.get('campaign_key_visual').split(',')[1] });
            }
            const threeViewCacheKey = `${task.assetId}_3_view_reference`;
            if (state.imageCache.has(threeViewCacheKey)) {
                 referenceImages.push({ id: threeViewCacheKey, base64Data: state.imageCache.get(threeViewCacheKey).split(',')[1] });
            }
            break;

        case 'illustration':
            promptData.scene_text_payload = state.sceneArchive[state.currentSceneIndex].story;
            promptData.data_payload = { dadSnapshot };
            
            if (state.imageCache.has('campaign_key_visual')) {
                 referenceImages.push({ id: 'campaign_key_visual', base64Data: state.imageCache.get('campaign_key_visual').split(',')[1] });
            }

            const currentTaskQueue = state.sceneArchive[state.currentSceneIndex].taskQueue || [];
            currentTaskQueue.forEach(t => {
                const assetCacheKey = `${t.assetId}_${t.type}`;
                if (t.type === '3_view_reference' && state.imageCache.has(assetCacheKey)) {
                    referenceImages.push({ id: assetCacheKey, base64Data: state.imageCache.get(assetCacheKey).split(',')[1] });
                }
            });
            break;
    }

    try {
        let imageUrl = await api.callImageAPI(promptData, referenceImages, false);
        state.imageCache.set(imageCacheKey, imageUrl);
    } catch (error) {
        if (error instanceof api.ApiError && error.status === 429 && state.userApiKey) {
            console.warn(`내부 이미지 API 할당량 초과 (${task.assetId}). API 키를 사용하여 재시도합니다.`);
            try {
                const imageUrl = await api.callImageAPI(promptData, referenceImages, true);
                state.imageCache.set(imageCacheKey, imageUrl);
            } catch (retryError) {
                 console.error(`Image API retry failed for task: ${task.assetId}`, retryError);
                 state.imageCache.set(imageCacheKey, "https://placehold.co/1200x1800/ff0000/FFF?text=Gen+Failed");
            }
        } else {
            console.error(`Failed to generate image for task: ${task.assetId}`, error);
            state.imageCache.set(imageCacheKey, "https://placehold.co/1200x1800/ff0000/FFF?text=Gen+Failed");
            if (error instanceof api.ApiError && !state.userApiKey) {
                 alert("이미지 생성 중 오류가 발생했습니다. 내부 API 사용량이 소진되었을 수 있습니다. 설정에서 API 키를 입력하시면 계속할 수 있습니다.");
                 dom.settingsModal.classList.remove('hidden');
            }
        }
    }
}


// --- SECTION: 이벤트 리스너 등록 (v4) ---

function initializeEventListeners() {
    dom.startBtn.addEventListener('click', startGame);
    dom.loadBtn.addEventListener('click', () => dom.loadInput.click());
    dom.loadInput.addEventListener('change', utils.handleFileLoad);

    dom.prevBtn.addEventListener('click', () => { if (state.currentSceneIndex > 0) ui.renderScene(state.currentSceneIndex - 1); });
    dom.nextBtn.addEventListener('click', () => { if (state.currentSceneIndex < state.sceneArchive.length - 1) ui.renderScene(state.currentSceneIndex + 1); });

    dom.storyForm.addEventListener('submit', handleUserInput);
    dom.userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); dom.storyForm.dispatchEvent(new Event('submit')); } });
    dom.userInput.addEventListener('input', () => { dom.userInput.style.height = 'auto'; dom.userInput.style.height = (dom.userInput.scrollHeight) + 'px'; });
    dom.userInput.addEventListener('focus', () => dom.inputPanel.classList.add('focused'));
    dom.userInput.addEventListener('blur', () => dom.inputPanel.classList.remove('focused'));

    dom.settingsBtnFloating.addEventListener('click', () => dom.settingsModal.classList.remove('hidden'));
    dom.closeSettingsBtn.addEventListener('click', () => dom.settingsModal.classList.add('hidden'));
    dom.debugCheckbox.addEventListener('change', () => {
        state.setIsDebugMode(dom.debugCheckbox.checked);
        if (state.currentSceneIndex >= 0) ui.toggleDebugView(state.isDebugMode);
    });
    dom.saveBtn.addEventListener('click', utils.saveStory);
    dom.loadModalBtn.addEventListener('click', () => { dom.loadInput.click(); dom.settingsModal.classList.add('hidden'); });

    const syncApiKeys = (e) => {
        state.setUserApiKey(e.target.value);
        dom.apiKeyModalInput.value = state.userApiKey;
        dom.apiKeySetupInput.value = state.userApiKey;
    };
    dom.apiKeySetupInput.addEventListener('input', syncApiKeys);
    dom.apiKeyModalInput.addEventListener('input', syncApiKeys);

    dom.branchBtn.addEventListener('click', () => {
        state.setIsBranchingActive(true);
        dom.pastActionContainer.classList.add('hidden');
        dom.branchBtn.classList.add('hidden');
        dom.inputContainer.classList.remove('hidden');
        ui.toggleInput(false);
        dom.userInput.placeholder = "이후 모든 내용이 삭제됩니다. 원치 않는다면 ESC를 눌러 설정을 열고 저장하세요.";
        dom.userInput.focus();
    });

    const closeImageViewer = () => dom.imageViewerModal.classList.add('hidden');
    dom.closeImageViewerBtn.addEventListener('click', closeImageViewer);
    dom.imageViewerModal.addEventListener('click', (e) => {
        if (e.target.id === 'image-viewer-modal') closeImageViewer();
    });

    window.addEventListener('keydown', (e) => {
        const isModalOpen = !dom.settingsModal.classList.contains('hidden');
        const isInputFocused = document.activeElement === dom.userInput;

        if (e.key === 'Escape') {
            e.preventDefault();
            if (!dom.imageViewerModal.classList.contains('hidden')) {
                closeImageViewer();
            } else if (state.isBranchingActive) {
                state.setIsBranchingActive(false);
                ui.renderScene(state.currentSceneIndex);
            } else {
                dom.settingsModal.classList.toggle('hidden');
            }
        }

        if (isInputFocused || isModalOpen) return;

        if (e.key === 'ArrowLeft') { dom.prevBtn.click(); }
        if (e.key === 'ArrowRight') { dom.nextBtn.click(); }

        if (e.key === 'ArrowUp') { document.querySelector('#story-panel .flex-grow').scrollBy(0, -50); }
        if (e.key === 'ArrowDown') { document.querySelector('#story-panel .flex-grow').scrollBy(0, 50); }

        if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); dom.userInput.focus(); }
        if (e.ctrlKey && e.key === 'ArrowUp') { e.preventDefault(); dom.prevBtn.focus(); }
    });
}

// --- SECTION: 애플리케이션 초기화 ---

window.addEventListener('DOMContentLoaded', initializeEventListeners);
