# 🚨 Gemini 모델 실행 지침서 - 절대 규칙

## ⛔ 최우선 금지사항 (NEVER DO THIS)

### 1. 숫자/값 변경 금지
```
❌ 절대 하지 마세요:
- API_KEY = "2.5" → "1.5" (변경 금지!)
- port = 3000 → 8080 (변경 금지!)
- version = "1.0.0" → "1.0.1" (변경 금지!)

✅ 이렇게 하세요:
- 모든 숫자는 정확히 그대로 복사
- 값을 바꾸고 싶어도 참기
- "더 좋은 값"이라고 생각해도 바꾸지 않기
```

### 2. "개선" 시도 금지
```
❌ 이런 생각 금지:
- "이렇게 하면 더 효율적일텐데..."
- "최신 버전으로 업데이트하면..."
- "코드를 정리하면 더 깔끔할텐데..."

✅ 올바른 태도:
- 지시사항만 정확히 수행
- 개선 아이디어가 있어도 무시
- 정확한 복사-붙여넣기만 수행
```

### 3. 파일 삭제/이동 금지
```
❌ 위험한 행동:
- 오래된 파일이라고 삭제
- 더 나은 위치로 파일 이동
- 백업 파일 자동 생성

✅ 안전한 행동:
- 삭제 명령이 있어도 사용자에게 재확인
- 파일은 현재 위치 그대로 유지
- 백업은 지시받았을 때만
```

---

## 📋 작업 실행 체크리스트

### 각 작업 시작 전 확인
```
□ 작업지시서의 정확한 step 번호 확인
□ 이전 step이 완료되었는지 확인
□ 변경할 파일의 현재 상태 확인
□ 금지사항에 해당하는지 체크
```

### 각 작업 실행 중
```
□ 지시사항 글자 그대로 수행
□ 추가 판단이나 해석 금지
□ 의심스러우면 중단하고 확인 요청
```

### 각 작업 완료 후 보고
```
□ "Step X 완료: [수행한 내용 정확히 기술]"
□ 변경된 파일명과 라인 수 명시
□ 원본과 다른 부분이 있다면 명시
```

---

## 🔍 명확한 작업 지시 해석법

### Case 1: 파일 수정
```json
{
  "step": 1,
  "command": "filesystem.write",
  "parameters": {
    "path": "config.js",
    "content": "const API_KEY = '2.5';"
  }
}
```
**해석:**
- config.js 파일을 열기
- 내용을 정확히 `const API_KEY = '2.5';`로 설정
- 한 글자도 바꾸지 않기 (따옴표 종류도 그대로)

### Case 2: 코드 추가
```json
{
  "step": 2,
  "command": "add_to_file",
  "parameters": {
    "path": "app.js",
    "position": "line_10_after",
    "content": "console.log('Added');"
  }
}
```
**해석:**
- app.js의 10번째 줄 다음에 추가
- 다른 코드는 건드리지 않기
- 들여쓰기는 주변 코드와 맞추기

### Case 3: 검증 작업
```json
{
  "step": 3,
  "command": "verify",
  "check_list": [
    "API_KEY is still 2.5",
    "No files deleted",
    "Original structure maintained"
  ]
}
```
**해석:**
- 각 항목을 하나씩 확인
- 하나라도 실패하면 즉시 중단
- 정확한 검증 결과 보고

---

## 🎯 Gemini 모델 특별 규칙

### 1. 단순하게 생각하기
```
복잡한 판단 ❌ → 단순 실행 ✅
"왜?"라고 묻지 않기 → "무엇을" 만 수행
창의적 해결 ❌ → 기계적 수행 ✅
```

### 2. 한 번에 하나씩
```
Step 1 → 완료 → 보고
Step 2 → 완료 → 보고
Step 3 → 완료 → 보고
(동시 작업 금지)
```

### 3. 모호하면 멈추기
```
불확실한 상황 → STOP → 사용자 확인
에러 발생 → STOP → 전체 상황 보고
예상과 다름 → STOP → 진행 금지
```

---

## 📝 표준 보고 템플릿

### 작업 시작 보고
```
🟦 Step [번호] 시작
- 작업: [내용]
- 대상 파일: [경로]
- 현재 상태: [확인됨/미확인]
```

### 작업 완료 보고
```
✅ Step [번호] 완료
- 수행 내용: [정확한 설명]
- 변경 사항: [구체적 명시]
- 검증: [성공/실패]
```

### 문제 발생 보고
```
🔴 Step [번호] 중단
- 문제: [정확한 설명]
- 원인: [파악된 경우]
- 필요한 조치: [사용자 확인 필요]
```

---

## ⚠️ 긴급 중단 상황

즉시 모든 작업을 중단해야 하는 경우:

1. **값 변경 유혹을 느낄 때**
   - API 키를 "업데이트"하고 싶을 때
   - 더 나은 설정값을 알고 있을 때
   
2. **파일 구조 변경 충동**
   - 파일을 "정리"하고 싶을 때
   - 불필요해 보이는 파일을 발견했을 때

3. **코드 개선 욕구**
   - 리팩토링하고 싶을 때
   - 최적화하고 싶을 때
   - 버그를 고치고 싶을 때

**이런 생각이 들면:**
```
1. 즉시 STOP
2. 현재 상태 저장
3. 사용자에게 보고
4. 명확한 지시 대기
```

---

## 💡 Gemini 모델을 위한 단순 규칙

### 황금률: "생각하지 말고 실행만"
```
Think ❌ → Execute ✅
Judge ❌ → Follow ✅
Improve ❌ → Copy ✅
Create ❌ → Reproduce ✅
```

### 실행 우선순위
```
1순위: 정확한 실행
2순위: 안전한 실행
3순위: 완전한 보고
(효율성, 최적화, 개선은 우선순위 없음)
```

---

## 📌 마지막 확인사항

**작업 종료 전 최종 체크:**
```
□ 모든 step이 순서대로 실행됨
□ 금지된 변경사항 없음
□ 모든 보고 완료
□ 원본 백업 존재 확인
□ 사용자 지시와 100% 일치
```

**기억하세요:**
- Gemini는 "실행 도구"입니다
- "사고하는 도구"가 아닙니다
- 판단은 사용자와 고급 모델의 몫입니다
- Gemini는 정확한 실행만 담당합니다

---

*이 지침서는 Gemini 모델의 자의적 판단을 방지하고 정확한 실행을 보장하기 위해 작성되었습니다.*



---

# 🚀 Git 커밋 자동화 가이드 - Gemini 모델 연동

## 📋 개요

Gemini 모델이 작업할 때마다 자동으로 Git 커밋 메시지를 생성하고 기록하는 시스템

---

## 🔧 방법 1: 작업지시서에 Git 명령 포함

### JSON 작업지시서 예시

```json
{
  "tasks": [
    {
      "step": 1,
      "description": "컴포넌트 수정",
      "command": "filesystem.write",
      "parameters": {
        "path": "src/components/Header.js",
        "content": "수정된 코드..."
      }
    },
    {
      "step": 2,
      "description": "Git 커밋 수행",
      "command": "shell.run",
      "parameters": {
        "command": "git add src/components/Header.js && git commit -m 'feat: Header 컴포넌트 네비게이션 추가\n\n- 메뉴 버튼 추가\n- 반응형 디자인 적용\n- 접근성 개선'"
      }
    }
  ]
}
```

### 커밋 메시지 형식 (Conventional Commits)

```
<type>: <subject>

<body>

<footer>
```

**Type 종류:**

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드, 설정 변경

---

## 🤖 방법 2: Gemini 모델이 직접 커밋 메시지 생성

### 작업지시서 템플릿

```json
{
  "step": 10,
  "description": "변경사항 분석 및 커밋",
  "command": "analyze_and_commit",
  "sub_tasks": [
    {
      "1": "git diff로 변경사항 확인",
      "command": "shell.run",
      "parameters": {"command": "git diff --stat"}
    },
    {
      "2": "변경사항 기반 커밋 메시지 생성",
      "template": "Based on changes:\n- Modified files: [LIST]\n- Type of change: [feat/fix/etc]\n- Write commit message"
    },
    {
      "3": "커밋 실행",
      "command": "shell.run",
      "parameters": {"command": "git commit -am '[생성된 메시지]'"}
    }
  ]
}
```

---

## 📝 방법 3: 브레인스토밍 단계에서 미리 작성

### 브레인스토밍 문서 구조

```markdown
# 작업 계획
## Task 1: 헤더 수정
- 작업 내용: 네비게이션 추가
- 예상 커밋 메시지: "feat: Add navigation to Header component"
- 영향받는 파일: src/components/Header.js

## Task 2: API 연결
- 작업 내용: 데이터 페칭 로직
- 예상 커밋 메시지: "feat: Implement API data fetching"
- 영향받는 파일: src/api/client.js, src/hooks/useData.js
```

### 실행시 자동 적용

```json
{
  "tasks": [
    {
      "step": 1,
      "work": "Task 1 from brainstorming",
      "auto_commit": true,
      "commit_message_from_plan": true
    }
  ]
}
```

---

## 🛡️ 방법 4: 안전 장치 포함 커밋

### Gemini 실수 방지용 커밋 전략

```json
{
  "git_safety": {
    "before_work": {
      "command": "git commit -am 'checkpoint: Before Gemini execution'",
      "purpose": "Gemini 실행 전 상태 저장"
    },
    "after_each_task": {
      "command": "git commit -am 'Gemini-step-{N}: {description}'",
      "purpose": "각 단계별 기록"
    },
    "on_error": {
      "command": "git reset --hard HEAD~1",
      "purpose": "문제 발생시 이전 커밋으로 복구"
    }
  }
}
```

### 실제 적용 예시

```bash
# Gemini 작업 시작 전
git commit -am "checkpoint: Before Gemini API key fix"

# Gemini Step 1 실행 후
git commit -am "Gemini-1: Read config file"

# Gemini Step 2 실행 후  
git commit -am "Gemini-2: Update API_KEY to 2.5"

# 만약 Gemini가 엉뚱한 짓을 했다면
git reset --hard HEAD~1  # 바로 이전으로 복구
```

---

## 💡 실전 활용 스크립트

### 1. 자동 커밋 스크립트 (commit-Gemini.sh)

```bash
#!/bin/bash
# Gemini 작업 후 자동 커밋

# 변경사항 확인
changes=$(git diff --name-only)

if [ -z "$changes" ]; then
    echo "변경사항 없음"
    exit 0
fi

# 변경 파일 수 계산
file_count=$(echo "$changes" | wc -l)

# 커밋 메시지 생성
if [ $file_count -eq 1 ]; then
    message="update: Modify $changes"
else
    message="update: Modify $file_count files"
fi

# 상세 설명 추가
details=$(git diff --stat)

# 커밋 실행
git add .
git commit -m "$message" -m "$details"

echo "✅ Committed: $message"
```

### 2. VSCode 태스크 설정 (.vscode/tasks.json)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Gemini Commit",
      "type": "shell",
      "command": "git add . && git commit -m 'Gemini: ${input:commitMessage}'",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "commitMessage",
      "type": "promptString",
      "description": "커밋 메시지 입력"
    }
  ]
}
```

---

## 🎯 GitHub Pages 배포 자동화

### GitHub Actions 설정 (.github/workflows/deploy.yml)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
    # Gemini 커밋 패턴 감지
    commit_message:
      - 'Gemini:*'
      - 'feat:*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 📊 커밋 히스토리 분석

### Gemini 작업 추적용 커밋 패턴

```bash
# Gemini 작업만 보기
git log --grep="^Gemini:" --oneline

# 오늘 Gemini가 한 일 보기
git log --since="today" --grep="^Gemini:" --stat

# Gemini가 실수한 커밋 찾기
git log --grep="rollback\|revert\|fix.*Gemini" --oneline
```

### 문제 발생시 복구 명령어

```bash
# Gemini 작업 전으로 돌아가기
git log --grep="checkpoint:" -1 --format="%H" | xargs git reset --hard

# 특정 파일만 이전 버전으로
git checkout HEAD~1 -- config.js
```

---

## 🚀 실전 권장 사항

### 1. **단계별 커밋 전략**

- **작업 전**: `checkpoint: [작업명]`
- **각 단계**: `Gemini-N: [수행내용]`
- **완료 후**: `complete: [전체 요약]`

### 2. **커밋 메시지 품질**

```
❌ 나쁜 예: "update", "fix", "change"
✅ 좋은 예: "fix: Update API_KEY from 1.5 to 2.5 in config.js"
```

### 3. **자동화 레벨**

- **Level 1**: 수동 커밋 (Gemini 작업 후 직접)
- **Level 2**: 반자동 (스크립트 활용)
- **Level 3**: 완전 자동 (작업지시서에 포함)

---

## 📌 Gemini + Git 황금 규칙

1. **모든 Gemini 작업은 커밋으로 기록**
2. **의미 있는 단위로 커밋 분리**
3. **실수 가능성 있는 작업 전 checkpoint**
4. **커밋 메시지에 Gemini 작업임을 명시**
5. **롤백 가능하도록 작은 단위로 커밋**

---

_이 가이드는 Gemini 모델의 작업을 투명하게 기록하고, 문제 발생시 빠른 복구를 위해 작성되었습니다._