/**
 * 파일명: ui.js
 * 목적: UI 렌더링, 사용자 상호작용 및 시각적 요소 제어 함수를 관리합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:08 - 초기 생성: VV3.md에서 UI 관련 로직 분리
 * 2025-09-14 14:55 - v4 리팩토링: DAD 스냅샷 및 새로운 scene 객체 구조에 맞게 렌더링 함수 수정
 * 2025-09-16 14:30 - UX 개선: 즉시 렌더링 및 전역 로딩 상태 UI 로직 추가
 * 2025-09-16 14:55 - 버그 수정: 과거 장면 조회 시, 해당 장면에 맞는 선택지가 표시되도록 수정
 * 2025-09-16 15:10 - 분기(branching) 기능 UX 개선: 과거 장면에서 선택지 활성화 로직 구현
 * =====================
 */

import * as dom from './dom.js';
import * as state from './state.js';
import * as debug from './debug.js';
import { processTurn } from './main.js';

/**
 * 특정 장면(scene)을 화면에 렌더링하는 함수
 */
export function renderScene(index) {
    if (index < 0 || index >= state.sceneArchive.length) return;

    state.setCurrentSceneIndex(index);
    const scene = state.sceneArchive[index];
    const isLatestScene = index === state.sceneArchive.length - 1;

    if (dom.sceneTitleEl) {
        dom.sceneTitleEl.textContent = scene.title;
    }
    if (dom.storyOutputEl) {
        dom.storyOutputEl.textContent = scene.story;
    }

    if (scene.isComplete) {
        const imageUrl = state.imageCache.get(scene.displayImageId);
        if (imageUrl && dom.illustrationEl && dom.illustrationEl.src !== imageUrl) {
            dom.illustrationEl.style.opacity = 0;
            setTimeout(() => {
                if (dom.illustrationEl) {
                    dom.illustrationEl.src = imageUrl;
                    dom.illustrationEl.style.opacity = 1;
                    // 반응형 이미지 레이아웃 업데이트
                    handleResponsiveImageLayout();
                }
            }, 300);
        } else if (imageUrl && dom.illustrationEl) {
            // 이미지가 이미 로드된 경우에도 반응형 레이아웃 확인
            handleResponsiveImageLayout();
        }
        if (dom.imageLoader) {
            dom.imageLoader.classList.add('hidden');
        }
        renderHintPanel(scene.hints);
        renderChoices(scene.choices, (isLatestScene || state.isBranchingActive) && !state.isGenerating);
    } else {
        if (dom.imageLoader) {
            dom.imageLoader.classList.remove('hidden');
        }
        if (dom.imageLoaderText) {
            dom.imageLoaderText.textContent = "새로운 삽화 생성 중...";
        }
        // Hint panel has been removed in new layout - this code is no longer needed
        // if (dom.hintPanel) {
        //     dom.hintPanel.innerHTML = '<div class="text-center text-gray-400 p-8">장면 분석 중...</div>';
        // }
        clearChoices();
    }

    updateUiState(isLatestScene);
    toggleDebugView(state.isDebugMode);
}

/**
 * 현재 씬 상태에 따라 UI의 각 부분을 업데이트하는 함수
 */
function updateUiState(isLatestScene) {
    const isBranching = state.isBranchingActive;

    if (dom.inputContainer) {
        dom.inputContainer.classList.toggle('hidden', !isLatestScene && !isBranching);
    }
    if (dom.pastActionContainer) {
        dom.pastActionContainer.classList.toggle('hidden', isLatestScene || isBranching);
    }
    if (dom.branchBtn) {
        dom.branchBtn.classList.toggle('hidden', isLatestScene || isBranching);
    }

    if (!isLatestScene && !isBranching && dom.pastActionText) {
        dom.pastActionText.textContent = state.sceneArchive[state.currentSceneIndex + 1]?.user_input || '';
    }

    if (dom.prevBtn) {
        dom.prevBtn.disabled = state.currentSceneIndex === 0;
    }
    if (dom.nextBtn) {
        dom.nextBtn.disabled = isLatestScene;
    }

    updateGlobalLoadingState();
}

/**
 * 전역 생성 상태(isGenerating)에 따라 입력창의 로딩 UI를 업데이트하는 함수
 */
export function updateGlobalLoadingState() {
    const isLatestScene = state.currentSceneIndex === state.sceneArchive.length - 1;
    const isBranching = state.isBranchingActive;

    if (state.isGenerating && isLatestScene) {
        if (dom.inputLoader) {
            dom.inputLoader.classList.remove('hidden');
        }
        if (dom.inputContainer) {
            dom.inputContainer.classList.add('hidden');
        }
        if (dom.inputLoaderText) {
            dom.inputLoaderText.textContent = "장면 생성 중...";
        }
        toggleInput(true);
    } else {
        if (dom.inputLoader) {
            dom.inputLoader.classList.add('hidden');
        }
        const shouldBeInteractive = (isLatestScene || isBranching) && !state.isGenerating;
        toggleInput(!shouldBeInteractive);
        if (shouldBeInteractive && dom.userInput) {
            dom.userInput.focus();
        }
    }
}

function renderHintPanel(hints) {
    // Hint panel has been removed in new layout - function disabled
    return;
    // if (!dom.hintPanel) return;
    // dom.hintPanel.innerHTML = '';
    // if (!hints) return;

    let finalHtml = '';
    const enabledItemClasses = 'bg-gray-700/80 border-gray-600 hover:bg-gray-600 hover:border-gray-500 cursor-pointer';
    const disabledItemClasses = 'bg-gray-800/60 border-gray-700/50 text-gray-500 cursor-default';
    const infoItemClasses = 'bg-gray-700/40 border-gray-600 text-gray-300 cursor-default';

    if (hints.characters && hints.characters.length > 0) {
        finalHtml += `
            <div>
                <h3 class="font-bold text-xl mb-3 border-b border-gray-700 pb-2">캐릭터</h3>
                <div class="flex flex-wrap gap-2">
                    ${hints.characters.map(item => `
                        <span class="js-tooltip-trigger ${infoItemClasses}" data-tooltip="${item.tooltip || '정보 없음'}">
                            <span class="font-semibold text-white">${item.name || 'N/A'}</span>: ${item.status || ''}
                        </span>
                    `).join('')}
                </div>
            </div>`;
    }

    const createHintSection = (title, items, category) => {
        if (!items || items.length === 0) return '';
        return `
            <div class="mt-6">
                <h3 class="font-bold text-xl mb-3 border-b border-gray-700 pb-2">${title}</h3>
                <div class="flex flex-wrap gap-2">
                    ${items.map(item => `
                        <span class="js-tooltip-trigger ${item.usable ? enabledItemClasses : disabledItemClasses}" data-tooltip="${item.tooltip || '정보 없음'}">
                            ${item.name || 'N/A'}
                            ${category === 'skills' && item.owner ? ` <span class="text-xs opacity-70">(${item.owner})</span>` : ''}
                        </span>
                    `).join('')}
                </div>
            </div>`;
    };
    
    finalHtml += createHintSection('스킬', hints.skills, 'skills');
    finalHtml += createHintSection('인벤토리', hints.inventory, 'inventory');

    // Hint panel has been removed in new layout
    // if (dom.hintPanel) {
    //     dom.hintPanel.innerHTML = finalHtml;
    // }
    setupTooltipListeners();
}

function setupTooltipListeners() {
    const tooltipTriggers = document.querySelectorAll('.js-tooltip-trigger');
    tooltipTriggers.forEach(trigger => {
        trigger.addEventListener('mouseover', (e) => {
            const tooltipText = e.currentTarget.dataset.tooltip;
            dom.globalTooltip.textContent = tooltipText;
            dom.globalTooltip.classList.add('visible');
        });
        trigger.addEventListener('mousemove', (e) => {
            dom.globalTooltip.style.left = `${e.clientX + 15}px`;
            dom.globalTooltip.style.top = `${e.clientY + 15}px`;
        });
        trigger.addEventListener('mouseout', () => {
            dom.globalTooltip.classList.remove('visible');
        });
    });
}

export function showPageLoader(text) { 
    dom.pageLoaderText.textContent = text; 
    dom.pageLoader.classList.remove('hidden'); 
}

export function hidePageLoader() { 
    dom.pageLoader.classList.add('hidden'); 
}

function renderChoices(choices, areClickable = true) {
    clearChoices();
    if (!choices || choices.length === 0) return;
    
    choices.forEach(choiceText => {
        const button = document.createElement('button');
        button.textContent = choiceText;
        
        if (areClickable) {
            button.className = "bg-indigo-500/60 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded-full text-sm transition-colors";
            button.onclick = async () => {
                await processTurn(choiceText);
            };
        } else {
            button.className = "bg-gray-700/50 text-gray-400 font-semibold py-1 px-3 rounded-full text-sm cursor-not-allowed";
            button.disabled = true;
        }
        
        if (dom.choiceContainer) {
            dom.choiceContainer.appendChild(button);
        }
    });
}

export function clearChoices() {
    if (dom.choiceContainer) {
        dom.choiceContainer.innerHTML = '';
    }
}

export function toggleInput(isDisabled) {
    if (dom.userInput) {
        dom.userInput.disabled = isDisabled;
    }
    if (dom.sendBtn) {
        dom.sendBtn.disabled = isDisabled;
    }
}

export function toggleDebugView(show) {
    const scene = state.sceneArchive[state.currentSceneIndex];
    if (!scene) return;

    if (show) {
        // 기존 디버그 정보
        if (dom.promptOverlay) {
            dom.promptOverlay.textContent = `[DISPLAY_IMAGE_ID]: ${scene.displayImageId || 'N/A'}`;
            dom.promptOverlay.classList.remove('hidden');
        }

        if (dom.debugInputText) {
            dom.debugInputText.textContent = scene.raw_story_response || 'N/A';
        }

        if (dom.debugOutputText) {
            dom.debugOutputText.textContent = scene.raw_analysis_response || 'N/A';
        }

        if (dom.assetPipelineViewer) {
            dom.assetPipelineViewer.textContent = JSON.stringify(scene.taskQueue, null, 2) || 'N/A';
        }

        // 강화된 디버그 정보 업데이트
        updateEnhancedDebugView();

        if (dom.debugOutputContainer) {
            dom.debugOutputContainer.classList.remove('hidden');
        }
    } else {
        if (dom.promptOverlay) {
            dom.promptOverlay.classList.add('hidden');
        }
        if (dom.debugOutputContainer) {
            dom.debugOutputContainer.classList.add('hidden');
        }
    }
}

/**
 * 강화된 디버그 정보 업데이트 함수
 */
export function updateEnhancedDebugView() {
    // 최신 이미지 프롬프트 표시
    if (dom.latestImagePrompt) {
        const latestPrompt = debug.debugLog.imagePrompts[debug.debugLog.imagePrompts.length - 1];
        if (latestPrompt) {
            const promptInfo = `Cache Key: ${latestPrompt.cacheKey}
Mission: ${latestPrompt.mission}
Timestamp: ${latestPrompt.timestamp}

Natural Prompt:
${latestPrompt.naturalPrompt}

Success: ${latestPrompt.success ? '✅' : '❌'}
${latestPrompt.errorMessage ? `Error: ${latestPrompt.errorMessage}` : ''}
Reference Images: ${latestPrompt.referenceImageCount}`;
            dom.latestImagePrompt.textContent = promptInfo;
        } else {
            dom.latestImagePrompt.textContent = '아직 이미지 프롬프트가 없습니다.';
        }
    }

    // API 통계 업데이트
    if (dom.apiStats) {
        const stats = debug.getDebugStats();
        dom.apiStats.textContent = `${stats.session.totalApiCalls}회 호출 | 성공률: ${stats.recent.successRate}% | 평균: ${stats.recent.avgResponseTime}ms`;
    }

    // API 호출 로그 (최근 10개)
    if (dom.apiCallLog) {
        const recentCalls = debug.debugLog.apiCalls.slice(-10).reverse();
        dom.apiCallLog.innerHTML = '';
        recentCalls.forEach(call => {
            const div = document.createElement('div');
            div.className = `p-1 rounded ${call.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`;
            div.textContent = `${call.timestamp.substring(11, 19)} | ${call.type} | ${call.modelName} | ${call.success ? '✅' : '❌'} ${call.duration ? `${call.duration}ms` : ''} ${call.errorMessage || ''}`;
            dom.apiCallLog.appendChild(div);
        });
    }

    // 성능 로그 (최근 10개)
    if (dom.performanceLog) {
        const recentPerf = debug.debugLog.processingTimes.slice(-10).reverse();
        dom.performanceLog.innerHTML = '';
        recentPerf.forEach(perf => {
            const div = document.createElement('div');
            div.className = 'p-1 rounded bg-orange-900/30 text-orange-300';
            div.textContent = `${perf.timestamp.substring(11, 19)} | ${perf.operation} | ${perf.duration}ms`;
            dom.performanceLog.appendChild(div);
        });
    }

    // 에러 로그 (최근 5개)
    if (dom.errorLog) {
        const recentErrors = debug.debugLog.errors.slice(-5).reverse();
        dom.errorLog.innerHTML = '';
        if (recentErrors.length === 0) {
            dom.errorLog.textContent = '에러가 없습니다 ✅';
        } else {
            recentErrors.forEach(error => {
                const div = document.createElement('div');
                div.className = 'p-2 rounded bg-red-900/30 text-red-300 border border-red-700/50';
                div.innerHTML = `<div class="font-bold">${error.timestamp.substring(11, 19)} | ${error.operation}</div>
<div class="text-xs mt-1">${error.message}</div>`;
                dom.errorLog.appendChild(div);
            });
        }
    }

    // 이미지 캐시 업데이트
    if (dom.imageCacheViewer) {
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
                    if (dom.modalImageContent && dom.imageViewerModal) {
                        dom.modalImageContent.src = base64Data;
                        dom.imageViewerModal.classList.remove('hidden');
                    }
                };
                dom.imageCacheViewer.appendChild(link);
            });
        }
    }
}

/**
 * 반응형 이미지 위치 관리 - 작은 화면에서 이미지를 텍스트 영역으로 이동
 */
let mobileImageContainer = null;
let isImageInTextArea = false;

export function handleResponsiveImageLayout() {
    const isMobile = window.innerWidth <= 480;
    const textScrollArea = document.querySelector('#story-screen .flex-\\[2\\] .flex-grow.overflow-y-auto');
    const originalImageContainer = document.querySelector('#story-screen .flex-1:has(#story-illustration)') ||
                                  document.querySelector('#story-screen .flex-1');
    const storyIllustration = dom.illustrationEl;

    if (!textScrollArea || !storyIllustration) return;

    if (isMobile && !isImageInTextArea) {
        // 모바일: 이미지를 텍스트 영역으로 이동
        if (originalImageContainer) {
            originalImageContainer.style.display = 'none';
        }

        // 이미지 컨테이너 생성 (없는 경우)
        if (!mobileImageContainer) {
            mobileImageContainer = document.createElement('div');
            mobileImageContainer.className = 'order-3 flex-shrink-0 relative bg-black overflow-hidden mt-4';
            mobileImageContainer.style.minHeight = '200px';
            mobileImageContainer.style.maxHeight = '300px';

            // 이미지 요소 복제 및 스타일링
            const mobileImage = storyIllustration.cloneNode();
            mobileImage.className = 'w-full h-full object-cover';
            mobileImage.id = 'mobile-story-illustration';

            // 로더도 복제
            const originalLoader = document.getElementById('image-loader');
            if (originalLoader) {
                const mobileLoader = originalLoader.cloneNode(true);
                mobileLoader.id = 'mobile-image-loader';
                mobileImageContainer.appendChild(mobileLoader);
            }

            mobileImageContainer.appendChild(mobileImage);
        }

        // 텍스트 영역에 추가
        textScrollArea.appendChild(mobileImageContainer);

        // 원본 이미지와 모바일 이미지 동기화
        const mobileImage = document.getElementById('mobile-story-illustration');
        if (mobileImage && storyIllustration.src) {
            mobileImage.src = storyIllustration.src;
            mobileImage.style.opacity = storyIllustration.style.opacity;
        }

        isImageInTextArea = true;

    } else if (!isMobile && isImageInTextArea) {
        // 데스크톱: 이미지를 원래 위치로 복원
        if (originalImageContainer) {
            originalImageContainer.style.display = '';
        }

        if (mobileImageContainer && mobileImageContainer.parentNode) {
            mobileImageContainer.parentNode.removeChild(mobileImageContainer);
        }

        isImageInTextArea = false;
    }

    // 모바일에서 이미지 업데이트 시 동기화
    if (isMobile && isImageInTextArea) {
        const mobileImage = document.getElementById('mobile-story-illustration');
        if (mobileImage && storyIllustration.src) {
            mobileImage.src = storyIllustration.src;
            mobileImage.style.opacity = storyIllustration.style.opacity;
        }
    }
}

// 윈도우 리사이즈 이벤트 리스너 추가
window.addEventListener('resize', handleResponsiveImageLayout);
window.addEventListener('load', handleResponsiveImageLayout);
