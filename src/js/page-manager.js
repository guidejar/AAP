// 페이지 관리 모듈
import { EntityParser } from './entity-parser.js';

export const PageManager = {
    pages: [], // 모든 페이지 저장
    currentPageIndex: 0, // 현재 페이지 인덱스
    elements: null,
    chatManager: null,
    apiManager: null,

    init(elements, chatManager, apiManager) {
        this.elements = elements;
        this.chatManager = chatManager;
        this.apiManager = apiManager;

        // 1페이지: 채팅 페이지 (기본)
        this.pages.push({
            id: 1,
            title: '채팅',
            type: 'chat',
            leftContent: null, // 채팅은 실시간이므로 null
            rightContent: null
        });

        // 네비게이션 버튼 이벤트
        elements.prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        elements.nextPageBtn.addEventListener('click', () => this.goToNextPage());
        elements.headerTitle.addEventListener('click', () => {
            console.log('[PageManager] Header title clicked, showing page list');
            this.showPageList();
        });

        // 이벤트 위임: 페이지 목록 클릭 처리 (한 번만 등록)
        const handlePageListClick = (e) => {
            const listItem = e.target.closest('li[data-page-index]');
            if (listItem) {
                const actualPageIndex = parseInt(listItem.getAttribute('data-page-index'), 10);
                console.log('[PageManager] Page list item clicked:', actualPageIndex);
                this.goToPage(actualPageIndex);
                // 오버레이/모달 닫기
                if (window.ContentManager.pinState === 'unpinned') {
                    window.ContentManager.closeAndResetState();
                } else {
                    // pinned 상태면 모달만 닫기
                    elements.contentModal.classList.add('hidden');
                }
            }
        };

        elements.contentModal.addEventListener('click', handlePageListClick);
        elements.overlayPanel.addEventListener('click', handlePageListClick);

        // 이벤트 위임: 선택지 버튼 클릭 처리 (한 번만 등록)
        elements.choiceDisplayArea.addEventListener('click', (e) => {
            const choiceBtn = e.target.closest('button[data-choice]');
            if (choiceBtn) {
                const choice = choiceBtn.getAttribute('data-choice');
                this.handleChoiceClick(choice);
            } else if (e.target.closest('button[data-branch]')) {
                const branchBtn = e.target.closest('button[data-branch]');
                const pageIndex = parseInt(branchBtn.getAttribute('data-branch'), 10);
                this.createBranchFromPage(pageIndex);
            }
        });

        // 초기 페이지 렌더링
        this.renderPage(0);
    },

    // 새 페이지 생성 (LLM 응답 기반)
    createPageFromResponse(response) {
        try {
            // Markdown 코드블록 제거 (```json ... ```)
            let jsonText = response.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const data = JSON.parse(jsonText);
            const newPageIndex = this.pages.length;

            // TRP_render에서 콘텐츠 추출
            const render = data.TRP_render || {};
            const title = render.title || '제목 없음';
            const creative_engaging_scenes = render.creative_engaging_scenes || '';

            // 이스케이프된 줄바꿈 변환
            const rawText = creative_engaging_scenes.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

            // Entity annotation을 HTML로 변환
            const content = EntityParser.toHTML(rawText);

            // Entity 자동 추출 (TRP_mentioned_entities 보완)
            const extractedEntities = EntityParser.parse(rawText);
            if (!data.TRP_mentioned_entities) {
                data.TRP_mentioned_entities = extractedEntities;
            }

            const newPage = {
                id: newPageIndex + 1,
                title: title,
                type: 'content',
                leftContent: {
                    title: title,
                    content: content
                },
                rightContent: null,
                choices: data.TRP_choices || data.TRP_design?.choices || [],
                design: data.TRP_design || null
            };

            this.pages.push(newPage);

            // 디버그 로그의 페이지 번호 업데이트 (마지막 로그들을 새 페이지로)
            if (window.DebugManager) {
                window.DebugManager.updateLastLogsPage(newPageIndex);
            }

            // 데이터베이스 커밋 실행
            if (window.DatabaseParser) {
                const dbResult = window.DatabaseParser.parseAndExecute(response, newPageIndex);
                console.log('DB 커밋 결과:', dbResult);

                // 페이지에 DB 커밋 정보 추가
                newPage.dbCommit = dbResult;
            }

            // ContextManager에 턴 추가 및 정리 (LLM 전송용 - render는 3턴 후 삭제)
            if (window.ContextManager) {
                // 깊은 복사로 페이지 데이터와 분리
                const turnDataCopy = JSON.parse(JSON.stringify(data));
                window.ContextManager.addTurn(turnDataCopy);
                window.ContextManager.cleanOldRenders();
            }

            // 새 페이지로 이동
            this.goToPage(this.pages.length - 1);

            // 열려있는 오버레이들 새로고침
            this.refreshOpenOverlays();

            return newPage;
        } catch (error) {
            console.error('페이지 생성 오류:', error);
            return null;
        }
    },

    // 특정 페이지로 이동
    goToPage(index) {
        if (index < 0 || index >= this.pages.length) return;

        const previousPage = this.currentPageIndex;
        this.currentPageIndex = index;
        this.renderPage(index);

        // 페이지 변경 시 디버그 콘텐츠도 업데이트
        if (previousPage !== index && window.DebugManager) {
            window.DebugManager.refreshDebugContent();
        }
    },

    // 이전 페이지로 이동
    goToPreviousPage() {
        if (this.currentPageIndex > 0) {
            this.goToPage(this.currentPageIndex - 1);
        }
    },

    // 다음 페이지로 이동
    goToNextPage() {
        if (this.currentPageIndex < this.pages.length - 1) {
            this.goToPage(this.currentPageIndex + 1);
        }
    },

    // 페이지 렌더링
    renderPage(index) {
        const page = this.pages[index];
        if (!page) return;

        const { headerTitle, prevPageBtn, nextPageBtn, textDisplayArea, choiceDisplayArea } = this.elements;

        // 헤더 제목 업데이트
        headerTitle.textContent = page.title;

        // 네비게이션 버튼 활성화/비활성화 (1페이지 이하로는 못 가도록)
        prevPageBtn.disabled = index <= 1;
        nextPageBtn.disabled = index === this.pages.length - 1;

        if (page.type === 'chat') {
            // 채팅 페이지: 기존 채팅 UI 유지
            textDisplayArea.style.display = 'block';
            choiceDisplayArea.classList.add('hidden');
        } else if (page.type === 'content') {
            // 콘텐츠 페이지: 왼쪽에 제목+내용, 오른쪽에 이미지(옵션)
            this.renderContentPage(page);
        }

        // 디버그 콘텐츠 새로고침 (현재 페이지로 업데이트)
        if (window.DebugManager) {
            window.DebugManager.refreshDebugContent();
        }

        // 페이지 목록이 열려있으면 다시 렌더링 (하이라이트 업데이트)
        this.refreshPageListIfOpen();
    },

    // 콘텐츠 페이지 렌더링
    renderContentPage(page) {
        const { textDisplayArea, choiceDisplayArea } = this.elements;

        // 텍스트 영역 초기화 및 내용 표시
        textDisplayArea.innerHTML = '';
        textDisplayArea.style.display = 'block';

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('space-y-4');
        contentDiv.innerHTML = `
            <h2 class="text-2xl font-bold" style="color: var(--text-primary);">${this.escapeHtml(page.leftContent.title)}</h2>
            <div class="prose prose-sm max-w-none" style="color: var(--text-primary);">
                <p class="whitespace-pre-wrap">${page.leftContent.content}</p>
            </div>
        `;
        textDisplayArea.appendChild(contentDiv);

        // 선택지 표시
        if (page.choices && page.choices.length > 0) {
            choiceDisplayArea.classList.remove('hidden');
            choiceDisplayArea.innerHTML = '';

            page.choices.forEach((choice, idx) => {
                const button = document.createElement('button');
                button.classList.add('w-full', 'text-left', 'font-medium', 'py-3', 'px-4', 'rounded-lg', 'transition-colors', 'hover:bg-[var(--bg-button-hover)]');
                button.style.backgroundColor = 'var(--bg-button)';
                button.style.color = 'var(--text-primary)';

                // choice가 객체면 label 사용, 문자열이면 그대로 사용
                const label = typeof choice === 'object' ? choice.label : choice;
                button.textContent = `${idx + 1}. ${label}`;

                // 이벤트 리스너는 init()에서 이벤트 위임으로 한 번만 등록됨
                button.setAttribute('data-choice', label);

                choiceDisplayArea.appendChild(button);
            });

            // 분기 생성 버튼 추가 (과거 페이지인 경우에만)
            const isNotLatestPage = this.currentPageIndex < this.pages.length - 1;
            if (isNotLatestPage) {
                const branchButton = document.createElement('button');
                branchButton.classList.add('w-full', 'text-center', 'font-semibold', 'py-3', 'px-4', 'rounded-lg', 'transition-colors', 'hover:bg-[var(--bg-button-hover)]', 'mt-4', 'border-2');
                branchButton.style.backgroundColor = 'transparent';
                branchButton.style.color = 'var(--text-accent)';
                branchButton.style.borderColor = 'var(--text-accent)';
                branchButton.textContent = '🔀 이 시점에서 분기 생성';

                // 이벤트 리스너는 init()에서 이벤트 위임으로 한 번만 등록됨
                branchButton.setAttribute('data-branch', this.currentPageIndex.toString());

                choiceDisplayArea.appendChild(branchButton);
            }
        } else {
            choiceDisplayArea.classList.add('hidden');
        }
    },

    // 선택지 클릭 처리
    async handleChoiceClick(choice) {
        const { autoHeightTextarea } = this.elements;

        // 선택한 내용을 입력창에 넣고 전송
        autoHeightTextarea.value = choice;

        // ChatManager를 통해 메시지 전송
        if (this.chatManager && this.chatManager.handleSendMessage) {
            // 1페이지(채팅)로 이동
            this.goToPage(0);

            // 메시지 전송
            await this.chatManager.handleSendMessage();
        }
    },

    // 특정 페이지에서 분기 생성
    createBranchFromPage(pageIndex) {
        // 확인 대화상자
        const confirmed = confirm(`페이지 ${pageIndex + 1}번 시점으로 되돌아가 새로운 분기를 시작하시겠습니까?\n\n이후의 모든 페이지와 진행 상황이 삭제됩니다.`);

        if (!confirmed) return;

        // 1. Database 스냅샷 복원
        if (window.Database) {
            const result = window.Database.restoreSnapshot(pageIndex);
            if (!result.success) {
                alert('스냅샷 복원에 실패했습니다: ' + result.message);
                return;
            }
            console.log('Database 스냅샷 복원 완료:', pageIndex);
        }

        // 2. ContextManager의 contextWindow 자르기
        if (window.ContextManager && window.ContextManager.contextWindow) {
            // pageIndex는 0(채팅), 1(첫 페이지), 2(두번째 페이지)...
            // contextWindow의 turnIndex도 0부터 시작
            // pageIndex 1 = turnIndex 0, pageIndex 2 = turnIndex 1...
            const targetTurnIndex = pageIndex - 1; // 채팅 페이지(0) 제외
            if (targetTurnIndex >= 0) {
                window.ContextManager.contextWindow = window.ContextManager.contextWindow.slice(0, targetTurnIndex + 1);
                console.log('ContextWindow 자르기 완료:', window.ContextManager.contextWindow.length, '턴');
            } else {
                // 채팅 페이지나 첫 페이지면 contextWindow 비우기
                window.ContextManager.contextWindow = [];
            }
        }

        // 3. 페이지 목록 자르기
        this.pages = this.pages.slice(0, pageIndex + 1);
        console.log('페이지 목록 자르기 완료:', this.pages.length, '페이지');

        // 4. 채팅 페이지로 이동
        this.goToPage(0);

        // 5. 사용자 알림
        alert(`✅ 페이지 ${pageIndex + 1}번 시점으로 되돌렸습니다.\n새로운 선택을 입력해주세요.`);
    },

    // 페이지 목록 표시
    showPageList() {
        console.log('[PageManager] showPageList() called');

        if (!window.ContentManager) {
            console.error('[PageManager] ContentManager not found!');
            return;
        }

        // 동적 페이지 목록 데이터 생성 (1페이지(채팅) 제외, 문자열 배열)
        const pageItems = this.pages
            .filter((page, idx) => idx > 0) // 0번 인덱스(채팅) 제외
            .map((page, idx) => `${idx + 1}. ${page.title}`); // 1부터 시작하는 인덱스

        const pageListData = {
            title: '페이지 목록',
            items: pageItems
        };

        console.log('[PageManager] Calling ContentManager.handleToggleContent with:', pageListData);

        // 기존 pages 오버레이가 열려있으면 강제로 닫고 다시 열기
        if (window.ContentManager.currentOverlayKey === 'pages' || window.ContentManager.pinnedKey === 'pages') {
            console.log('[PageManager] Pages already open, forcing refresh');
            window.ContentManager.hideAllViews();
        }

        // ContentManager를 통해 표시 (오버레이/모달 자동 전환, pin 기능 포함)
        window.ContentManager.showContent(pageListData, 'pages');

        // 페이지 선택 이벤트 등록 (ContentManager가 DOM을 생성한 후)
        setTimeout(() => {
            console.log('[PageManager] Setting up page list event listeners');

            // DOM 요소 캐싱
            const contentModalBody = this.elements.contentModal.querySelector('#content-modal-body');
            const modalItems = contentModalBody ? contentModalBody.querySelectorAll('li') : [];
            const overlayItems = this.elements.overlayPanel.querySelectorAll('li');
            const listItems = [...modalItems, ...overlayItems];

            console.log('[PageManager] Found', listItems.length, 'list items');

            if (listItems.length === 0) {
                console.warn('[PageManager] No list items found! Retrying...');
                // 재시도
                setTimeout(() => {
                    const retryModalBody = this.elements.contentModal.querySelector('#content-modal-body');
                    const retryModalItems = retryModalBody ? retryModalBody.querySelectorAll('li') : [];
                    const retryOverlayItems = this.elements.overlayPanel.querySelectorAll('li');
                    const retryItems = [...retryModalItems, ...retryOverlayItems];
                    console.log('[PageManager] Retry found', retryItems.length, 'items');
                    this.setupPageListItems(retryItems);
                }, 200);
            } else {
                this.setupPageListItems(listItems);
            }
        }, 150);
    },

    // 페이지 목록 아이템 설정 (스타일 및 data 속성만 설정, 이벤트는 위임 사용)
    setupPageListItems(listItems) {
        listItems.forEach((item, displayIdx) => {
            const actualPageIndex = displayIdx + 1; // 채팅 페이지 제외했으므로 +1
            item.setAttribute('data-page-index', actualPageIndex);
            item.classList.add('page-list-item'); // CSS 클래스 추가

            console.log('[PageManager] Setting up item', displayIdx, 'for page', actualPageIndex);

            // CSS 클래스 토글을 사용한 효율적인 스타일 업데이트
            const isActive = actualPageIndex === this.currentPageIndex;
            item.classList.toggle('active', isActive);

            // 현재 페이지를 중앙으로 스크롤
            if (isActive) {
                setTimeout(() => {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }

            // 이벤트 리스너는 init()에서 이벤트 위임으로 한 번만 등록됨
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 페이지 목록이 열려있으면 하이라이트 업데이트
    refreshPageListIfOpen() {
        if (!window.ContentManager) return;

        // 페이지 목록이 현재 열려있는지 확인
        const isPagesOpen = window.ContentManager.currentOverlayKey === 'pages' ||
                           window.ContentManager.pinnedKey === 'pages';

        if (!isPagesOpen) return;

        // DOM 요소 캐싱
        const contentModalBody = this.elements.contentModal.querySelector('#content-modal-body');
        const modalItems = contentModalBody ? contentModalBody.querySelectorAll('li') : [];
        const overlayItems = this.elements.overlayPanel.querySelectorAll('li');
        const listItems = [...modalItems, ...overlayItems];

        // CSS 클래스 토글을 사용한 효율적인 스타일 업데이트
        listItems.forEach((item, displayIdx) => {
            const actualPageIndex = displayIdx + 1; // 채팅 페이지 제외했으므로 +1
            item.classList.toggle('active', actualPageIndex === this.currentPageIndex);
        });
    },

    // 열려있는 오버레이들 새로고침
    refreshOpenOverlays() {
        // DOM 요소 캐싱
        const contextOverlayPanel = this.elements.contextOverlayPanel;
        if (contextOverlayPanel && !contextOverlayPanel.classList.contains('overlay-hidden')) {
            // 컨텍스트 윈도우 내용 다시 렌더링
            const contextData = window.ContextManager.buildDynamicContext();
            const dbEntities = window.Database.current ? window.Database.current.entities : {};
            const entitiesSummary = `Characters: ${Object.keys(dbEntities.characters || {}).length}, Factions: ${Object.keys(dbEntities.factions || {}).length}, Locations: ${Object.keys(dbEntities.locations || {}).length}, Concepts: ${Object.keys(dbEntities.concepts || {}).length}, Threads: ${Object.keys(dbEntities.threads || {}).length}`;

            const windowTurns = window.ContextManager.contextWindow.map(turn => {
                return {
                    turnIndex: turn.turnIndex,
                    hasDesign: !!turn.TRP_design,
                    hasRender: !!turn.TRP_render,
                    mentionedEntities: turn.TRP_mentioned_entities,
                    dbCommands: turn.TRP_db_commands?.length || 0
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

            contextOverlayPanel.innerHTML = contextHtml;

            // 이벤트 리스너는 main.js에서 이벤트 위임으로 한 번만 등록됨
        }

        // 디버그 오버레이 새로고침
        if (window.DebugManager) {
            window.DebugManager.refreshDebugContent();
        }
    }
};
