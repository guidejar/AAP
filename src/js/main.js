/**
 * 파일명: main.js
 * 목적: 애플리케이션의 메인 로직, 게임 흐름 제어, 이벤트 리스너 등록을 담당합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:11 - 초기 생성: VV3.md의 핵심 로직과 이벤트 리스너 통합
 * 2025-09-14 14:40 - v4 아키텍처 리팩토링: 2-API 호출, DAD 스냅샷, 작업 큐 로직 적용
 * =====================
 */

// 1. 필요한 모듈과 함수들을 각 파일에서 가져옵니다.
import * as dom from './dom.js';
import * as state from './state.js';
import * as cfg from './config.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as utils from './utils.js';

// --- SECTION: 핵심 게임 흐름 (Orchestrator) (v4) ---

/**
 * 게임을 시작하는 메인 함수 (v4)
 */
async function startGame() {
    try {
        const genre = dom.genreInput.value;
        const adventure = dom.adventureInput.value;
        if (!genre || !adventure) {
            alert('장르와 모험 내용을 모두 입력해주세요.');
            return;
        }

        ui.showPageLoader("세계관 구성 중...");
        const worldBuildContext = [{ role: "user", parts: [{ text: `장르: ${genre}
모험: ${adventure}` }] }];
        const briefJsonResponse = await api.callGenerativeAPI(worldBuildContext, cfg.worldBuilderSystemPrompt, true); // API 키 사용
        if (!briefJsonResponse) throw new Error("캠페인 생성 AI로부터 응답을 받지 못했습니다.");

        const initialDadSnapshot = utils.parseCampaignBrief(briefJsonResponse);
        initialDadSnapshot.genre = genre;
        initialDadSnapshot.adventure = adventure;
        state.setInitialCoreSettings(initialDadSnapshot); // 초기 설정 저장

        dom.setupScreen.classList.add('hidden');
        dom.storyScreen.classList.remove('hidden');
        dom.storyScreen.classList.add('grid');

        ui.showPageLoader("첫 장면 생성 중...");
        const initialPrompt = `모험이 시작됩니다. 당신은 방금 생성된 세계관에 따라 이야기를 진행해야 합니다. 주인공을 '새로운 핵심 인물'로서 생성하고, 모험을 시작하는 첫 번째 장면을 완성해주세요.`;
        await processTurn(initialPrompt, true);

    } catch (error) {
        console.error("Game start error:", error);
        alert(error.message || "게임 시작 중 오류가 발생했습니다.");
        dom.setupScreen.classList.remove('hidden');
        dom.storyScreen.classList.add('hidden');
    } finally {
        ui.hidePageLoader();
    }
}

/**
 * 사용자 입력을 처리하는 함수 (v4)
 */
async function handleUserInput(e) {
    if (e) e.preventDefault();
    const text = dom.userInput.value.trim();
    if (!text || dom.sendBtn.disabled) return;

    if (state.isBranchingActive) {
        await handleBranching(state.currentSceneIndex, text);
        return;
    }

    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
    ui.clearChoices();
    ui.toggleLoading(true, "이야기 생성 중...");
    await processTurn(text);
    ui.toggleLoading(false);
}

/**
 * 과거 시점에서 새로운 분기(branch)를 생성하는 함수 (v4)
 */
async function handleBranching(branchIndex, userChoice) {
    // 1. 분기점 이후의 미래 기록을 잘라냄
    state.setSceneArchive(state.sceneArchive.slice(0, branchIndex + 1));
    state.setCurrentSceneIndex(branchIndex);
    state.setIsBranchingActive(false);
    dom.userInput.placeholder = "다음 행동을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)";

    // 2. 새로운 이야기 진행 시작
    dom.userInput.value = '';
    dom.userInput.style.height = 'auto';
    ui.clearChoices();
    ui.toggleLoading(true, "새로운 이야기를 만드는 중...");
    await processTurn(userChoice);
    ui.toggleLoading(false);
}

/**
 * 한 턴(turn)의 상호작용을 처리하는 v4 핵심 함수
 * @param {string} userText - 사용자가 입력한 텍스트
 * @param {boolean} isFirstScene - 현재 턴이 첫 장면인지 여부
 */
export async function processTurn(userText, isFirstScene = false) {
    try {
        const previousDadSnapshot = isFirstScene ? state.initialCoreSettings : state.sceneArchive[state.currentSceneIndex].dadSnapshot;

        // --- 1차 API 호출: 서사 생성 ---
        ui.toggleLoading(true, "1/2: 서사 생성 중...");
        const storyContext = buildStoryContext(userText, previousDadSnapshot);
        const storyResponse = await api.callGenerativeAPI(storyContext, cfg.storyGeneratorSystemPrompt, !!state.userApiKey);
        if (!storyResponse) throw new Error("1차 API(서사 생성)로부터 응답을 받지 못했습니다.");
        const { title, story } = utils.parseModelResponse(storyResponse);

        // --- 2차 API 호출: 분석 및 계획 수립 ---
        ui.toggleLoading(true, "2/2: 장면 분석 및 계획 수립 중...");
        const analysisContext = buildAnalysisContext(story, previousDadSnapshot);
        const analysisResponse = await api.callGenerativeAPI(analysisContext, cfg.analysisSystemPrompt, false); // 분석 API는 항상 키 없이 호출
        if (!analysisResponse) throw new Error("2차 API(분석)로부터 응답을 받지 못했습니다.");
        const analysisResult = utils.parseModelResponse(analysisResponse);

        // --- DAD 스냅샷 생성 및 장면 데이터 구성 ---
        const newDadSnapshot = mergeDadSnapshot(previousDadSnapshot, analysisResult.newAssets);

        const sceneData = {
            user_input: userText,
            title,
            story,
            hints: analysisResult.hints,
            choices: analysisResult.choices,
            displayImageId: analysisResult.displayImageId,
            dadSnapshot: newDadSnapshot, // 새로운 DAD 스냅샷 저장
            // 디버깅용 정보
            raw_story_response: storyResponse,
            raw_analysis_response: analysisResponse,
            taskQueue: analysisResult.taskQueue 
        };

        // --- 장면 아카이브 업데이트 ---
        if (state.currentSceneIndex < state.sceneArchive.length - 1) {
            state.setSceneArchive(state.sceneArchive.slice(0, state.currentSceneIndex + 1));
        }
        state.sceneArchive.push(sceneData);
        state.setCurrentSceneIndex(state.sceneArchive.length - 1);

        // --- 작업 큐(이미지 생성) 실행 ---
        await executeTaskQueue(analysisResult.taskQueue, newDadSnapshot);

        // --- 최종 렌더링 ---
        ui.renderScene(state.currentSceneIndex);

    } catch (error) {
        console.error("Turn processing error:", error);
        alert(error.message || "오류가 발생했습니다.");
        if (isFirstScene) {
            dom.setupScreen.classList.remove('hidden');
            dom.storyScreen.classList.add('hidden');
        }
    } finally {
        ui.toggleLoading(false);
    }
}


// --- SECTION: 컨텍스트 및 DAD 관리 (v4) ---

/**
 * 1차 API(서사 생성)를 위한 컨텍스트를 구성하는 함수
 * @param {string} currentUserAction - 사용자 현재 입력
 * @param {object} dadSnapshot - 이전 DAD 스냅샷
 * @returns {object[]} 1차 API용 컨텍스트
 */
function buildStoryContext(currentUserAction, dadSnapshot) {
    const narrativeContext = buildNarrativeContext(); // 기존 buildContext 로직 계승
    return [
        { role: "user", parts: [{ text: JSON.stringify({
            dynamicAssetDatabase: dadSnapshot,
            narrativeContext,
            currentUserAction
        })}] }
    ];
}

/**
 * 2차 API(분석)를 위한 컨텍스트를 구성하는 함수
 * @param {string} storyForAnalysis - 1차 API가 생성한 이야기
 * @param {object} dadSnapshot - 이전 DAD 스냅샷
 * @returns {object[]} 2차 API용 컨텍스트
 */
function buildAnalysisContext(storyForAnalysis, dadSnapshot) {
    const recentStoryContext = state.sceneArchive
        .slice(-2)
        .map(scene => scene.story);

    return [
        { role: "user", parts: [{ text: JSON.stringify({
            dynamicAssetDatabase: dadSnapshot,
            storyForAnalysis,
            recentStoryContext
        })}] }
    ];
}

/**
 * 서사적 맥락(narrativeContext)을 구성하는 헬퍼 함수
 */
function buildNarrativeContext() {
    const shortTermMemoryCount = 4;
    let history = [];

    if (state.sceneArchive.length > 0) {
        const longTermScenes = state.sceneArchive.slice(0, -shortTermMemoryCount);
        const shortTermScenes = state.sceneArchive.slice(-shortTermMemoryCount);

        if (longTermScenes.length > 0) {
            const longTermStorySummary = longTermScenes.map((scene, i) => `[SCENE ${i + 1} STORY]:
${scene.story}`).join('\n\n');
            history.push({ role: "user", parts: [{ text: `[LONG_TERM_MEMORY_SUMMARY]
${longTermStorySummary}` }] });
            history.push({ role: "model", parts: [{ text: "알겠습니다. 장기 기억(이전 이야기들)을 확인했습니다." }] });
        }

        shortTermScenes.forEach(scene => {
            history.push({ role: "user", parts: [{ text: scene.user_input }] });
            // v4에서는 2차 분석 결과가 모델의 응답이므로, raw_analysis_response를 사용 (구조 확인 필요)
            if(scene.raw_analysis_response) history.push({ role: "model", parts: [{ text: scene.raw_analysis_response }] });
        });
    }
    return history;
}

/**
 * 새로운 DAD 스냅샷을 생성하는 함수
 * @param {object} previousSnapshot - 이전 DAD 스냅샷
 * @param {object} newAssets - 2차 API가 반환한 신규/업데이트 에셋
 * @returns {object} 새로운 DAD 스냅샷
 */
function mergeDadSnapshot(previousSnapshot, newAssets) {
    // 1. 이전 스냅샷을 깊은 복사하여 불변성 유지
    const newSnapshot = JSON.parse(JSON.stringify(previousSnapshot));

    if (!newAssets) return newSnapshot;

    // 2. 신규/수정된 에셋을 병합하는 헬퍼 함수
    const merge = (targetArray, sourceArray) => {
        if (!sourceArray || !Array.isArray(sourceArray)) return;
        sourceArray.forEach(newItem => {
            const existingIndex = targetArray.findIndex(item => item.id === newItem.id);
            if (existingIndex > -1) {
                targetArray[existingIndex] = { ...targetArray[existingIndex], ...newItem }; // 업데이트
            } else {
                targetArray.push(newItem); // 추가
            }
        });
    };

    // 3. 각 에셋 타입에 대해 병합 실행
    merge(newSnapshot.keyCharacters, newAssets.keyCharacters);
    merge(newSnapshot.keyItems, newAssets.keyItems);
    merge(newSnapshot.keyLocations, newAssets.keyLocations);
    merge(newSnapshot.keySkills, newAssets.keySkills);

    return newSnapshot;
}


// --- SECTION: 에셋 생성 (v4) ---

/**
 * 작업 큐(Task Queue)를 순차적으로 실행하여 이미지를 생성/캐싱하는 함수
 * @param {object[]} taskQueue - 2차 API가 생성한 작업 목록
 * @param {object} dadSnapshot - 현재 턴의 DAD 스냅샷
 */
async function executeTaskQueue(taskQueue, dadSnapshot) {
    if (!taskQueue || taskQueue.length === 0) {
        dom.imageLoader.classList.add('hidden');
        return;
    }

    dom.imageLoader.classList.remove('hidden');

    // 키 비주얼은 항상 다른 에셋의 참조가 되므로 가장 먼저 생성
    const keyVisualTask = taskQueue.find(t => t.type === 'key_visual');
    if (keyVisualTask && !state.imageCache.has(keyVisualTask.assetId)) {
        await processTask(keyVisualTask, dadSnapshot);
    }

    // 나머지 작업을 순차적으로 실행
    for (const task of taskQueue) {
        if (task.type !== 'key_visual' && !state.imageCache.has(task.assetId)) {
            await processTask(task, dadSnapshot);
        }
    }

    dom.imageLoader.classList.add('hidden');
}

/**
 * 단일 이미지 생성 작업을 처리하는 헬퍼 함수
 * @param {object} task - 개별 작업 정보
 * @param {object} dadSnapshot - 현재 DAD 스냅샷
 */
async function processTask(task, dadSnapshot) {
    dom.imageLoaderText.textContent = `에셋 생성 중: ${task.assetId} (${task.type})`;

    // 1. 작업 유형에 맞는 프롬프트 템플릿 가져오기
    const promptTemplate = cfg.promptTemplates[task.type];
    if (!promptTemplate) {
        console.warn(`알 수 없는 작업 유형: ${task.type}`);
        return;
    }

    // 2. 프롬프트 데이터 구성
    let promptData = { ...promptTemplate };
    const referenceImages = [];
    let targetAssetInfo = {};

    // 3. 참조 이미지 준비 및 프롬프트 데이터 채우기
    // 키 비주얼은 항상 참조 이미지로 추가 (존재하는 경우)
    if (state.imageCache.has('campaign_key_visual')) {
        referenceImages.push({ id: 'campaign_key_visual', base64Data: state.imageCache.get('campaign_key_visual').split(',')[1] });
    }

    if (task.type !== 'key_visual') {
        targetAssetInfo = dadSnapshot.keyCharacters.find(c => c.id === task.assetId) || 
                          dadSnapshot.keyItems.find(i => i.id === task.assetId) || {};
        promptData.data_payload = targetAssetInfo;
    }

    if (task.type === 'head_portrait') {
        if (state.imageCache.has(task.assetId)) { // 3면도 참조
             referenceImages.push({ id: task.assetId, base64Data: state.imageCache.get(task.assetId).split(',')[1] });
        }
    }

    if (task.type === 'illustration') {
        promptData.scene_text_payload = state.sceneArchive[state.currentSceneIndex].story;
        promptData.data_payload = { dadSnapshot };
        // ToDo: 삽화에 등장하는 모든 에셋의 참조 이미지를 `referenceImages`에 추가하는 로직 구현
    }

    // 4. 이미지 생성 API 호출
    const imageUrl = await api.callImageAPI(promptData, referenceImages);

    // 5. 생성된 이미지를 캐시에 저장
    if (imageUrl) {
        state.imageCache.set(task.assetId, imageUrl);
    } else {
        state.imageCache.set(task.assetId, "https://placehold.co/1200x1800/ff0000/FFF?text=Gen+Failed");
        console.warn(`Failed to generate image for task: ${task.assetId}`);
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
