/**
 * 파일명: dom.js
 * 목적: HTML 문서의 주요 DOM 요소에 대한 참조를 관리합니다.
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 - 초기 생성
 * 2025-09-17 - v4 레이아웃 리팩토링에 따라 DOM 요소 참조 전면 개편
 * =====================
 */

// --- Global & Setup ---
export const pageLoader = document.getElementById('page-loader');
export const pageLoaderText = document.getElementById('page-loader-text');
export const setupScreen = document.getElementById('setup-screen');
export const storyScreen = document.getElementById('story-screen');
export const globalTooltip = document.getElementById('global-tooltip');

// --- Setup Screen ---
export const startBtn = document.getElementById('start-btn');
export const loadBtn = document.getElementById('load-btn');
export const loadInput = document.getElementById('load-input');
export const genreInput = document.getElementById('genre-input');
export const adventureInput = document.getElementById('adventure-input');
export const apiKeySetupInput = document.getElementById('api-key-setup-input');

// --- Story Screen ---
// Layout Areas
export const imageArea = document.querySelector('.image-area');

// Text Area
export const sceneTitleEl = document.getElementById('scene-title');
export const storyOutputEl = document.getElementById('story-output');
export const prevBtn = document.getElementById('prev-btn');
export const nextBtn = document.getElementById('next-btn');
export const choiceContainer = document.getElementById('choice-container');

// Image Area
export const illustrationEl = document.getElementById('story-illustration');
export const imageLoader = document.getElementById('image-loader');
export const imageLoaderText = document.getElementById('image-loader-text');

// Input Section
export const inputSection = document.querySelector('.input-section');
export const inputLoader = document.getElementById('input-loader');
export const inputLoaderText = document.getElementById('input-loader-text');
export const storyForm = document.getElementById('story-form');
export const userInput = document.getElementById('user-input');
export const sendBtn = document.getElementById('send-btn');

// Toolbar
export const toolbarBtns = document.querySelectorAll('.toolbar-btn');

// --- Modals & Overlays ---
// Settings Modal
export const settingsModal = document.getElementById('settings-modal');
export const closeSettingsBtn = document.getElementById('close-settings-btn');
export const apiKeyModalInput = document.getElementById('api-key-modal-input');
export const debugCheckbox = document.getElementById('debug-checkbox');
export const saveBtn = document.getElementById('save-btn');
export const loadModalBtn = document.getElementById('load-modal-btn');

// Image Viewer Modal
export const imageViewerModal = document.getElementById('image-viewer-modal');
export const modalImageContent = document.getElementById('modal-image-content');
export const closeImageViewerBtn = document.getElementById('close-image-viewer');

// --- Debug ---
export const debugOutputContainer = document.getElementById('debug-output-container');
export const debugInputText = document.getElementById('debug-input-text');
export const debugOutputText = document.getElementById('debug-output-text');
export const assetPipelineViewer = document.getElementById('asset-pipeline-viewer');
export const imageCacheViewer = document.getElementById('image-cache-viewer');
