// 패널 리사이저 관리 모듈
export const PanelResizer = {
    panelCollapseThreshold: 50,

    init(elements, callbacks) {
        this.elements = elements;
        this.callbacks = callbacks;

        const { resizer, leftPanel, rightPanel, mainContainer, resetLayoutBtn, rightPanelContent } = elements;

        resizer.addEventListener('mousedown', (e) => this.mouseDownHandler(e));
        resetLayoutBtn.addEventListener('click', () => this.resetLayout());
    },

    mouseDownHandler(e) {
        const { resizer, leftPanel, rightPanel, mainContainer, rightPanelContent, mobileImagePlaceholder } = this.elements;
        const { updatePlaceholderVisibility, switchToModalView, updateSwitchButtonState, getPinState } = this.callbacks;

        if (resizer.classList.contains('resizer-disabled')) return;
        e.preventDefault();

        if (getPinState() === 'unpinned') {
            mobileImagePlaceholder.classList.add('hidden');
            rightPanelContent.classList.remove('hidden');
        }

        leftPanel.style.transition = 'none';
        rightPanel.style.transition = 'none';
        document.body.classList.add('resizing');
        let x = e.clientX;

        const mouseMoveHandler = (e_move) => {
            const containerWidth = mainContainer.offsetWidth;
            const dx = e_move.clientX - x;
            let newLeftWidth = leftPanel.offsetWidth + dx;
            if (newLeftWidth < 320) newLeftWidth = 320;
            const maxLeftWidth = containerWidth - resizer.offsetWidth;
            if (newLeftWidth > maxLeftWidth) newLeftWidth = maxLeftWidth;
            leftPanel.style.width = `${newLeftWidth}px`;
            rightPanel.style.width = `${containerWidth - newLeftWidth - resizer.offsetWidth}px`;
            x = e_move.clientX;

            if (this.callbacks.shouldSwitchToModal && this.callbacks.shouldSwitchToModal()) {
                switchToModalView();
            }
            if (this.callbacks.isContentModalVisible && this.callbacks.isContentModalVisible()) {
                updateSwitchButtonState();
            }
        };

        const mouseUpHandler = () => {
            document.body.classList.remove('resizing');
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            leftPanel.style.transition = '';
            rightPanel.style.transition = '';

            if (rightPanel.offsetWidth > 0 && rightPanel.offsetWidth < this.panelCollapseThreshold) {
                leftPanel.style.width = '100%';
                rightPanel.style.width = '0%';
                rightPanelContent.classList.add('hidden');
                // 오른쪽 패널이 최소로 줄어들었을 때 mobile-image-placeholder 표시
                mobileImagePlaceholder.classList.remove('hidden');
            } else {
                updatePlaceholderVisibility();
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    },

    resetLayout() {
        const { leftPanel, rightPanel, rightPanelContent } = this.elements;
        leftPanel.style.width = '66.6666%';
        rightPanel.style.width = '33.3333%';
        rightPanelContent.classList.remove('hidden');
        this.callbacks.resetViewPreference();
        this.callbacks.closeAndResetState();
    }
};
