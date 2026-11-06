'use strict';
// AI 중점학교 공개 데이터 조회 (Supabase 읽기 전용 RPC)
// - 숫자는 Supabase 함수 public.ai_school_stats / public.ai_school_list 에서만 나옵니다.
// - publishable 키는 브라우저 공개용이며, 원본 테이블은 RLS로 잠겨 있어 이 두 함수만 호출할 수 있습니다.
(() => {
  const SUPABASE_URL = 'https://yrldislzvbpxbpgreipi.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OLmPjZk8BuKinxCpWIbRUQ_oMmVavpX';

  async function rpc(name, args) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!response.ok) throw new Error(`${name} 조회 실패 (${response.status})`);
    return response.json();
  }

  window.ViewtifulAiSchools = {
    // { year, count, basis, national_total, national_all_school_count, program_names[], notes[], items[] }
    stats(year = 2026) {
      return rpc('ai_school_stats', { p_year: Number(year) });
    },
    // { year, region, level, count, roster_available, items[{school_name, school_level, region_name, district, operation_type, also_digital_leading}] }
    list({ year = 2026, region = null, level = null, query = null, limit = 300 } = {}) {
      return rpc('ai_school_list', {
        p_year: Number(year), p_region: region || null, p_level: level || null,
        p_query: query || null, p_limit: limit
      });
    }
  };
})();
