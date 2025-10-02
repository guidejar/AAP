// 다이나믹 컨텍스트 윈도우 관리 모듈
export const ContextManager = {
    customContext: '', // 사용자 정의 컨텍스트
    useCustomContext: false, // 커스텀 컨텍스트 사용 여부
    contextWindow: [], // 최근 턴들의 응답 저장

    init() {
        // localStorage에서 커스텀 컨텍스트 불러오기
        const savedContext = localStorage.getItem('custom_context');
        const savedUseCustom = localStorage.getItem('use_custom_context');

        if (savedContext) {
            this.customContext = savedContext;
        }

        if (savedUseCustom !== null) {
            this.useCustomContext = savedUseCustom === 'true';
        }
    },

    setCustomContext(context) {
        this.customContext = context;
        localStorage.setItem('custom_context', context);
    },

    toggleUseCustomContext(enabled) {
        this.useCustomContext = enabled;
        localStorage.setItem('use_custom_context', enabled.toString());
    },

    getCustomContext() {
        return this.customContext;
    },

    isCustomContextEnabled() {
        return this.useCustomContext && this.customContext.trim() !== '';
    },

    // 새 턴 응답 추가
    addTurn(turnData) {
        this.contextWindow.push({
            turnIndex: this.contextWindow.length,
            timestamp: new Date().toISOString(),
            design: turnData.design || null,
            render: turnData.render || null,
            mentioned_entities: turnData.mentioned_entities || {},
            db_commands: turnData.db_commands || []
        });
    },

    // 3턴 이상 지난 응답의 render 삭제
    cleanOldRenders() {
        const currentTurn = this.contextWindow.length - 1;
        this.contextWindow.forEach((turn, idx) => {
            if (currentTurn - idx >= 3) {
                delete turn.render;
            }
        });
    },

    // 직전 턴에서 언급된 entity 관련 정보 수집
    collectRelatedEntityInfo() {
        if (this.contextWindow.length === 0) return {};

        const latestTurn = this.contextWindow[this.contextWindow.length - 1];
        const mentioned = latestTurn.mentioned_entities || {};

        const relatedInfo = {
            characters: {},
            factions: {},
            locations: {},
            concepts: {},
            threads: {}
        };

        // 전체 턴 순회하며 언급된 entity 정보 수집
        this.contextWindow.forEach(turn => {
            if (!turn.design) return;

            // introduced에서 entity 정보 찾기
            const introduced = turn.design.introduced || {};

            if (mentioned.character_ids) {
                mentioned.character_ids.forEach(id => {
                    if (introduced.characters && introduced.characters[id]) {
                        relatedInfo.characters[id] = introduced.characters[id];
                    }
                });
            }

            if (mentioned.faction_ids) {
                mentioned.faction_ids.forEach(id => {
                    if (introduced.factions && introduced.factions[id]) {
                        relatedInfo.factions[id] = introduced.factions[id];
                    }
                });
            }

            if (mentioned.location_ids) {
                mentioned.location_ids.forEach(id => {
                    if (introduced.locations && introduced.locations[id]) {
                        relatedInfo.locations[id] = introduced.locations[id];
                    }
                });
            }

            if (mentioned.concept_ids) {
                mentioned.concept_ids.forEach(id => {
                    if (introduced.concepts && introduced.concepts[id]) {
                        relatedInfo.concepts[id] = introduced.concepts[id];
                    }
                });
            }

            if (mentioned.thread_ids) {
                mentioned.thread_ids.forEach(id => {
                    if (introduced.threads && introduced.threads[id]) {
                        relatedInfo.threads[id] = introduced.threads[id];
                    }
                });
            }
        });

        return relatedInfo;
    },

    // 다이나믹 컨텍스트 윈도우 생성
    buildDynamicContext(currentUserMessage = null) {
        // 1. 시스템 프롬프트
        let systemInstruction = '';
        if (this.isCustomContextEnabled()) {
            systemInstruction = this.customContext;
        } else if (window.DatabaseParser) {
            systemInstruction = window.DatabaseParser.getSystemPrompt();
        }

        // 2. 기본 DB 메타데이터 + 예시
        let dbContext = '';
        if (window.Database && window.Database.current) {
            const db = window.Database.current;

            // db_commands 예시
            const exampleResponse = {
                "render": {
                    "title": "PLACEHOLDER_TITLE",
                    "creative_engaging_scenes": "PLACEHOLDER_CHARACTER_NAME(C001)는 PLACEHOLDER_LOCATION_NAME(L001)에서 PLACEHOLDER_FACTION_NAME(F001)의 비밀을 발견했다."
                },
                "db_commands": [
                    {
                        "target": "entities.characters",
                        "operation": "set",
                        "key": "C001",
                        "value": {"name": "PLACEHOLDER_ENGLISH_NAME", "description": "PLACEHOLDER_DESCRIPTION"}
                    },
                    {
                        "target": "entities.locations",
                        "operation": "set",
                        "key": "L001",
                        "value": {"name": "PLACEHOLDER_ENGLISH_NAME", "description": "PLACEHOLDER_DESCRIPTION"}
                    },
                    {
                        "target": "entities.factions",
                        "operation": "set",
                        "key": "F001",
                        "value": {"name": "PLACEHOLDER_ENGLISH_NAME", "description": "PLACEHOLDER_DESCRIPTION"}
                    },
                    {
                        "target": "terminology.character_names",
                        "operation": "set",
                        "key": "PLACEHOLDER_ENGLISH_NAME",
                        "value": "PLACEHOLDER_한글명"
                    },
                    {
                        "target": "terminology.location_names",
                        "operation": "set",
                        "key": "PLACEHOLDER_ENGLISH_NAME",
                        "value": "PLACEHOLDER_한글명"
                    },
                    {
                        "target": "terminology.faction_names",
                        "operation": "set",
                        "key": "PLACEHOLDER_ENGLISH_NAME",
                        "value": "PLACEHOLDER_한글명"
                    }
                ]
            };

            dbContext = `## Database Metadata

\`\`\`json
{
  "project_meta": ${JSON.stringify(db.project_meta || {}, null, 2)},
  "terminology": ${JSON.stringify(db.terminology || {}, null, 2)},
  "render_policy": ${JSON.stringify(db.render_policy || {}, null, 2)}
}
\`\`\`

## Example Response Format

\`\`\`json
${JSON.stringify(exampleResponse, null, 2)}
\`\`\`

## Context Window (Recent Turns)

`;
        }

        // 3. 최근 턴들 추가 (최신 2-3개)
        const recentTurns = this.contextWindow.slice(-3);
        recentTurns.forEach(turn => {
            dbContext += `### Turn ${turn.turnIndex}\n`;
            if (turn.design) {
                dbContext += `**Design:**\n\`\`\`json\n${JSON.stringify(turn.design, null, 2)}\n\`\`\`\n\n`;
            }
            if (turn.render) {
                dbContext += `**Render:**\n\`\`\`json\n${JSON.stringify(turn.render, null, 2)}\n\`\`\`\n\n`;
            }
        });

        // 4. 직전 턴에서 언급된 entity 관련 정보
        const relatedInfo = this.collectRelatedEntityInfo();
        if (relatedInfo && (
            Object.keys(relatedInfo.characters || {}).length > 0 ||
            Object.keys(relatedInfo.factions || {}).length > 0 ||
            Object.keys(relatedInfo.locations || {}).length > 0 ||
            Object.keys(relatedInfo.concepts || {}).length > 0 ||
            Object.keys(relatedInfo.threads || {}).length > 0)) {
            dbContext += `## Related Entity Information (Collected from Past Turns)\n\n\`\`\`json\n${JSON.stringify(relatedInfo, null, 2)}\n\`\`\`\n\n`;
        }

        // 5. 사용자 입력
        const userContent = currentUserMessage
            ? `${dbContext}\n## User Input\n${currentUserMessage}`
            : dbContext;

        return {
            systemInstruction,
            contents: [{
                role: 'user',
                content: userContent
            }]
        };
    },

    // 레거시 메서드 (호환성)
    injectCustomContext(conversationHistory, currentUserMessage = null) {
        return this.buildDynamicContext(currentUserMessage);
    },

    clearCustomContext() {
        this.customContext = '';
        this.useCustomContext = false;
        localStorage.removeItem('custom_context');
        localStorage.removeItem('use_custom_context');
    }
};
