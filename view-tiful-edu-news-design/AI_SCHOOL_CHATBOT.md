# AI 중점학교 통계 위젯 · 챗봇

`category.html?type=digital`(AI•디지털교육)에서만 보입니다. 왼쪽은 지역별 통계 표, 오른쪽은 "AI 중점학교 물어보기" 챗봇입니다.

## 구조

```
브라우저
 ├─ 통계 표   ai-school-data.js ──┐
 │  (pages.js)                    ├─▶ Supabase RPC (읽기 전용, publishable 키)
 └─ 챗봇      ai-school-chat.js   │     public.ai_school_stats(p_year)
        │                         │     public.ai_school_list(p_year, p_region, p_level, p_query, p_limit)
        └─▶ /api/chat (Vercel) ───┘
              └─ OpenAI: 질문 해석·문장 작성만. 숫자·학교명은 위 두 함수 결과에서만 사용
```

- 원본 테이블(`vtn_education.*`)은 RLS로 잠겨 있고, 방문자는 위 두 함수만 호출할 수 있습니다.
- 2026년 수치는 `program_region_stats.is_canonical = true` 행(17개 시도교육청 명단 집계, 전국 1,171교)입니다.
- 집계 기준·주의 문구는 `vtn_education.public_stat_notes`에서 고치면 표와 챗봇에 함께 반영됩니다.
- 함수 정의: `supabase/migrations/20261106_public_ai_school_read_api.sql`

## 배포 전 설정 (Vercel → Project → Settings → Environment Variables)

| 이름 | 값 | 비고 |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API 키 | **필수.** Production·Preview 모두. 코드·저장소에 넣지 마세요 |
| `OPENAI_MODEL` | `gpt-5.4-mini` | 선택 |
| `ALLOWED_ORIGINS` | `https://view-tiful-edu-news.vercel.app,...` | 선택. 커스텀 도메인을 붙이면 여기에 추가 |

키가 없으면 챗봇은 "아직 설정되지 않았습니다"를 표시하고, 통계 표는 키 없이도 동작합니다.

## 비용·악용 방지

- `api/chat.js`: 질문 400자, 이전 대화 6턴, 도구 호출 4회, 답변 900토큰 상한. IP당 분당 8회·하루 80회(인스턴스별 최선 노력).
- **권장 1:** OpenAI 대시보드 → Limits에서 월 사용 한도(Hard limit)를 설정하세요.
- **권장 2:** Vercel → Firewall → Rate limiting 규칙으로 `/api/chat`에 IP당 분당 10회 정도 제한을 추가하세요(서버리스 인스턴스 간 공유되는 확실한 제한).

## 확인 방법

1. Preview 배포 주소에서 `category.html?type=digital` 열기 → 2026년 표 17개 지역, 전국 1,171교 확인
2. 대전 중학교 숫자(7) 클릭 → 학교 7곳 목록
3. 연도 2025 선택 → 미확인 지역, 전국 "산출 불가" 표시
4. 챗봇 예시 질문 3개 눌러 보기, "수능 일정 알려줘" 같은 범위 밖 질문이 거절되는지 확인

## 기존 구성에서 바뀐 점

- `pages.js`가 더 이상 `http://127.0.0.1:8000`(로컬 FastAPI + MySQL)을 호출하지 않습니다. `view-tiful-edu-news-api/`는 위젯에서 쓰지 않습니다.
- 학교 명단은 2026년 AI 중점학교만 제공하므로, 과거 연도 표의 숫자는 클릭할 수 없습니다.
