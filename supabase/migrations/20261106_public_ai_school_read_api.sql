-- 2026-11-06 Supabase에 적용 완료 (기록용 사본)
-- 일반 방문자용 읽기 전용 조회 API: 뷰티풀 에듀 AI 중점학교 통계 위젯·챗봇
-- 원본 테이블(vtn_education.*)은 RLS로 잠근 채, 공개 가능한 항목만 아래 두 함수로 반환한다.

create table if not exists vtn_education.public_stat_notes (
  stat_year smallint not null,
  note_order smallint not null,
  note text not null,
  primary key (stat_year, note_order)
);
alter table vtn_education.public_stat_notes enable row level security;
comment on table vtn_education.public_stat_notes is '공개 화면·챗봇에 표시하는 연도별 집계 기준/주의 문구. stat_year=0은 모든 연도 공통.';

insert into vtn_education.public_stat_notes (stat_year, note_order, note) values
 (0, 1, '연도별로 사업 이름과 선정 기준이 달라, 연도 간 학교 수를 단순 비교해 증감을 판단할 수 없습니다.'),
 (2020, 1, '2020년은 ''SW교육 선도학교 내 AI교육 시범운영교'' 기준으로, 이후 AI 학교 사업과 성격이 다릅니다.'),
 (2021, 1, '2021년 원자료의 전국 계(596교)와 지역 합계(566교)가 일치하지 않습니다. 지역별 수치를 기준으로 표시합니다.'),
 (2023, 1, '2023년 전북은 원자료의 지역 합계(106교)와 학교급 합계(105교)가 일치하지 않습니다.'),
 (2024, 1, '2024~2025년은 ''AI·정보교육 중심학교'' 사업 기준입니다.'),
 (2025, 1, '2025년은 17개 시도 중 7곳의 수치만 확인되어 전국 합계를 낼 수 없습니다. ''미확인''은 0개라는 뜻이 아닙니다.'),
 (2026, 1, '2026년은 17개 시도교육청이 공개한 AI 중점학교 선정 명단을 모두 확인해 집계했습니다(2026년 11월 확인).'),
 (2026, 2, '한국과학창의재단 AI중점학교 연구지원센터 공개 현황(1,163교), 교육부 발표(1,141교, 2026년 3월)와는 집계 시점·기준 차이로 숫자가 다를 수 있습니다.')
on conflict (stat_year, note_order) do update set note = excluded.note;

-- 1) 지역별·학교급별 통계 (2026: is_canonical 기준값 / 그 외: 원자료 수록 통계)
create or replace function public.ai_school_stats(p_year integer default 2026)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with focus as (
    select id from vtn_education.education_programs where program_code = 'ai_focus_school'
  ),
  rows_ as (
    select s.*, p.program_name
    from vtn_education.program_region_stats s
    join vtn_education.education_programs p on p.id = s.program_id
    where s.stat_year = p_year
      and (
        (p_year = 2026 and s.program_id = (select id from focus) and s.is_canonical)
        or (p_year <> 2026 and s.stat_basis = 'source_reported')
      )
  ),
  census as (
    select region_name, total_count from vtn_education.school_census_region_year where stat_year = p_year
  ),
  items as (
    select jsonb_build_object(
      'region_name', r.region_name,
      'program_name', r.program_name,
      'elementary_count', r.elementary_count,
      'middle_count', r.middle_count,
      'high_count', r.high_count,
      'special_count', r.special_count,
      'total_count', r.total_count,
      'all_school_count', c.total_count,
      'ratio_pct', case when c.total_count > 0 and r.total_count is not null
                        then round(100.0 * r.total_count / c.total_count, 1) end,
      'data_status', case when r.total_count is null then '미확인'
                          when p_year = 2026 then '교육청 명단 확인'
                          else '원자료 수록' end,
      'validation_status', case
                          when r.total_count is null then '수치 미확인'
                          when p_year = 2026 then '명단 전수 대조'
                          when r.verification_status like '%불일치%' then '원자료 합계 불일치 있음'
                          when r.verification_status like '%대조완료%' then '합계 대조'
                          else '추가 확인 필요' end
    ) as item, r.region_name, r.total_count
    from rows_ r left join census c using (region_name)
  )
  select jsonb_build_object(
    'year', p_year,
    'count', (select count(*) from items),
    'program_names', coalesce((select jsonb_agg(distinct program_name) from rows_), '[]'::jsonb),
    'basis', case when p_year = 2026 then '17개 시도교육청 공개 명단 집계' else '원자료 수록 통계' end,
    'national_total', case when exists (select 1 from items where total_count is null) then null
                           else (select sum(total_count) from items) end,
    'national_all_school_count', (select sum(total_count) from census),
    'notes', coalesce((select jsonb_agg(note order by stat_year desc, note_order)
                       from vtn_education.public_stat_notes where stat_year in (p_year, 0)), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(item order by region_name) from items), '[]'::jsonb)
  );
$$;

-- 2) 학교 명단 조회·검색 (명단은 2026년 AI 중점학교만 보유)
create or replace function public.ai_school_list(
  p_year integer default 2026,
  p_region text default null,
  p_level text default null,
  p_query text default null,
  p_limit integer default 300
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      nullif(btrim(p_region), '') as region,
      case btrim(coalesce(p_level, ''))
        when '' then null when '초' then '초등학교' when '초등' then '초등학교'
        when '중' then '중학교' when '중등' then '중학교'
        when '고' then '고등학교' when '고등' then '고등학교'
        when '특수' then '특수학교' else btrim(p_level) end as level,
      nullif(left(btrim(coalesce(p_query, '')), 40), '') as q,
      least(greatest(coalesce(p_limit, 300), 1), 500) as lim
  ),
  digital as (
    select sp.region_name, sp.school_name
    from vtn_education.school_program_participation sp
    join vtn_education.education_programs p on p.id = sp.program_id
    where p.program_code = 'ai_digital_leading_school' and sp.stat_year = p_year
  ),
  matched as (
    select sp.region_name, sp.school_name, sp.school_level, sp.district_raw, sp.operation_type
    from vtn_education.school_program_participation sp
    join vtn_education.education_programs p on p.id = sp.program_id, params
    where p.program_code = 'ai_focus_school'
      and sp.stat_year = p_year
      and (params.region is null or sp.region_name = params.region)
      and (params.level is null or sp.school_level = params.level)
      and (params.q is null or sp.school_name like '%' || replace(replace(params.q, '%', ''), '_', '') || '%')
  )
  select jsonb_build_object(
    'year', p_year,
    'region', (select region from params),
    'level', (select level from params),
    'count', (select count(*) from matched),
    'roster_available', p_year = 2026,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'school_name', m.school_name,
        'school_level', m.school_level,
        'region_name', m.region_name,
        'district', m.district_raw,
        'operation_type', m.operation_type,
        'also_digital_leading', exists (select 1 from digital d where d.region_name = m.region_name and d.school_name = m.school_name)
      ) order by m.region_name,
          case m.school_level when '초등학교' then 1 when '중학교' then 2 when '고등학교' then 3 else 4 end,
          m.school_name)
      from (select * from matched order by region_name, school_level, school_name limit (select lim from params)) m
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.ai_school_stats(integer) from public;
revoke all on function public.ai_school_list(integer, text, text, text, integer) from public;
grant execute on function public.ai_school_stats(integer) to anon, authenticated, service_role;
grant execute on function public.ai_school_list(integer, text, text, text, integer) to anon, authenticated, service_role;

-- 3) 보안 정리: 트리거 전용 함수의 REST 호출 차단 (별도 마이그레이션 revoke_rpc_on_handle_new_user 로 적용)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
