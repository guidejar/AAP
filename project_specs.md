# AAP (AI Adventure Platform) - Project Specifications

## 1. 기술 스택

### Frontend Technologies
- **HTML5/CSS3/JavaScript (ES6+)** - 순수 웹 기술 스택
- **Tailwind CSS** - 유틸리티 기반 CSS 프레임워크 (CDN 방식)
- **Google Fonts** - Noto Sans KR 폰트 사용
- **ES6 Modules** - 모듈 시스템

### Backend Services
- **Google Generative AI API** - Gemini 모델 활용
  - `gemini-2.5-flash-preview-05-20` (무료 티어)
  - `gemini-2.5-pro` (API 키 사용)
  - `gemini-2.5-flash-image-preview` (이미지 생성)

### Browser APIs
- **File API** - 파일 저장/불러오기
- **Fetch API** - HTTP 통신
- **LocalStorage** - 클라이언트 상태 관리

## 2. 폴더 구조

```
aap/
├── .git/                     # Git 버전 관리
├── src/                      # 소스 코드 폴더
│   ├── js/                   # JavaScript 모듈들
│   │   ├── api.js           # API 통신 관리
│   │   ├── config.js        # 설정 및 시스템 프롬프트
│   │   ├── dom.js           # DOM 요소 참조 관리
│   │   ├── main.js          # 메인 애플리케이션 로직
│   │   ├── state.js         # 전역 상태 관리
│   │   ├── ui.js            # UI 렌더링 및 상호작용
│   │   └── utils.js         # 유틸리티 함수들
│   └── style.css            # 스타일시트
├── gemini.md                # 개발 가이드라인 및 API 명세
└── _input.md                # 사용자 입력 파일 (임시)
```

## 3. 주요 파일들과 역할

### Core Application Files

#### `src/js/main.js` (430 lines)
- **역할**: 애플리케이션의 핵심 로직 및 게임 흐름 제어
- **주요 기능**:
  - 게임 시작 및 턴 처리
  - 2-API 구조 (서사 생성 → 분석 → 이미지 생성)
  - 이벤트 리스너 관리
  - 백그라운드 작업 처리

#### `src/js/config.js` (160 lines)
- **역할**: AI 모델 시스템 프롬프트 및 설정 상수 정의
- **주요 기능**:
  - 월드 빌더, 스토리 생성기, 분석 AI 프롬프트
  - 이미지 생성 템플릿 정의
  - 영문 데이터 통일 정책

#### `src/js/api.js` (147 lines)
- **역할**: Google Generative AI API 통신 담당
- **주요 기능**:
  - 텍스트 생성 API 호출
  - 이미지 생성 API 호출
  - 커스텀 에러 처리 (ApiError 클래스)
  - API 키 관리 및 모델 선택

#### `src/js/ui.js` (241 lines)
- **역할**: UI 렌더링 및 사용자 상호작용 관리
- **주요 기능**:
  - 장면 렌더링
  - 힌트 패널 및 선택지 표시
  - 로딩 상태 관리
  - 디버그 뷰 토글

#### `src/js/state.js` (75 lines)
- **역할**: 전역 상태 변수 관리
- **주요 상태**:
  - `sceneArchive`: 게임 장면 아카이브
  - `imageCache`: 생성된 이미지 캐시
  - `userApiKey`: 사용자 API 키
  - `isGenerating`: 백그라운드 작업 상태

#### `src/js/dom.js` (82 lines)
- **역할**: HTML DOM 요소 참조 관리
- **특징**: 모든 DOM 요소를 중앙 집중식으로 관리

#### `src/js/utils.js` (123 lines)
- **역할**: 보조 유틸리티 함수 제공
- **주요 기능**:
  - JSON 파싱 (AI 응답 처리)
  - 파일 저장/불러오기
  - 데이터 검증

### Style & Assets

#### `src/style.css` (39 lines)
- **역할**: 커스텀 스타일 및 반응형 디자인
- **특징**:
  - Tailwind CSS 보완
  - 로딩 애니메이션
  - 모달 및 툴팁 스타일

### Documentation

#### `gemini.md` (185 lines)
- **역할**: 개발 가이드라인 및 코딩 컨벤션
- **내용**:
  - 파일 헤더 규칙
  - 백업 관리 정책
  - 주석 작성 규칙
  - API 사용 가이드

## 4. 프레임워크/라이브러리 버전

### CDN Dependencies
- **Tailwind CSS**: v3.4.0 (CDN)
- **Google Fonts**: Noto Sans KR (CDN)

### API Dependencies
- **Google Generative AI**: v1beta API
- **Models Used**:
  - `gemini-2.5-flash-preview-05-20`
  - `gemini-2.5-pro`
  - `gemini-2.5-flash-image-preview`

## 5. 환경 설정 파일들

현재 프로젝트에는 별도의 환경 설정 파일이 없습니다. 설정은 다음과 같이 관리됩니다:

- **API 설정**: `src/js/config.js`에서 하드코딩
- **사용자 설정**: 브라우저 LocalStorage 활용 (예정)
- **API 키**: 런타임에 사용자 입력으로 관리

## 6. 빌드/실행 스크립트

### 개발 환경
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js http-server
npx http-server -p 8000
```

### 배포
- 정적 파일 서버에 `src/` 폴더 내용 업로드
- HTML 엔트리 포인트가 없어 별도 index.html 필요

## 7. API 엔드포인트 구조

### Google Generative AI Endpoints
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**사용 모델별 엔드포인트**:
- 텍스트 생성: `gemini-2.5-flash-preview-05-20`, `gemini-2.5-pro`
- 이미지 생성: `gemini-2.5-flash-image-preview`

**요청 구조**:
```json
{
  "contents": [...],
  "systemInstruction": { "parts": [{ "text": "..." }] },
  "generationConfig": { "responseModalities": ["IMAGE"] }
}
```

## 8. 데이터 모델 구조

### Scene Archive Structure
```javascript
{
  user_input: String,           // 사용자 입력
  title: String,               // 장면 제목
  story: String,               // 생성된 스토리
  hints: Object,               // 게임 힌트
  choices: Array,              // 선택지
  displayImageId: String,      // 표시할 이미지 ID
  dadSnapshot: Object,         // Dynamic Asset Database 스냅샷
  taskQueue: Array,           // 이미지 생성 작업 큐
  isComplete: Boolean,        // 장면 완성 여부
  raw_story_response: String, // 원본 AI 응답
  raw_analysis_response: String // 원본 분석 응답
}
```

### Dynamic Asset Database (DAD)
```javascript
{
  plotSummary: String,
  keyCharacters: Array,       // 주요 캐릭터
  keyLocations: Array,        // 주요 장소
  keyItems: Array,           // 주요 아이템
  keySkills: Array,          // 주요 스킬
  artStyleKeywords: String   // 아트 스타일 키워드
}
```

### Image Cache Structure
```javascript
Map<String, String>  // assetId → base64 data URL
```

## 9. 특별 기능

### v4 Architecture Features
- **2-API 구조**: 서사 생성 → 분석 → 이미지 생성
- **DAD 스냅샷**: 각 장면마다 세계관 상태 저장
- **백그라운드 처리**: 1차 API 완료 후 즉시 렌더링
- **이미지 캐싱**: 중복 생성 방지
- **분기 시스템**: 과거 시점에서 새로운 스토리 분기

### Error Handling
- **ApiError 클래스**: API 오류 상세 분류
- **Fallback 시스템**: 무료 API → 유료 API 자동 전환
- **Graceful Degradation**: 이미지 생성 실패 시 플레이스홀더

### UX Features
- **실시간 로딩**: 백그라운드 작업 진행 상황 표시
- **키보드 단축키**: 네비게이션 및 입력 최적화
- **분기 기능**: 과거 장면에서 새로운 선택지 탐색
- **디버그 모드**: 개발자용 상세 정보 표시

## 10. 개발 패턴

### Code Architecture
- **모듈 분리**: 기능별 파일 분할
- **상태 중앙화**: state.js를 통한 전역 상태 관리
- **이벤트 기반**: DOM 이벤트와 상태 변화 기반 렌더링

### Naming Conventions
- **파일명**: kebab-case (예: `main.js`)
- **함수명**: camelCase (예: `processTask`)
- **상수명**: camelCase (예: `worldBuilderSystemPrompt`)

### Data Flow
1. 사용자 입력 → `main.js`
2. API 호출 → `api.js`
3. 상태 업데이트 → `state.js`
4. UI 렌더링 → `ui.js`
5. DOM 조작 → `dom.js`