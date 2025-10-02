// 모달 관리 모듈
export const ModalManager = {
    init(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;

        const { settingsBtn, closeModalBtn, settingsModal, closeContentModalBtn, contentModal, switchToOverlayBtn } = elements;

        settingsBtn.addEventListener('click', () => this.openSettingsModal());
        closeModalBtn.addEventListener('click', () => this.closeSettingsModal());
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) this.closeSettingsModal();
        });

        closeContentModalBtn.addEventListener('click', () => this.callbacks.closeContentModalOnly());
        contentModal.addEventListener('click', (event) => {
            if (event.target === contentModal) this.callbacks.closeContentModalOnly();
        });

        switchToOverlayBtn.addEventListener('click', () => this.callbacks.switchToOverlayView());

        // ESC 키 이벤트
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    },

    openSettingsModal() {
        const { settingsModal } = this.elements;
        settingsModal.classList.remove('hidden');
        this.callbacks.updateResizerState();
    },

    closeSettingsModal() {
        const { settingsModal } = this.elements;
        settingsModal.classList.add('hidden');
        this.callbacks.updateResizerState();
    },

    handleEscapeKey() {
        const { settingsModal, contentModal, overlayPanel } = this.elements;

        if (!settingsModal.classList.contains('hidden')) {
            this.closeSettingsModal();
        } else if (!contentModal.classList.contains('hidden')) {
            this.callbacks.closeContentModalOnly();
        } else if (!overlayPanel.classList.contains('overlay-hidden') && this.callbacks.getPinState() === 'unpinned') {
            this.callbacks.closeAndResetState();
        } else {
            this.openSettingsModal();
        }
    }
};
