// 메인 애플리케이션
import { ThemeManager } from './theme.js';
import { PanelResizer } from './resizer.js';
import { ContentManager } from './content.js';
import { ModalManager } from './modal.js';
import { Utils } from './utils.js';
import { APIManager } from './api.js';
import { ChatManager } from './chat.js';
import { PageManager } from './page-manager.js';
import { ContextManager } from './context-manager.js';
import { DebugManager } from './debug-manager.js';
import { SaveLoadManager } from './save-load-manager.js';
import { Database } from './database.js';
import { DatabaseParser } from './database-parser.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 수집
    const elements = {
        mainContainer: document.getElementById('main-container'),
        resizer: document.getElementById('resizer'),
        leftPanel: document.getElementById('left-panel'),
        rightPanel: document.getElementById('right-panel'),
        resetLayoutBtn: document.getElementById('reset-layout-btn'),
        overlayPanel: document.getElementById('overlay-panel'),
        contextOverlayPanel: document.getElementById('context-overlay-panel'),
        contextWindowBtn: document.getElementById('context-window-btn'),
        contentModal: document.getElementById('content-modal'),
        settingsModal: document.getElementById('settings-modal'),
        settingsBtn: document.getElementById('settings-btn'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        switchToOverlayBtn: document.getElementById('switch-to-overlay-btn'),
        closeContentModalBtn: document.getElementById('close-content-modal-btn'),
        rightPanelContent: document.getElementById('right-panel-content'),
        mobileImagePlaceholder: document.getElementById('mobile-image-placeholder'),
        // 채팅 관련 요소
        sendBtn: document.getElementById('send-btn'),
        autoHeightTextarea: document.getElementById('autoHeightTextarea'),
        textDisplayArea: document.getElementById('text-display-area'),
        choiceDisplayArea: document.getElementById('choice-display-area'),
        // 페이지 네비게이션 요소
        prevPageBtn: document.getElementById('prev-page-btn'),
        nextPageBtn: document.getElementById('next-page-btn'),
        headerTitle: document.getElementById('header-title'),
        // 디버그 요소
        debugToggle: document.getElementById('debug-toggle'),
        debugBtn: document.getElementById('debug-btn'),
        debugModal: document.getElementById('debug-modal'),
        debugModalTitle: document.getElementById('debug-modal-title'),
        debugModalBody: document.getElementById('debug-modal-body'),
        closeDebugModalBtn: document.getElementById('close-debug-modal-btn'),
        switchDebugToOverlayBtn: document.getElementById('switch-debug-to-overlay-btn'),
        // 세이브/로드 요소
        saveBtn: document.getElementById('save-btn'),
        loadBtn: document.getElementById('load-btn')
    };

    // 테마 매니저 초기화
    ThemeManager.init();

    // 유틸리티 초기화
    const getters = {
        getPinState: () => ContentManager.pinState
    };
    Utils.init(elements, getters);

    // 콘텐츠 매니저 콜백 정의
    const contentCallbacks = {
        updateResizerState: () => Utils.updateResizerState(),
        updatePlaceholderVisibility: () => Utils.updatePlaceholderVisibility(),
        updateSwitchButtonState: () => Utils.updateSwitchButtonState()
    };

    // 콘텐츠 매니저 초기화
    ContentManager.init(elements, contentCallbacks);

    // 패널 리사이저 콜백 정의
    const resizerCallbacks = {
        updatePlaceholderVisibility: () => Utils.updatePlaceholderVisibility(),
        switchToModalView: () => ContentManager.switchToModalView(),
        updateSwitchButtonState: () => Utils.updateSwitchButtonState(),
        getPinState: () => ContentManager.pinState,
        resetViewPreference: () => { ContentManager.viewModePreference = 'auto'; },
        closeAndResetState: () => ContentManager.closeAndResetState(),
        shouldSwitchToModal: () => {
            return !elements.overlayPanel.classList.contains('overlay-hidden') &&
                   elements.rightPanel.offsetWidth < ContentManager.panelWidthThreshold &&
                   ContentManager.viewModePreference === 'auto';
        },
        isContentModalVisible: () => !elements.contentModal.classList.contains('hidden')
    };

    // 패널 리사이저 초기화
    PanelResizer.init(elements, resizerCallbacks);

    // 모달 매니저 콜백 정의
    const modalCallbacks = {
        updateResizerState: () => Utils.updateResizerState(),
        closeContentModalOnly: () => ContentManager.closeContentModalOnly(),
        switchToOverlayView: () => ContentManager.switchToOverlayView(),
        getPinState: () => ContentManager.pinState,
        closeAndResetState: () => ContentManager.closeAndResetState()
    };

    // 모달 매니저 초기화
    ModalManager.init(elements, modalCallbacks);

    // 데이터베이스 초기화
    Database.init();
    DatabaseParser.init(Database);

    // 컨텍스트 매니저 초기화
    ContextManager.init();

    // API 매니저 초기화 (ContextManager 참조 전달)
    APIManager.init(ContextManager);

    // 채팅 매니저 초기화
    ChatManager.init(elements, APIManager);

    // 페이지 매니저 초기화
    PageManager.init(elements, ChatManager, APIManager);

    // 디버그 매니저 콜백 정의
    const debugCallbacks = {
        updateResizerState: () => Utils.updateResizerState(),
        closeAndResetState: () => ContentManager.closeAndResetState(),
        shouldSwitchToModal: () => {
            return !elements.overlayPanel.classList.contains('overlay-hidden') &&
                   elements.rightPanel.offsetWidth < ContentManager.panelWidthThreshold &&
                   ContentManager.viewModePreference === 'auto';
        },
        isContentModalVisible: () => !elements.debugModal.classList.contains('hidden')
    };

    // 디버그 매니저 초기화
    DebugManager.init(elements, debugCallbacks);

    // 세이브/로드 매니저 초기화
    SaveLoadManager.init(elements);

    // 컨텍스트 윈도우 버튼 이벤트
    elements.contextWindowBtn.addEventListener('click', () => {
        // 다른 오버레이 닫기
        if (!elements.overlayPanel.classList.contains('overlay-hidden')) {
            elements.overlayPanel.classList.add('overlay-hidden');
        }

        // 디버그 모달 닫기
        if (!elements.debugModal.classList.contains('hidden')) {
            elements.debugModal.classList.add('hidden');
        }

        // 컨텍스트 오버레이 토글
        const isHidden = elements.contextOverlayPanel.classList.contains('overlay-hidden');

        if (isHidden) {
            // 컨텍스트 윈도우 내용 렌더링
            const contextData = ContextManager.buildDynamicContext();

            // DB entities 정보
            const dbEntities = Database.current ? Database.current.entities : {};
            const entitiesSummary = `Characters: ${Object.keys(dbEntities.characters || {}).length}, Factions: ${Object.keys(dbEntities.factions || {}).length}, Locations: ${Object.keys(dbEntities.locations || {}).length}, Concepts: ${Object.keys(dbEntities.concepts || {}).length}, Threads: ${Object.keys(dbEntities.threads || {}).length}`;

            // contextWindow 정보
            const windowTurns = ContextManager.contextWindow.map(turn => {
                return {
                    turnIndex: turn.turnIndex,
                    hasDesign: !!turn.design,
                    hasRender: !!turn.render,
                    mentionedEntities: turn.mentioned_entities,
                    dbCommands: turn.db_commands?.length || 0
                };
            });

            const contextHtml = `
                <div class="flex flex-col h-full">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold" style="color: var(--text-primary);">Context Window</h2>
                        <button id="close-context-overlay-btn" class="p-2 rounded-full hover:bg-[var(--bg-button-hover)] transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-y-auto">
                        <div class="space-y-4">
                            <div>
                                <h3 class="font-semibold mb-2" style="color: var(--text-primary);">DB Entities Summary</h3>
                                <pre class="p-4 rounded-lg overflow-x-auto text-xs" style="background-color: var(--bg-button); color: var(--text-primary);">${entitiesSummary}</pre>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2" style="color: var(--text-primary);">DB Entities (Full)</h3>
                                <pre class="p-4 rounded-lg overflow-x-auto text-xs" style="background-color: var(--bg-button); color: var(--text-primary);">${JSON.stringify(dbEntities, null, 2)}</pre>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2" style="color: var(--text-primary);">Context Window Turns</h3>
                                <pre class="p-4 rounded-lg overflow-x-auto text-xs" style="background-color: var(--bg-button); color: var(--text-primary);">${JSON.stringify(windowTurns, null, 2)}</pre>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2" style="color: var(--text-primary);">System Instruction</h3>
                                <pre class="p-4 rounded-lg overflow-x-auto text-xs" style="background-color: var(--bg-button); color: var(--text-primary);">${contextData.systemInstruction || 'N/A'}</pre>
                            </div>
                            <div>
                                <h3 class="font-semibold mb-2" style="color: var(--text-primary);">User Content (Sent to LLM)</h3>
                                <pre class="p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap" style="background-color: var(--bg-button); color: var(--text-primary);">${contextData.contents[0]?.content || 'N/A'}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            elements.contextOverlayPanel.innerHTML = contextHtml;
            elements.contextOverlayPanel.classList.remove('overlay-hidden');
            elements.contextOverlayPanel.style.display = 'flex';

            // 닫기 버튼 이벤트
            document.getElementById('close-context-overlay-btn').addEventListener('click', () => {
                elements.contextOverlayPanel.classList.add('overlay-hidden');
            });
        } else {
            elements.contextOverlayPanel.classList.add('overlay-hidden');
        }
    });

    // 전역으로 노출
    window.PageManager = PageManager;
    window.ContextManager = ContextManager;
    window.DebugManager = DebugManager;
    window.ChatManager = ChatManager;
    window.APIManager = APIManager;
    window.Database = Database;
    window.DatabaseParser = DatabaseParser;
});
