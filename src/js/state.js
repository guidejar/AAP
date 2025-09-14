/**
 * 파일명: state.js
 * 목적: 애플리케이션의 전역 상태 변수를 관리합니다. (v4 아키텍처)
 * 작성일: 2025-09-14
 * 
 * === 변경 히스토리 ===
 * 2025-09-14 14:07 - 초기 생성: VV3.md에서 전역 상태 변수 분리
 * 2025-09-14 14:50 - v4 리팩토링: DAD 스냅샷 개념 도입에 따라 변수명 및 주석 수정
 * =====================
 */

// let으로 선언하여 앱 전체에서 값을 변경할 수 있도록 합니다.

// 사용자의 Gemini API 키를 저장하는 변수
export let userApiKey = "";

// 이야기의 모든 장면(scene)을 배열 형태로 저장합니다. 각 scene은 고유의 DAD 스냅샷을 가집니다.
export let sceneArchive = [];

// 현재 사용자가 보고 있는 장면의 인덱스 번호입니다.
export let currentSceneIndex = -1;

// 디버그 모드가 활성화되었는지 여부를 나타냅니다.
export let isDebugMode = false;

// 생성된 이미지 데이터를 ID와 함께 저장하여 중복 생성을 방지합니다. (메모리 캐시)
export let imageCache = new Map();

// 게임 시작 시의 초기 DAD(동적 에셋 데이터베이스) 스냅샷을 저장합니다.
export let initialDadSnapshot = {};

// 사용자가 과거 시점에서 새로운 분기를 만들고 있는지 여부를 나타냅니다.
export let isBranchingActive = false;

/**
 * 상태 값을 변경하기 위한 함수들 (Setters)
 * 직접 변수를 수정하는 대신, 이 함수들을 통해 상태를 변경하면 코드의 흐름을 추적하기 용이해집니다.
 */

export function setUserApiKey(key) {
    userApiKey = key;
}

export function setSceneArchive(archive) {
    sceneArchive = archive;
}

export function setCurrentSceneIndex(index) {
    currentSceneIndex = index;
}

export function setIsDebugMode(mode) {
    isDebugMode = mode;
}

export function setImageCache(cache) {
    imageCache = cache;
}

// initialDadSnapshot 객체를 설정합니다.
export function setInitialDadSnapshot(snapshot) {
    initialDadSnapshot = snapshot;
}

export function setIsBranchingActive(isActive) {
    isBranchingActive = isActive;
}
