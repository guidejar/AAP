// Entity Annotation Parser (Parenthesis-style)
export const EntityParser = {
    // (ID) 패턴 파싱
    parse(text) {
        // 괄호 형식: 이름(ID) 또는 (ID)
        const entityPattern = /\(([A-Z]\d+|thread_[a-z_]+)\)/g;

        const entities = {
            character_ids: new Set(),
            faction_ids: new Set(),
            location_ids: new Set(),
            concept_ids: new Set(),
            thread_ids: new Set()
        };

        let match;
        while ((match = entityPattern.exec(text)) !== null) {
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
        // 패턴: 앞에 단어가 있는 (ID) 형식
        // 예: 안드로니코스 콤니노스(C001), 그는(C001), (C001)
        const entityPattern = /([\p{L}\p{N}\s]+)?\(([A-Z]\d+|thread_[a-z_]+)\)/gu;

        return text.replace(entityPattern, (match, name, entityId) => {
            // 엔티티 타입 판별
            let entityType = 'unknown';
            if (entityId.startsWith('C')) entityType = 'character';
            else if (entityId.startsWith('F')) entityType = 'faction';
            else if (entityId.startsWith('L')) entityType = 'location';
            else if (entityId.startsWith('K')) entityType = 'concept';
            else if (entityId.startsWith('thread_')) entityType = 'thread';

            // 이름이 있는지 확인
            let trimmedName = name ? name.trim() : '';

            // terminology에서 한글 번역 자동 조회 (영문명 → 한글명)
            if (trimmedName && window.Database && window.Database.current) {
                const db = window.Database.current;
                let koreanName = null;

                // 엔티티 타입별로 적절한 terminology 사전 조회
                if (entityType === 'character' && db.terminology.character_names) {
                    koreanName = db.terminology.character_names[trimmedName];
                } else if (entityType === 'location' && db.terminology.location_names) {
                    koreanName = db.terminology.location_names[trimmedName];
                } else if (entityType === 'faction' && db.terminology.faction_names) {
                    koreanName = db.terminology.faction_names[trimmedName];
                }

                // 한글 번역이 있으면 치환
                if (koreanName) {
                    trimmedName = koreanName;
                }
            }

            // 대명사 목록
            const pronouns = ['그', '그는', '그가', '그를', '그의', '그녀', '그녀는', '그녀가', '그녀를', '그녀의', '이', '저', '이것', '저것', '여기', '거기'];

            if (trimmedName && !pronouns.includes(trimmedName)) {
                // 적절한 이름이 있으면 이름만 표시 (ID는 data attribute에)
                return `<span class="entity entity-${entityType}" data-id="${entityId}" data-type="${entityType}" title="${entityId}">${trimmedName}</span>`;
            } else if (trimmedName) {
                // 대명사면 대명사만 표시, ID는 숨김
                return trimmedName;
            } else {
                // 이름이 없으면 ID 숨김
                return '';
            }
        });
    },

    // 간단한 플레인 텍스트 변환 (ID 제거)
    toPlainText(text) {
        // 괄호 형식의 ID 제거: 이름(ID) → 이름
        const entityPattern = /([\p{L}\p{N}\s]+)?\(([A-Z]\d+|thread_[a-z_]+)\)/gu;
        return text.replace(entityPattern, (match, name) => {
            return name ? name.trim() : '';
        });
    }
};
