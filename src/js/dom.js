/**
 * 파일명: dom.js
 * 목적: HTML 문서의 주요 DOM 요소에 대한 참조를 관리합니다.
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:06 - 초기 생성: VV3.md에서 DOM 요소 참조 부분 분리
 * 2025-09-17 - 새로운 레이아웃에 맞게 DOM 요소 참조 업데이트
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

// 선택지 컨테이너 (텍스트 영역 하단)
export const choiceContainer = document.getElementById('choice-container');

// 새로운 입력 관련 요소들
export const inputLoader = document.getElementById('input-loader');
export const inputLoaderText = document.getElementById('input-loader-text');
export const inputContainer = document.getElementById('input-container'); // 호환성 유지를 위해
export const pastActionContainer = document.getElementById('past-action-container');
export const pastActionText = document.getElementById('past-action-text');
export const branchBtn = document.getElementById('branch-btn');

// 입력창 관련 요소 (새로운 레이아웃)
export const userInput = document.getElementById('user-input');
export const storyForm = document.getElementById('story-form');
export const sendBtn = document.getElementById('send-btn');

// 툴바 관련 요소
export const toolbarOverlay = document.getElementById('toolbar-overlay');
export const overlayTitle = document.getElementById('overlay-title');
export const overlayContent = document.getElementById('overlay-content');
export const closeOverlay = document.getElementById('close-overlay');

// 툴바 버튼들
export const toolbarBtns = document.querySelectorAll('.toolbar-btn');

// 기존 요소들 (호환성 유지)
export const inputPanel = document.querySelector('.input-section'); // 기존 .input-panel 대신
export const hintPanel = document.getElementById('choice-container'); // 기존 힌트패널 역할을 선택지가 대체

// 디버그 및 오버레이 요소
export const promptOverlay = document.getElementById('prompt-overlay');
export const debugOutputContainer = document.getElementById('debug-output-container');
export const debugInputText = document.getElementById('debug-input-text');
export const debugOutputText = document.getElementById('debug-output-text');
export const assetPipelineViewer = document.getElementById('asset-pipeline-viewer');
export const imageCacheViewer = document.getElementById('image-cache-viewer');

// 설정 관련 요소
export const settingsBtnFloating = document.getElementById('settings-btn-floating');
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