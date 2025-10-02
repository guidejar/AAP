// 데이터베이스 명령어 파서 (LLM 응답 → DB 커밋)
export const DatabaseParser = {
    database: null,

    init(database) {
        this.database = database;
    },

    // LLM 응답에서 DB 명령어 추출 및 실행
    parseAndExecute(llmResponse, pageIndex) {
        try {
            // JSON 응답 파싱
            const data = JSON.parse(llmResponse);

            // 1. design 자동으로 chapters[] 배열에 추가
            if (data.design) {
                const chapterNumber = this.database.current.chapters.length + 1;
                const chapterEntry = {
                    chapter_number: chapterNumber,
                    arc_id: data.design.arc_id || `arc_01`,
                    metadata: {
                        generation_id: crypto.randomUUID(),
                        parent_generation_id: chapterNumber > 1 ? this.database.current.chapters[chapterNumber - 2]?.metadata?.generation_id : null,
                        model: "gemini-2.5-pro",
                        timestamp: new Date().toISOString()
                    },
                    summary: data.design.summary,
                    scenes: data.design.scenes || [],
                    threads: data.design.threads || {},
                    introduced: data.design.introduced || {}
                };

                this.database.current.chapters.push(chapterEntry);
                this.database.current.project_meta.current_chapter = chapterNumber;
                console.log(`챕터 ${chapterNumber} 추가됨`);
            }

            // 2. db_commands 파싱 → DB 업데이트
            if (data.db_commands && Array.isArray(data.db_commands)) {
                for (const cmd of data.db_commands) {
                    this.executeDbUpdate(cmd);
                }
            }

            // 스냅샷 생성
            const snapshot = this.database.createSnapshot(
                pageIndex,
                `snapshot_${Date.now()}`,
                data.render?.title || `페이지 ${pageIndex + 1}`
            );

            return {
                success: true,
                snapshot,
                chapterAdded: !!data.design,
                dbCommandsExecuted: data.db_commands?.length || 0
            };
        } catch (error) {
            console.error('DB 파싱 오류:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // entity_changes를 기존 command 형식으로 변환 (나중에 구현)
    convertEntityChangesToCommands(entityChanges) {
        // TODO: 나중에 구현
        // 예시: {entity_type: "character", entity_id: "C001", field: "stats.hp", value: -20, operation: "add"}
        //   → {action: "UPDATE_STAT", target: "character", params: {...}}
        console.log('entity_changes 파싱 (미구현):', entityChanges);
        return [];
    },

    // db_commands 실행 (Chimera entities 구조)
    executeDbUpdate(update) {
        const { target, key, value, operation } = update;

        // 번역 사전
        if (target === 'terminology.character_names') {
            this.database.current.terminology.character_names[key] = value;
            console.log(`인명 번역 추가: ${key} → ${value}`);
        }
        else if (target === 'terminology.location_names') {
            this.database.current.terminology.location_names[key] = value;
            console.log(`장소 번역 추가: ${key} → ${value}`);
        }
        else if (target === 'terminology.faction_names') {
            this.database.current.terminology.faction_names[key] = value;
            console.log(`팩션 번역 추가: ${key} → ${value}`);
        }
        else if (target === 'terminology.special_phrases') {
            this.database.current.terminology.special_phrases[key] = value;
            console.log(`용어 추가: ${key} → ${value}`);
        }
        // 엔티티 추가/수정
        else if (target === 'entities.characters') {
            const charData = typeof value === 'string'
                ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : {name: value})
                : value;
            const entityKey = key || charData.id || charData.character_id;

            if (!entityKey || entityKey === 'undefined') {
                console.error('캐릭터 키 누락:', charData);
                return;
            }

            // id 필드 제거 (키로 사용하므로 중복)
            delete charData.id;
            delete charData.character_id;

            this.database.current.entities.characters[entityKey] = charData;
            console.log(`캐릭터 ${entityKey} 추가/수정됨`);

            // 플레이스홀더 정리
            this.database.cleanPlaceholders();
        }
        else if (target === 'entities.factions') {
            const factionData = typeof value === 'string'
                ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : {name: value})
                : value;
            const entityKey = key || factionData.id || factionData.faction_id;

            if (!entityKey || entityKey === 'undefined') {
                console.error('세력 키 누락:', factionData);
                return;
            }

            delete factionData.id;
            delete factionData.faction_id;

            this.database.current.entities.factions[entityKey] = factionData;
            console.log(`세력 ${entityKey} 추가/수정됨`);

            // 플레이스홀더 정리
            this.database.cleanPlaceholders();
        }
        else if (target === 'entities.locations') {
            const locationData = typeof value === 'string'
                ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : {name: value})
                : value;
            const entityKey = key || locationData.id || locationData.location_id;

            if (!entityKey || entityKey === 'undefined') {
                console.error('위치 키 누락:', locationData);
                return;
            }

            delete locationData.id;
            delete locationData.location_id;

            this.database.current.entities.locations[entityKey] = locationData;
            console.log(`위치 ${entityKey} 추가/수정됨`);

            // 플레이스홀더 정리
            this.database.cleanPlaceholders();
        }
        else if (target === 'entities.concepts') {
            const conceptData = typeof value === 'string'
                ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : {name: value})
                : value;
            const entityKey = key || conceptData.id || conceptData.concept_id;

            if (!entityKey || entityKey === 'undefined') {
                console.error('개념 키 누락:', conceptData);
                return;
            }

            delete conceptData.id;
            delete conceptData.concept_id;

            this.database.current.entities.concepts[entityKey] = conceptData;
            console.log(`개념 ${entityKey} 추가/수정됨`);

            // 플레이스홀더 정리
            this.database.cleanPlaceholders();
        }
        else if (target === 'entities.threads') {
            const threadData = typeof value === 'string'
                ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : {name: value})
                : value;
            const entityKey = key || threadData.id || threadData.thread_id;

            if (!entityKey || entityKey === 'undefined') {
                console.error('스레드 키 누락:', threadData);
                return;
            }

            delete threadData.id;
            delete threadData.thread_id;

            this.database.current.entities.threads[entityKey] = threadData;
            console.log(`스레드 ${entityKey} 추가/수정됨`);

            // 플레이스홀더 정리
            this.database.cleanPlaceholders();
        }
        else {
            console.warn('알 수 없는 DB 업데이트 target:', target);
        }
    },

    // 현재 DB 상태를 JSON으로 반환 (Chimera Single-File)
    getDatabaseContext() {
        const dbState = {
            project_meta: this.database.current.project_meta,
            entities: this.database.current.entities,
            chapters: this.database.current.chapters,
            terminology: this.database.current.terminology,
            render_policy: this.database.current.render_policy
        };

        return `## Chimera Database (Single-File)

\`\`\`json
${JSON.stringify(dbState, null, 2)}
\`\`\``;
    },

    // 시스템 프롬프트 (Chimera 워크플로우)
    getSystemPrompt() {
        return `You are a narrative AI system following Chimera Single-File Database workflow.

**Step 1: design (Structured Design)**
- MUST be written entirely in English
- Reference chapters[] for continuity
- Structure: summary (one_line, narrative, character_developments, world_building)
- scenes[]: scene_id, sequence, location_id, pov_character_id, description, mood, plot_developments[]
- threads.active[]: thread_id, progress_percent
- introduced: new character_ids, faction_ids, location_ids, concept_ids
- design automatically added to chapters[]

**Step 2: render (Localized Output)**
- CHECK render_policy.RENDER_OUTPUT_LANGUAGE_MUST_BE: MUST write in KOREAN language ONLY
- Transform design into creative, engaging narrative in KOREAN
- Use terminology dictionaries for translation: character_names, location_names, faction_names
- Output: title (KOREAN), creative_engaging_scenes (KOREAN)

**Step 3: db_commands (Entity/Terminology Updates)**
- New entity: {"target": "entities.characters", "operation": "set", "key": "C001", "value": {"name": "...", "description": "..."}}
- Character name translation: {"target": "terminology.character_names", "operation": "set", "key": "Placeholder Character", "value": "플레이스홀더 캐릭터"}
- Location name translation: {"target": "terminology.location_names", "operation": "set", "key": "Placeholder location", "value": "플레이스홀더 위치"}
- Faction name translation: {"target": "terminology.faction_names", "operation": "set", "key": "Placeholder faction", "value": "플레이스홀더 팩션"}`;
    },

    // DB 명령어 예시 (LLM에게 제공할 스키마)
    getCommandSchema() {
        return {
            db_commands: {
                type: 'array',
                description: '데이터베이스 변경 명령어 배열 (선택사항)',
                items: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'UPDATE_STAT',
                                'ADD_ITEM',
                                'REMOVE_ITEM',
                                'CHANGE_LOCATION',
                                'UPDATE_RELATIONSHIP',
                                'DISCOVER_LOCATION',
                                'UPDATE_TIME',
                                'SET_FLAG',
                                'ADD_QUEST',
                                'UPDATE_QUEST',
                                'MODIFY_GOLD'
                            ]
                        },
                        target: {
                            type: 'string',
                            enum: ['player', 'character', 'world']
                        },
                        params: {
                            type: 'object',
                            description: '명령어 파라미터'
                        }
                    },
                    required: ['action', 'params']
                }
            }
        };
    },

    // 명령어 예시
    getExamples() {
        return [
            {
                description: '플레이어 HP 회복',
                command: {
                    action: 'UPDATE_STAT',
                    target: 'player',
                    params: { stat: 'hp', value: 20, operation: 'add' }
                }
            },
            {
                description: '아이템 획득',
                command: {
                    action: 'ADD_ITEM',
                    target: 'player',
                    params: { item: '전설의 검' }
                }
            },
            {
                description: '위치 이동',
                command: {
                    action: 'CHANGE_LOCATION',
                    target: 'player',
                    params: { location: '어둠의 숲' }
                }
            },
            {
                description: '골드 획득',
                command: {
                    action: 'MODIFY_GOLD',
                    target: 'player',
                    params: { amount: 500, operation: 'add' }
                }
            },
            {
                description: '캐릭터 관계도 증가',
                command: {
                    action: 'UPDATE_RELATIONSHIP',
                    target: 'character',
                    params: {
                        characterId: 'char_001',
                        withCharacter: 'player',
                        value: 10,
                        operation: 'add'
                    }
                }
            },
            {
                description: '새 위치 발견',
                command: {
                    action: 'DISCOVER_LOCATION',
                    target: 'world',
                    params: { location: '고대 유적' }
                }
            },
            {
                description: '시간 경과',
                command: {
                    action: 'UPDATE_TIME',
                    target: 'world',
                    params: { time: '저녁 7시', weather: '비' }
                }
            }
        ];
    }
};
