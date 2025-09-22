// 레이아웃 관리 모듈 - 두 번째 분리 모듈
export class LayoutManager {
    constructor() {
        this.mainContainer = null;
        this.resizer = null;
        this.leftPanel = null;
        this.rightPanel = null;
        this.resetLayoutBtn = null;
        this.rightPanelContent = null;
        this.mobileImagePlaceholder = null;
        this.panelCollapseThreshold = 50;

        // 콜백 함수들 (다른 모듈과 통신용)
        this.onResizerStateChange = null;
        this.onLayoutResize = null;
        this.onPlaceholderUpdate = null;
    }

    init() {
        this.mainContainer = document.getElementById('main-container');
        this.resizer = document.getElementById('resizer');
        this.leftPanel = document.getElementById('left-panel');
        this.rightPanel = document.getElementById('right-panel');
        this.resetLayoutBtn = document.getElementById('reset-layout-btn');
        this.rightPanelContent = document.getElementById('right-panel-content');
        this.mobileImagePlaceholder = document.getElementById('mobile-image-placeholder');

        if (this.resizer) {
            this.resizer.addEventListener('mousedown', (e) => this.mouseDownHandler(e));
        }

        if (this.resetLayoutBtn) {
            this.resetLayoutBtn.addEventListener('click', () => this.resetLayout());
        }
    }

    // 콜백 함수 설정
    setCallbacks(callbacks) {
        this.onResizerStateChange = callbacks.onResizerStateChange;
        this.onLayoutResize = callbacks.onLayoutResize;
        this.onPlaceholderUpdate = callbacks.onPlaceholderUpdate;
    }

    mouseDownHandler(e) {
        if (this.resizer.classList.contains('resizer-disabled')) return;
        e.preventDefault();

        // 핀 상태 확인을 위한 콜백 호출
        if (this.onLayoutResize) {
            const pinState = this.onLayoutResize('getPinState');
            if (pinState === 'unpinned') {
                this.mobileImagePlaceholder.classList.add('hidden');
                this.rightPanelContent.classList.remove('hidden');
            }
        }

        this.leftPanel.style.transition = 'none';
        this.rightPanel.style.transition = 'none';
        document.body.classList.add('resizing');

        let x = e.clientX;

        const mouseMoveHandler = (e_move) => {
            const containerWidth = this.mainContainer.offsetWidth;
            const dx = e_move.clientX - x;
            let newLeftWidth = this.leftPanel.offsetWidth + dx;

            if (newLeftWidth < 320) newLeftWidth = 320;
            const maxLeftWidth = containerWidth - this.resizer.offsetWidth;
            if (newLeftWidth > maxLeftWidth) newLeftWidth = maxLeftWidth;

            this.leftPanel.style.width = `${newLeftWidth}px`;
            this.rightPanel.style.width = `${containerWidth - newLeftWidth - this.resizer.offsetWidth}px`;
            x = e_move.clientX;

            // 레이아웃 변경 알림
            if (this.onLayoutResize) {
                this.onLayoutResize('resize', {
                    rightWidth: this.rightPanel.offsetWidth,
                    containerWidth: containerWidth
                });
            }
        };

        const mouseUpHandler = () => {
            document.body.classList.remove('resizing');
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            this.leftPanel.style.transition = '';
            this.rightPanel.style.transition = '';

            if (this.rightPanel.offsetWidth > 0 && this.rightPanel.offsetWidth < this.panelCollapseThreshold) {
                this.leftPanel.style.width = '100%';
                this.rightPanel.style.width = '0%';
                this.rightPanelContent.classList.add('hidden');

                // 플레이스홀더 업데이트 알림
                if (this.onPlaceholderUpdate) {
                    this.onPlaceholderUpdate();
                }
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    resetLayout() {
        this.leftPanel.style.width = '66.6666%';
        this.rightPanel.style.width = '33.3333%';
        this.rightPanelContent.classList.remove('hidden');

        // 레이아웃 리셋 알림
        if (this.onLayoutResize) {
            this.onLayoutResize('reset');
        }
    }

    // 외부에서 리사이저 상태 업데이트
    updateResizerState(isDisabled) {
        if (this.resizer) {
            this.resizer.classList.toggle('resizer-disabled', isDisabled);
        }
    }

    // 패널 너비 정보 제공
    getPanelWidths() {
        return {
            left: this.leftPanel ? this.leftPanel.offsetWidth : 0,
            right: this.rightPanel ? this.rightPanel.offsetWidth : 0,
            container: this.mainContainer ? this.mainContainer.offsetWidth : 0
        };
    }
}