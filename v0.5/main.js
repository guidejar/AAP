// main.js: 각 모듈을 초기화하고 콜백으로 연결하는 '접착제' 역할
import { ThemeManager } from './ui/theme-manager.js';
import { LayoutManager } from './ui/layout/layout-manager.js';
import { PanelController } from './ui/layout/panel-controller.js';
import { ModalManager } from './ui/modals/modal-manager.js';
import { Store } from './core/store.js';
import { GameController } from './engine/game-controller.js';
import { StoryPanel } from './ui/panels/story-panel.js';
import { InputPanel } from './ui/panels/input-panel.js';

// Actual UI functions
function showPage(pageId) {
    const pages = {
        'start-screen': document.getElementById('start-screen'),
        'loading-screen': document.getElementById('loading-screen'),
        'main-game': document.getElementById('main-game'),
        'error-screen': document.getElementById('error-screen')
    };

    // Hide all pages
    Object.values(pages).forEach(page => {
        if (page) page.classList.add('hidden');
    });

    // Show requested page
    const targetPage = pages[pageId];
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
}

function updateLoadingMessage(message) {
    const loadingMessageElement = document.getElementById('loading-message');
    if (loadingMessageElement) {
        loadingMessageElement.textContent = message;
    }
}

function showError(message) {
    const errorMessageElement = document.getElementById('error-message');
    if (errorMessageElement) {
        errorMessageElement.textContent = message;
    }
    showPage('error-screen');
}

let gameControllerInstance; // Declare globally accessible gameController instance
let storyPanelInstance; // Declare globally accessible storyPanel instance
let inputPanelInstance; // Declare globally accessible inputPanel instance

// Game Start Function
async function startGame(genre = "인디아나존스처럼", adventure = "대한제국시대로떨어진한국여자아이돌들") {
    console.log('Starting game...');
    const store = new Store(); // Re-initialize store for new game

    // Set placeholder genre and adventure in store
    store.update('config.genre', genre);
    store.update('config.adventure', adventure);
    store.update('config.apiKey', ''); // Flash only API key

    gameControllerInstance = new GameController(store); // Assign to global instance
    storyPanelInstance = new StoryPanel(store); // Initialize StoryPanel
    inputPanelInstance = new InputPanel(gameControllerInstance); // Initialize InputPanel

    showPage('loading-screen');
    updateLoadingMessage('세계관 설정 중...');

    try {
        await gameControllerInstance.initialize(); 
        // After initialization, render the first scene to the story panel
        storyPanelInstance.renderScene(store.state.game.sceneArchive[store.state.game.currentSceneIndex]);
        showPage('main-game');
    } catch (error) {
        console.error('Error starting game:', error);
        showError('게임 시작 중 오류가 발생했습니다.');
    }
}

// Process Turn Function (전역 접근 가능)
window.processTurn = async function processTurn(userInput) {
    if (!gameControllerInstance) {
        console.error('Game not started. Cannot process turn.');
        showError('게임을 시작해야 턴을 진행할 수 있습니다.');
        return;
    }
    console.log(`Processing turn with input: ${userInput}`);
    inputPanelInstance.disable(); // Disable input during processing
    updateLoadingMessage('스토리 생성 중...'); // Re-using loading message for now

    try {
        await gameControllerInstance.processTurn(userInput);
        // After processing, render the updated scene to the story panel
        storyPanelInstance.renderScene(gameControllerInstance.store.state.game.sceneArchive[gameControllerInstance.store.state.game.currentSceneIndex]);
    } catch (error) {
        console.error('Error processing turn:', error);
        showError('턴 진행 중 오류가 발생했습니다.');
    } finally {
        inputPanelInstance.enable(); // Ensure input is re-enabled
        updateLoadingMessage(''); // Clear loading message
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. 모듈 초기화
    const themeManager = new ThemeManager();
    const layoutManager = new LayoutManager();
    const panelController = new PanelController();
    const modalManager = new ModalManager();

    try {
        themeManager.init();
    } catch (error) {
        console.error('Error initializing ThemeManager:', error);
    }

    try {
        layoutManager.init();
    } catch (error) {
        console.error('Error initializing LayoutManager:', error);
    }

    try {
        panelController.init();
    } catch (error) {
        console.error('Error initializing PanelController:', error);
    }

    // Modal Manager 재활성화
    try {
        modalManager.init();
    } catch (error) {
        console.error('Error initializing ModalManager:', error);
    }

    // 2. 모듈 간 콜백 연결
    
    // PanelController -> 다른 모듈
    panelController.setCallbacks({
        onStateChange: (action, data) => {
            switch (action) {
                case 'showContentModal':
                    modalManager.showContentModal(data);
                    break;
                case 'hideContentModal':
                    modalManager.hideContentModal();
                    break;
                case 'updateResizerState':
                    updateResizerState();
                    break;
                case 'getModalState':
                    return {
                        isContentModalOpen: modalManager.isContentModalOpen(),
                        isSettingsModalOpen: modalManager.isSettingsModalOpen(),
                    };
                case 'getPanelWidths':
                    return layoutManager.getPanelWidths();
            }
        }
    });

    // ModalManager -> 다른 모듈
    modalManager.setCallbacks({
        onStateChange: (action) => {
            switch (action) {
                case 'requestSoftCloseContentModal':
                    panelController.handleModalSoftClose();
                    break;
                case 'requestSwitchToOverlay':
                    panelController.switchToOverlayView();
                    break;
                case 'escKeyPressed':
                    handleEscKey();
                    break;
                case 'updateResizerState':
                    updateResizerState();
                    break;
                case 'getPanelWidths':
                    return layoutManager.getPanelWidths();
            }
        }
    });

    // LayoutManager -> 다른 모듈
    layoutManager.setCallbacks({
        onResizerStateChange: () => updateResizerState(),
        onLayoutResize: (action, data) => {
            if (action === 'getPinState') {
                return panelController.pinState;
            }
            panelController.handleLayoutChange(action, data);
        },
        onPlaceholderUpdate: () => panelController.updatePlaceholderVisibility()
    });

    // 3. 공유 유틸리티 함수
    const updateResizerState = () => {
        const isOverlayActive = panelController.isOverlayOpen() || modalManager.isContentModalOpen() || modalManager.isSettingsModalOpen();
        layoutManager.updateResizerState(isOverlayActive);
    };

    const handleEscKey = () => {
        if (modalManager.isSettingsModalOpen()) {
            modalManager.closeSettingsModal();
        } else if (modalManager.isContentModalOpen()) {
            panelController.handleModalSoftClose();
        } else if (!panelController.handleEscKey()) {
            modalManager.openSettingsModal();
        }
    };

    // Remove direct startGame call for testing purposes
    // startGame('fantasy', 'a new adventure');

    // Connect Start Game Button (T009) - using placeholder values
    const startGameButton = document.getElementById('start-game-button');
    if (startGameButton) {
        startGameButton.addEventListener('click', () => startGame());
    }
});