/**
 * 파일명: ui.js
 * 목적: UI 렌더링, 사용자 상호작용 및 시각적 요소 제어 함수를 관리합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-17 - v4 레이아웃 리팩토링: 새로운 DOM 구조에 맞게 UI 로직 전면 개편
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';

/**
 * 특정 장면(scene)을 화면에 렌더링하는 함수
 */
export function renderScene(index) {
    if (index < 0 || index >= state.sceneArchive.length) return;

    state.setCurrentSceneIndex(index);
    const scene = state.sceneArchive[index];
    const isLatestScene = index === state.sceneArchive.length - 1;

    dom.sceneTitleEl.textContent = scene.title;
    dom.storyOutputEl.textContent = scene.story;

    if (scene.isComplete) {
        const imageUrl = state.imageCache.get(scene.displayImageId);
        if (imageUrl && dom.illustrationEl.src !== imageUrl) {
            dom.illustrationEl.style.opacity = 0;
            setTimeout(() => { 
                dom.illustrationEl.src = imageUrl; 
                dom.illustrationEl.style.opacity = 1; 
            }, 300);
        }
        dom.imageLoader.classList.add('hidden');
        // renderHintPanel is removed, hints are now in the toolbar.
        renderChoices(scene.choices, (isLatestScene || state.isBranchingActive) && !state.isGenerating);
    } else {
        dom.imageLoader.classList.remove('hidden');
        dom.imageLoaderText.textContent = "새로운 삽화 생성 중...";
        clearChoices();
    }

    updateUiState(isLatestScene);
    toggleDebugView(state.isDebugMode);
}

/**
 * 현재 씬 상태에 따라 UI의 각 부분을 업데이트하는 함수
 */
function updateUiState(isLatestScene) {
    dom.prevBtn.disabled = state.currentSceneIndex === 0;
    dom.nextBtn.disabled = isLatestScene;

    updateGlobalLoadingState();
}

/**
 * 전역 생성 상태(isGenerating)에 따라 입력창의 로딩 UI를 업데이트하는 함수
 */
export function updateGlobalLoadingState() {
    const isLatestScene = state.currentSceneIndex === state.sceneArchive.length - 1;
    const isBranching = state.isBranchingActive; // This state needs to be handled by a new branching button logic

    if (state.isGenerating && isLatestScene) {
        dom.inputLoader.classList.remove('hidden');
        dom.storyForm.classList.add('hidden');
        dom.inputLoaderText.textContent = "장면 생성 중...";
        toggleInput(true);
    } else {
        dom.inputLoader.classList.add('hidden');
        dom.storyForm.classList.remove('hidden');
        const shouldBeInteractive = (isLatestScene || isBranching) && !state.isGenerating;
        toggleInput(!shouldBeInteractive);
        if (shouldBeInteractive) {
            dom.userInput.focus();
        }
    }
}

export function showPageLoader(text) { 
    dom.pageLoaderText.textContent = text; 
    dom.pageLoader.classList.remove('hidden'); 
}

export function hidePageLoader() { 
    dom.pageLoader.classList.add('hidden'); 
}

/**
 * 선택지를 렌더링하는 함수.
 * 클릭 시 입력창에 텍스트를 채워넣습니다.
 */
function renderChoices(choices, areClickable = true) {
    clearChoices();
    if (!choices || choices.length === 0) return;
    
    choices.forEach(choiceText => {
        const button = document.createElement('button');
        button.textContent = choiceText;
        
        if (areClickable) {
            button.className = "bg-indigo-500/60 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-full text-sm transition-colors";
            button.onclick = () => {
                dom.userInput.value = choiceText;
                dom.userInput.focus();
                // Auto-resize textarea after populating
                const event = new Event('input', { bubbles: true });
                dom.userInput.dispatchEvent(event);
            };
        } else {
            button.className = "bg-gray-700/50 text-gray-400 font-semibold py-1 px-3 rounded-full text-sm cursor-not-allowed";
            button.disabled = true;
        }
        
        dom.choiceContainer.appendChild(button);
    });
}

export function clearChoices() { 
    dom.choiceContainer.innerHTML = ''; 
}

export function toggleInput(isDisabled) { 
    dom.userInput.disabled = isDisabled; 
    dom.sendBtn.disabled = isDisabled; 
}

export function toggleDebugView(show) {
    const scene = state.sceneArchive[state.currentSceneIndex];
    if (!scene) return;

    if (show) {
        dom.debugInputText.parentElement.querySelector('h4').textContent = 'DEBUG: 1차 API 응답 (서사)';
        dom.debugInputText.textContent = scene.raw_story_response || 'N/A';
        
        dom.debugOutputText.parentElement.querySelector('h4').textContent = 'DEBUG: 2차 API 응답 (분석)';
        dom.debugOutputText.textContent = scene.raw_analysis_response || 'N/A';
        
        dom.assetPipelineViewer.parentElement.querySelector('h4').textContent = 'DEBUG: 작업 큐 (Task Queue)';
        dom.assetPipelineViewer.textContent = JSON.stringify(scene.taskQueue, null, 2) || 'N/A';

        dom.imageCacheViewer.innerHTML = '';
        if (state.imageCache.size === 0) { 
            dom.imageCacheViewer.textContent = 'Image cache is empty.'; 
        } else {
            state.imageCache.forEach((base64Data, id) => {
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = id;
                link.className = 'text-cyan-400 hover:underline cursor-pointer';
                link.onclick = (e) => {
                    e.preventDefault();
                    dom.modalImageContent.src = base64Data;
                    dom.imageViewerModal.classList.remove('hidden');
                };
                dom.imageCacheViewer.appendChild(link);
            });
        }
        dom.debugOutputContainer.classList.remove('hidden');
    } else {
        dom.debugOutputContainer.classList.add('hidden');
    }
}