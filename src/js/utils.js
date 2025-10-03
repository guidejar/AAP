// 유틸리티 함수 모듈
export const Utils = {
    init(elements, getters) {
        this.elements = elements;
        this.getters = getters;
    },

    updateResizerState() {
        const { resizer, overlayPanel, contentModal, settingsModal } = this.elements;
        const isOverlayActive = !overlayPanel.classList.contains('overlay-hidden') ||
                                !contentModal.classList.contains('hidden') ||
                                !settingsModal.classList.contains('hidden');
        resizer.classList.toggle('resizer-disabled', isOverlayActive);
    },

    updatePlaceholderVisibility() {
        const { overlayPanel, mobileImagePlaceholder, rightPanel, rightPanelContent } = this.elements;

        // 1. 오른쪽 패널이 닫혀있으면 플레이스홀더 표시
        const isRightPanelClosed = rightPanel.offsetWidth === 0 || rightPanelContent.classList.contains('hidden');

        // 2. 또는 오버레이가 pinned 상태로 표시중이면 플레이스홀더 표시
        const isPinnedOverlayVisible = !overlayPanel.classList.contains('overlay-hidden') &&
                                      this.getters.getPinState() !== 'unpinned';

        const shouldShowPlaceholder = isRightPanelClosed || isPinnedOverlayVisible;
        mobileImagePlaceholder.classList.toggle('hidden', !shouldShowPlaceholder);
    },

    updateSwitchButtonState() {
        const { switchToOverlayBtn, mainContainer, rightPanel } = this.elements;
        const panelWidthThreshold = 300;

        if (mainContainer.offsetWidth < 768) {
            switchToOverlayBtn.classList.add('hidden');
            return;
        }
        switchToOverlayBtn.classList.remove('hidden');
        switchToOverlayBtn.classList.toggle('btn-disabled', rightPanel.offsetWidth < panelWidthThreshold);
        switchToOverlayBtn.setAttribute('data-tooltip',
            rightPanel.offsetWidth >= panelWidthThreshold ? '패널로 보기' : '패널 너비가 부족하여 전환할 수 없습니다.');
    }
};
