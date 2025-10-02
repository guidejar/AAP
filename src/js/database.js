// 스크립트 제어 데이터베이스 (Chimera Single-File Schema)
export const Database = {
    // 현재 데이터베이스 상태
    current: {
        project_meta: {
            project_name: "Project Chimera",
            genre: ["sci-fi", "thriller"],
            target_language: "ko",
            current_chapter: 0,
            schema_version: "v4.1_single_file"
        },

        entities: {
            characters: {},  // C### 키로 인덱싱
            factions: {},    // F### 키로 인덱싱
            locations: {},   // L### 키로 인덱싱
            concepts: {},    // K### 키로 인덱싱
            threads: {},     // thread_* 키로 인덱싱
            relationships: []
        },

        chapters: [],  // 전체 챕터 히스토리

        terminology: {
            current_version: "v1.0",
            // terms_used - DISABLED: 세션 영향 방지 (LLM이 이 용어를 강제로 사용할 수 있음)
            /*
            terms_used: {
                chapter: "화",
                scene: "장면",
                character: "인물",
                plot: "플롯",
                twist: "반전",
                reveal: "정보 공개",
                faction: "세력",
                thread: "서브플롯",
                development: "전개",
                mood: "분위기"
            },
            */
            character_names: {},  // 인명: {영문명: "한글명"}
            location_names: {},   // 장소: {영문명: "한글명"}
            faction_names: {},    // 팩션: {영문명: "한글명"}
            special_phrases: {},
            usage_history: []
        },

        render_policy: {
            RENDER_OUTPUT_LANGUAGE_MUST_BE: "KOREAN",
            RENDER_OUTPUT_LANGUAGE_CODE: "ko-KR"
        }
    },

    // 페이지별 스냅샷
    snapshots: [],

    // 커밋 히스토리
    commitHistory: [],

    // 데이터베이스 초기화
    init() {
        // 플레이스홀더는 context-manager.js에서 하드코딩으로 제공
        // JSON 파일 로드는 사용하지 않음

        // 첫 번째 스냅샷 생성 (초기 상태)
        this.createSnapshot(0, 'initial', '초기 상태');
    },

    // 플레이스홀더 데이터 로드 - DISABLED: context-manager.js에서 하드코딩으로 제공
    /*
    async loadPlaceholders() {
        try {
            const response = await fetch('/dummy_database_entities.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const placeholders = await response.json();

            // 각 엔티티 타입에 플레이스홀더 추가
            this.current.entities.characters = { ...placeholders.characters };
            this.current.entities.factions = { ...placeholders.factions };
            this.current.entities.locations = { ...placeholders.locations };
            this.current.entities.concepts = { ...placeholders.concepts };
            this.current.entities.threads = { ...placeholders.threads };
            this.current.entities.relationships = [...placeholders.relationships];

            console.log('플레이스홀더 데이터 로드 완료');
        } catch (error) {
            console.warn('플레이스홀더 로드 실패:', error);
        }
    },
    */

    // 플레이스홀더 정리 (실제 데이터가 3개 이상이면 플레이스홀더 삭제)
    // 현재 비활성화: C001부터 시작하는 정확한 ID 사용을 위해
    cleanPlaceholders() {
        /* DISABLED: Keep placeholders for LLM reference
        // characters
        const realCharacters = Object.keys(this.current.entities.characters)
            .filter(key => !key.startsWith('{PLACEHOLDER'));
        if (realCharacters.length >= 3) {
            Object.keys(this.current.entities.characters).forEach(key => {
                if (key.startsWith('{PLACEHOLDER')) {
                    delete this.current.entities.characters[key];
                }
            });
        }

        // factions
        const realFactions = Object.keys(this.current.entities.factions)
            .filter(key => !key.startsWith('{PLACEHOLDER'));
        if (realFactions.length >= 3) {
            Object.keys(this.current.entities.factions).forEach(key => {
                if (key.startsWith('{PLACEHOLDER')) {
                    delete this.current.entities.factions[key];
                }
            });
        }

        // locations
        const realLocations = Object.keys(this.current.entities.locations)
            .filter(key => !key.startsWith('{PLACEHOLDER'));
        if (realLocations.length >= 3) {
            Object.keys(this.current.entities.locations).forEach(key => {
                if (key.startsWith('{PLACEHOLDER')) {
                    delete this.current.entities.locations[key];
                }
            });
        }

        // concepts
        const realConcepts = Object.keys(this.current.entities.concepts)
            .filter(key => !key.startsWith('{PLACEHOLDER'));
        if (realConcepts.length >= 3) {
            Object.keys(this.current.entities.concepts).forEach(key => {
                if (key.startsWith('{PLACEHOLDER')) {
                    delete this.current.entities.concepts[key];
                }
            });
        }

        // threads
        const realThreads = Object.keys(this.current.entities.threads)
            .filter(key => !key.startsWith('{PLACEHOLDER'));
        if (realThreads.length >= 3) {
            Object.keys(this.current.entities.threads).forEach(key => {
                if (key.startsWith('{PLACEHOLDER')) {
                    delete this.current.entities.threads[key];
                }
            });
        }

        // relationships
        const realRelationships = this.current.entities.relationships
            .filter(rel => !rel.source.startsWith('{PLACEHOLDER') && !rel.target.startsWith('{PLACEHOLDER'));
        if (realRelationships.length >= 3) {
            this.current.entities.relationships = realRelationships;
        }
        */
    },

    // 스냅샷 생성
    createSnapshot(pageIndex, commitId, description) {
        const snapshot = {
            pageIndex: pageIndex,
            commitId: commitId,
            description: description,
            timestamp: new Date().toISOString(),
            state: JSON.parse(JSON.stringify(this.current)) // 깊은 복사
        };

        this.snapshots.push(snapshot);
        return snapshot;
    },

    // 커밋 실행 (명령어 파싱 및 적용)
    executeCommit(pageIndex, commands, description = '') {
        const commitId = `commit_${Date.now()}`;
        const executedCommands = [];

        try {
            // 명령어 배열 처리
            if (Array.isArray(commands)) {
                commands.forEach(cmd => {
                    const result = this.parseAndExecuteCommand(cmd);
                    executedCommands.push({ command: cmd, result });
                });
            }

            // 커밋 기록
            this.commitHistory.push({
                commitId,
                pageIndex,
                timestamp: new Date().toISOString(),
                description,
                commands: executedCommands
            });

            // 스냅샷 생성
            const snapshot = this.createSnapshot(pageIndex, commitId, description);

            return {
                success: true,
                commitId,
                snapshot,
                executedCommands
            };
        } catch (error) {
            console.error('커밋 실행 오류:', error);
            return {
                success: false,
                error: error.message,
                executedCommands
            };
        }
    },

    // 명령어 파싱 및 실행 (Chimera 워크플로우에서는 사용 안 함)
    parseAndExecuteCommand(command) {
        console.warn('레거시 명령어 시스템 - Chimera 워크플로우에서는 db_commands 사용');
        return { success: false, message: '레거시 명령어 시스템 (사용 안 함)' };
    },

    // 특정 페이지의 스냅샷 가져오기
    getSnapshot(pageIndex) {
        return this.snapshots.find(s => s.pageIndex === pageIndex);
    },

    // 특정 스냅샷으로 복원
    restoreSnapshot(pageIndex) {
        const snapshot = this.getSnapshot(pageIndex);
        if (snapshot) {
            this.current = JSON.parse(JSON.stringify(snapshot.state));
            return { success: true, snapshot };
        }
        return { success: false, message: '스냅샷을 찾을 수 없습니다.' };
    },

    // 데이터베이스 상태 요약 (Chimera)
    getSummary() {
        return {
            project: this.current.project_meta.project_name,
            chapter: this.current.project_meta.current_chapter,
            entities: {
                characters: Object.keys(this.current.entities.characters).length,
                factions: Object.keys(this.current.entities.factions).length,
                locations: Object.keys(this.current.entities.locations).length,
                concepts: Object.keys(this.current.entities.concepts).length,
                threads: Object.keys(this.current.entities.threads).length
            },
            chapters: this.current.chapters.length,
            snapshots: this.snapshots.length,
            commits: this.commitHistory.length
        };
    }
};
