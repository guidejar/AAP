/**
 * 파일명: dom.js
 * 목적: HTML 문서의 주요 DOM 요소에 대한 참조를 관리합니다.
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:06 - 초기 생성: VV3.md에서 DOM 요소 참조 부분 분리
 * =====================
 */

// 각 ID에 해당하는 HTML 요소를 찾아서 변수에 할당합니다.

// 페이지 로더 요소
export const pageLoader = document.getElementById('page-loader');
export const pageLoaderText = document.getElementById('page-loader-text');

// 화면 요소
export const setupScreen = document.getElementById('setup-screen');
export const storyScreen = document.getElementById('story-screen');

// 버튼 및 입력 요소
export const startBtn = document.getElementById('start-btn');
export const loadBtn = document.getElementById('load-btn');
export const loadInput = document.getElementById('load-input');
export const genreInput = document.getElementById('genre-input');
export const adventureInput = document.getElementById('adventure-input');

// 삽화 관련 요소
export const illustrationEl = document.getElementById('story-illustration');
export const imageLoader = document.getElementById('image-loader');
export const imageLoaderText = document.getElementById('image-loader-text');

// 이야기 표시 요소
export const sceneTitleEl = document.getElementById('scene-title');
export const storyOutputEl = document.getElementById('story-output');

// 네비게이션 버튼
export const prevBtn = document.getElementById('prev-btn');
export const nextBtn = document.getElementById('next-btn');

// 패널 및 컨테이너 요소
export const hintPanel = document.getElementById('hint-panel');
export const choiceContainer = document.getElementById('choice-container');
export const inputLoader = document.getElementById('input-loader');
export const inputLoaderText = document.getElementById('input-loader-text');
export const inputContainer = document.getElementById('input-container');
export const pastActionContainer = document.getElementById('past-action-container');
export const pastActionText = document.getElementById('past-action-text');
export const branchBtn = document.getElementById('branch-btn');

// 입력창 관련 요소
export const inputPanel = document.getElementById('input-container');
export const userInput = document.getElementById('user-input');
export const storyForm = document.getElementById('story-form');
export const sendBtn = document.getElementById('send-btn');

// 디버그 및 오버레이 요소
export const promptOverlay = document.getElementById('prompt-overlay');
export const debugOutputContainer = document.getElementById('debug-output-container');
export const debugInputText = document.getElementById('debug-input-text');
export const debugOutputText = document.getElementById('debug-output-text');
export const assetPipelineViewer = document.getElementById('asset-pipeline-viewer');
export const imageCacheViewer = document.getElementById('image-cache-viewer');

// 강화된 디버그 요소들
export const latestImagePrompt = document.getElementById('latest-image-prompt');
export const apiStats = document.getElementById('api-stats');
export const apiCallLog = document.getElementById('api-call-log');
export const performanceLog = document.getElementById('performance-log');
export const errorLog = document.getElementById('error-log');
export const downloadDebugLogBtn = document.getElementById('download-debug-log-btn');
export const clearDebugLogBtn = document.getElementById('clear-debug-log-btn');
export const refreshDebugViewBtn = document.getElementById('refresh-debug-view-btn');

// 설정 관련 요소
// Floating settings button removed in new layout
// export const settingsBtnFloating = document.getElementById('settings-btn-floating');
export const settingsModal = document.getElementById('settings-modal');
export const closeSettingsBtn = document.getElementById('close-settings-btn');
export const apiKeySetupInput = document.getElementById('api-key-setup-input');
export const apiKeyModalInput = document.getElementById('api-key-modal-input');
export const debugCheckbox = document.getElementById('debug-checkbox');
export const saveBtn = document.getElementById('save-btn');
export const loadModalBtn = document.getElementById('load-modal-btn');

// 툴팁 요소
export const globalTooltip = document.getElementById('global-tooltip');

// 이미지 뷰어 모달 요소
export const imageViewerModal = document.getElementById('image-viewer-modal');
export const modalImageContent = document.getElementById('modal-image-content');
export const closeImageViewerBtn = document.getElementById('close-image-viewer');

// 새로운 요소들 추가
export const mainMenuBtns = document.querySelectorAll('.main-menu-btn');
export const imageArea = document.querySelector('.flex-1') || document.getElementById('illustration-panel');
