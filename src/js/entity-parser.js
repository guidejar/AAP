// Entity Annotation Parser (Parenthesis-style)
export const EntityParser = {
    // @ID 및 (ID) 패턴 파싱
    parse(text) {
        const entities = {
            character_ids: new Set(),
            faction_ids: new Set(),
            location_ids: new Set(),
            concept_ids: new Set(),
            thread_ids: new Set()
        };

        // @ 형식: @C001, @L001, @thread_001
        const atPattern = /@([A-Z]\d+|thread_[a-z_]+)/g;
        let match;
        while ((match = atPattern.exec(text)) !== null) {
            const entityId = match[1];
            this.addEntityById(entities, entityId);
        }

        // 괄호 형식: (C001), (L001) (기존 호환)
        const parenPattern = /\(([A-Z]\d+|thread_[a-z_]+)\)/g;
        while ((match = parenPattern.exec(text)) !== null) {
            const entityId = match[1];
            this.addEntityById(entities, entityId);
        }

        // Set을 배열로 변환
        return {
            character_ids: Array.from(entities.character_ids),
            faction_ids: Array.from(entities.faction_ids),
            location_ids: Array.from(entities.location_ids),
            concept_ids: Array.from(entities.concept_ids),
            thread_ids: Array.from(entities.thread_ids)
        };
    },

    // ID로 엔티티 타입 분류
    addEntityById(entities, entityId) {
        if (entityId.startsWith('C')) {
            entities.character_ids.add(entityId);
        } else if (entityId.startsWith('F')) {
            entities.faction_ids.add(entityId);
        } else if (entityId.startsWith('L')) {
            entities.location_ids.add(entityId);
        } else if (entityId.startsWith('K')) {
            entities.concept_ids.add(entityId);
        } else if (entityId.startsWith('thread_')) {
            entities.thread_ids.add(entityId);
        }
    },

    // 텍스트를 HTML로 변환 (툴팁용)
    toHTML(text) {
        if (!window.Database || !window.Database.current) {
            return text;
        }

        // const db = window.Database.current;
        // const markedEntities = new Set(); // 이미 마킹된 엔티티 추적
        const replacements = [];

        // // 1단계: @ID 패턴 찾기 (새 형식) - 주석처리
        // const atPattern = /@([A-Z]\d+|thread_[a-z_]+)/g;
        // let match;
        // while ((match = atPattern.exec(text)) !== null) {
        //     const entityId = match[1];
        //     const idStart = match.index;
        //     const idEnd = idStart + match[0].length;
        //
        //     console.log('[EntityParser] Found @ID:', {match: match[0], entityId, position: idStart});
        //
        //     this.processEntity(text, entityId, idStart, idEnd, db, markedEntities, replacements);
        // }

        // 2단계: (ID) 괄호 패턴 찾기 (fallback - 단순 제거)
        const parenPattern = /\(([A-Z]\d+|thread_[a-z_]+)\)/g;
        let match;
        while ((match = parenPattern.exec(text)) !== null) {
            const idStart = match.index;
            const idEnd = idStart + match[0].length;

            // 괄호와 ID만 제거
            replacements.push({
                start: idStart,
                end: idEnd,
                replacement: ''
            });
        }

        // 3단계: 뒤에서부터 교체
        replacements.sort((a, b) => b.start - a.start);
        let result = text;
        for (const r of replacements) {
            result = result.substring(0, r.start) + r.replacement + result.substring(r.end);
        }

        return result;
    },

    // 엔티티 처리 공통 로직 - 주석처리
    // processEntity(text, entityId, idStart, idEnd, db, markedEntities, replacements) {
    //     // 1단계: 이미 마킹된 엔티티면 ID만 제거
    //     if (markedEntities.has(entityId)) {
    //         console.log('[EntityParser] Already marked, removing ID');
    //         replacements.push({
    //             start: idStart,
    //             end: idEnd,
    //             replacement: ''
    //         });
    //         return;
    //     }
    //
    //     // 2단계: 엔티티 타입 판별
    //         let entityType = 'unknown';
    //         if (entityId.startsWith('C')) entityType = 'character';
    //         else if (entityId.startsWith('F')) entityType = 'faction';
    //         else if (entityId.startsWith('L')) entityType = 'location';
    //         else if (entityId.startsWith('K')) entityType = 'concept';
    //         else if (entityId.startsWith('thread_')) entityType = 'thread';
    //
    //         // 3단계: Database에서 조회
    //         let entity = null;
    //         if (entityType === 'character') entity = db.entities.characters[entityId];
    //         else if (entityType === 'location') entity = db.entities.locations[entityId];
    //         else if (entityType === 'faction') entity = db.entities.factions[entityId];
    //         else if (entityType === 'concept') entity = db.entities.concepts[entityId];
    //         else if (entityType === 'thread') entity = db.entities.threads[entityId];
    //
    //         console.log('[EntityParser] Entity lookup:', {entityId, entity, entityType});
    //
    //         // DB에 없으면 ID만 제거
    //         if (!entity || !entity.name) {
    //             console.log('[EntityParser] Entity not found, removing ID');
    //             replacements.push({
    //                 start: idStart,
    //                 end: idEnd,
    //                 replacement: ''
    //             });
    //             return;
    //         }
    //
    //         const englishName = entity.name;
    //
    //         // 4단계: terminology에서 한글명 찾기
    //         let koreanName = null;
    //         if (entityType === 'character' && db.terminology.character_names) {
    //             koreanName = db.terminology.character_names[englishName];
    //         } else if (entityType === 'location' && db.terminology.location_names) {
    //             koreanName = db.terminology.location_names[englishName];
    //         } else if (entityType === 'faction' && db.terminology.faction_names) {
    //             koreanName = db.terminology.faction_names[englishName];
    //         }
    //
    //         const targetName = koreanName || englishName;
    //
    //         // 5단계: @ID 앞에 이름 있는지 체크
    //         // "이름 @C001" 형식에서 "이름 "을 찾음
    //         const beforeText = text.substring(0, idStart);
    //         let nameStart = -1;
    //         let foundName = '';
    //
    //         // 한글명 + 공백 체크
    //         if (koreanName && beforeText.endsWith(koreanName + ' ')) {
    //             nameStart = idStart - koreanName.length - 1;
    //             foundName = koreanName;
    //         }
    //         // 영문명 + 공백 체크
    //         else if (beforeText.endsWith(englishName + ' ')) {
    //             nameStart = idStart - englishName.length - 1;
    //             foundName = englishName;
    //         }
    //
    //         if (nameStart >= 0) {
    //             // "이름 @ID" 전체를 스타일 적용된 이름으로 교체
    //             replacements.push({
    //                 start: nameStart,
    //                 end: idEnd,
    //                 replacement: `<span class="entity entity-${entityType}" data-id="${entityId}" data-type="${entityType}" title="${entityId}">${foundName}</span>`
    //             });
    //         } else {
    //             // "@ID"만 이름으로 교체
    //             replacements.push({
    //                 start: idStart,
    //                 end: idEnd,
    //                 replacement: `<span class="entity entity-${entityType}" data-id="${entityId}" data-type="${entityType}" title="${entityId}">${targetName}</span>`
    //             });
    //         }
    //
    //         // 마킹 완료 표시
    //         markedEntities.add(entityId);
    //     }
    // },

    // 간단한 플레인 텍스트 변환 (ID 제거)
    toPlainText(text) {
        // 괄호 형식의 ID 제거: 이름(ID) → 이름
        const entityPattern = /([\p{L}\p{N}\s]+)?\(([A-Z]\d+|thread_[a-z_]+)\)/gu;
        return text.replace(entityPattern, (match, name) => {
            return name ? name.trim() : '';
        });
    }
};
