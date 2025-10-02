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
        elements.headerTitle.addEventListener('click', () => this.showPageList());

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

            // render에서 콘텐츠 추출
            const render = data.render || {};
            const title = render.title || '제목 없음';
            const creative_engaging_scenes = render.creative_engaging_scenes || '';

            // 이스케이프된 줄바꿈 변환
            const rawText = creative_engaging_scenes.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

            // Entity annotation을 HTML로 변환
            const content = EntityParser.toHTML(rawText);

            // Entity 자동 추출 (mentioned_entities 보완)
            const extractedEntities = EntityParser.parse(rawText);
            if (!data.mentioned_entities) {
                data.mentioned_entities = extractedEntities;
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
                choices: data.choices || data.design?.choices || [],
                design: data.design || null
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

        // 헤더 제목 업데이트
        this.elements.headerTitle.textContent = page.title;

        // 네비게이션 버튼 활성화/비활성화
        this.elements.prevPageBtn.disabled = index === 0;
        this.elements.nextPageBtn.disabled = index === this.pages.length - 1;

        if (page.type === 'chat') {
            // 채팅 페이지: 기존 채팅 UI 유지
            this.elements.textDisplayArea.style.display = 'block';
            this.elements.choiceDisplayArea.classList.add('hidden');
        } else if (page.type === 'content') {
            // 콘텐츠 페이지: 왼쪽에 제목+내용, 오른쪽에 이미지(옵션)
            this.renderContentPage(page);
        }

        // 디버그 콘텐츠 새로고침 (현재 페이지로 업데이트)
        if (window.DebugManager) {
            window.DebugManager.refreshDebugContent();
        }
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

                button.addEventListener('click', () => this.handleChoiceClick(label));

                choiceDisplayArea.appendChild(button);
            });
        } else {
            choiceDisplayArea.classList.add('hidden');
        }
    },

    // 선택지 클릭 처리
    async handleChoiceClick(choice) {
        // 선택한 내용을 입력창에 넣고 전송
        this.elements.autoHeightTextarea.value = choice;

        // ChatManager를 통해 메시지 전송
        if (this.chatManager && this.chatManager.handleSendMessage) {
            // 1페이지(채팅)로 이동
            this.goToPage(0);

            // 메시지 전송
            await this.chatManager.handleSendMessage();
        }
    },

    // 페이지 목록 표시
    showPageList() {
        const listHtml = this.pages.map((page, idx) => {
            const isCurrent = idx === this.currentPageIndex;
            return `
                <li>
                    <button
                        data-page-index="${idx}"
                        class="w-full text-left font-medium py-3 px-4 rounded-lg transition-colors hover:bg-[var(--bg-button-hover)] ${isCurrent ? 'bg-[var(--text-accent)] text-white' : ''}"
                        style="${!isCurrent ? 'background-color: var(--bg-button); color: var(--text-primary);' : ''}"
                    >
                        ${page.id}. ${page.title}
                    </button>
                </li>
            `;
        }).join('');

        // 모달에 페이지 목록 표시
        const modalBody = this.elements.contentModal.querySelector('#content-modal-body');
        const modalTitle = this.elements.contentModal.querySelector('#content-modal-title');

        modalTitle.textContent = '페이지 목록';
        modalBody.innerHTML = `<ul class="space-y-2">${listHtml}</ul>`;

        // 페이지 선택 이벤트
        modalBody.querySelectorAll('[data-page-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.pageIndex);
                this.goToPage(index);
                this.elements.contentModal.classList.add('hidden');
            });
        });

        // 모달 표시
        this.elements.contentModal.classList.remove('hidden');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
