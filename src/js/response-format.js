// LLM 응답 형식 정의 (Chimera 스키마 기반 - 수정된 design 섹션)
export const ResponseFormat = {
    type: "object",
    properties: {
        // === 1단계: design (인터렉티브 소설 사고 프레임워크) ===
        design: {
            type: "object",
            properties: {
                version: { type: "string", default: "1.0" },
                mode: { type: "string", enum: ["scene", "transition", "recap"] },

                context: {
                    type: "object",
                    properties: {
                        scene_id: { type: "string" },
                        pov: { type: "string", enum: ["first", "second", "third"] },
                        time: { type: "string" },
                        location: { type: "string" },
                        canon_refs: { type: "array", items: { type: "string" } },
                        constraints: {
                            type: "object",
                            properties: {
                                tone: { type: "string" },
                                style: { type: "string" },
                                content_guard: { type: "array", items: { type: "string" } }
                            }
                        },
                        recent_summary: { type: "string" }
                    },
                    required: ["scene_id", "pov", "location"]
                },

                private_plan: {
                    type: "object",
                    properties: {
                        scene_goal: { type: "string" },
                        pressure: {
                            type: "array",
                            items: { type: "string", enum: ["time", "social", "resource", "moral", "physical"] }
                        },
                        decision_type: {
                            type: "string",
                            enum: ["info", "action", "moral", "relationship", "resource"]
                        },
                        stakes: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        info_design: {
                            type: "object",
                            properties: {
                                reveal: { type: "array", items: { type: "string" } },
                                withhold: { type: "array", items: { type: "string" } },
                                misdirection: { type: "array", items: { type: "string" } }
                            }
                        },
                        continuity: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean" },
                                conflicts: { type: "array", items: { type: "string" } }
                            }
                        },
                        emotion: {
                            type: "object",
                            properties: {
                                target: {
                                    type: "string",
                                    enum: ["suspense", "joy", "fear", "sadness", "anger", "surprise", "disgust", "curiosity", "anticipation"]
                                },
                                tension_level: { type: "integer", minimum: 1, maximum: 5 }
                            }
                        },
                        setting: {
                            type: "object",
                            properties: {
                                mood: { type: "string" },
                                sensory: { type: "array", items: { type: "string" } }
                            }
                        },
                        pacing: { type: "string", enum: ["slow", "normal", "urgent", "frantic"] },
                        hook: { type: "string", enum: ["question", "threat", "revelation", "action", "emotion"] },
                        beats: { type: "array", items: { type: "string" } },
                        safety: {
                            type: "object",
                            properties: {
                                blocked: { type: "array", items: { type: "string" } },
                                notes: { type: "string" }
                            }
                        }
                    },
                    required: ["scene_goal", "decision_type", "stakes"]
                },

                state_update: {
                    type: "object",
                    properties: {
                        immediate: {
                            type: "object",
                            properties: {
                                flags: { type: "array", items: { type: "string" } },
                                inventory_add: { type: "array", items: { type: "string" } },
                                inventory_remove: { type: "array", items: { type: "string" } },
                                clocks: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            delta: { type: "integer" }
                                        },
                                        required: ["id", "delta"]
                                    }
                                },
                                relationships: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            character_id: { type: "string" },
                                            target_id: { type: "string" },
                                            delta: { type: "integer" }
                                        },
                                        required: ["character_id", "target_id", "delta"]
                                    }
                                }
                            }
                        },
                        delayed: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    delta: { type: "integer" },
                                    note: { type: "string" },
                                    due_in_scenes: { type: "integer" }
                                }
                            }
                        },
                        threads: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    delta: { type: "integer" }
                                }
                            }
                        }
                    }
                },

                quality_gate: {
                    type: "object",
                    properties: {
                        has_conflict: { type: "boolean" },
                        // has_meaningful_choice - DISABLED: LLM이 이 필드 때문에 선택지 생성을 건너뛰는 문제 발생
                        // has_meaningful_choice: { type: "boolean" },
                        updates_state: { type: "boolean" },
                        no_canon_break: { type: "boolean" },
                        safety_ok: { type: "boolean" },
                        notes: { type: "string" }
                    },
                    required: ["no_canon_break", "safety_ok"]
                }
            },
            required: ["version", "mode", "context", "private_plan", "quality_gate"]
        },

        // === 2단계: render (현지화 출력) ===
        render: {
            type: "object",
            properties: {
                title: { type: "string" },
                creative_engaging_scenes: { type: "string" },
                situation_prompt: {
                    type: "string",
                    description: "Brief situation summary that naturally leads to presenting choices to the user. This should create anticipation for the upcoming decision point."
                }
            },
            required: ["title", "creative_engaging_scenes", "situation_prompt"]
        },

        // === 3단계: choices (선택지) ===
        choices: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    intent: {
                        type: "string",
                        enum: ["action", "info", "dialogue", "wait", "escape", "confront"]
                    },
                    costs: { type: "array", items: { type: "string" } },
                    risks: { type: "array", items: { type: "string" } },
                    rewards: { type: "array", items: { type: "string" } },
                    uncertainty: { type: "integer", minimum: 0, maximum: 3 },
                    state_preview: {
                        type: "object",
                        properties: {
                            flags_set: { type: "array", items: { type: "string" } },
                            flags_clear: { type: "array", items: { type: "string" } },
                            inventory_add: { type: "array", items: { type: "string" } },
                            inventory_remove: { type: "array", items: { type: "string" } },
                            clocks: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        delta: { type: "integer" }
                                    }
                                }
                            }
                        }
                    }
                },
                required: ["id", "label", "intent"]
            },
            minItems: 2,
            maxItems: 4
        },

        // === 4단계: db_commands (DB 업데이트만) ===
        db_commands: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    target: { type: "string" },
                    operation: {
                        type: "string",
                        enum: ["set", "update"]
                    },
                    key: { type: "string" },
                    value: { type: "string" }
                },
                required: ["target", "operation", "key", "value"]
            }
        },

        // === 5단계: mentioned_entities (이번 턴에서 언급된 entity IDs) ===
        mentioned_entities: {
            type: "object",
            properties: {
                character_ids: {
                    type: "array",
                    items: { type: "string" }
                },
                faction_ids: {
                    type: "array",
                    items: { type: "string" }
                },
                location_ids: {
                    type: "array",
                    items: { type: "string" }
                },
                concept_ids: {
                    type: "array",
                    items: { type: "string" }
                },
                thread_ids: {
                    type: "array",
                    items: { type: "string" }
                }
            }
        }
    },
    required: ["design", "render"]
};
