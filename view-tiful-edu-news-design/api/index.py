"""Read-only school queries. Vercel provides credentials via server environment only."""
import os
from contextlib import closing, contextmanager

import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Query

app = FastAPI(title="뷰티풀 에듀 학교 통계 API", docs_url=None, redoc_url=None, openapi_url=None)


class _DBDiagnosticError(Exception):
    pass


@contextmanager
def _diagnostic_stage(stage):
    try:
        yield
    except _DBDiagnosticError:
        raise
    except Exception as error:
        # Never log exception text, traceback, environment values or connection info.
        print(f"DB diagnostic stage={stage}, error={type(error).__name__}", flush=True)
        raise _DBDiagnosticError() from None


def get_connection():
    with _diagnostic_stage("env_read"):
        host = os.environ["SUPABASE_DB_HOST"]
        port_raw = os.getenv("SUPABASE_DB_PORT", "5432")
        user = os.environ["SUPABASE_DB_USER"]
        password = os.environ["SUPABASE_DB_PASSWORD"]
        dbname = os.environ["SUPABASE_DB_NAME"]
    with _diagnostic_stage("port_parse"):
        port = int(port_raw)
    with _diagnostic_stage("psycopg_connect"):
        connection = psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
            connect_timeout=5,
            sslmode="require",
            client_encoding="UTF8",
            row_factory=dict_row,
        )
    with _diagnostic_stage("set_read_only"):
        connection.read_only = True
    return connection


@app.get("/api/school-stats")
def school_stats(year: int = Query(default=2026, ge=2000, le=2100)):
    sql = """
        WITH ranked_stats AS (
            SELECT
                s.*, p.program_name,
                COALESCE(s.legacy_payload->>'source_title', e.title) AS source_title,
                COALESCE(s.legacy_payload->>'source_url', e.url) AS source_url,
                ROW_NUMBER() OVER (
                    PARTITION BY s.stat_year, s.program_id, s.region_name
                    ORDER BY
                        CASE WHEN s.stat_basis = 'roster_derived' THEN 0 ELSE 1 END,
                        s.checked_on DESC NULLS LAST, s.id
                ) AS source_rank
            FROM vtn_education.program_region_stats AS s
            JOIN vtn_education.education_programs AS p ON p.id = s.program_id
            LEFT JOIN vtn_education.education_sources AS e ON e.id = s.source_id
            WHERE s.stat_year = %s
              AND p.program_code = CASE
                  WHEN s.stat_year >= 2026 THEN 'ai_focus_school'
                  WHEN s.stat_year >= 2024 THEN 'legacy_ai_information_center'
                  WHEN s.stat_year >= 2021 THEN 'legacy_ai_education_leading'
                  ELSE 'legacy_sw_ai_pilot'
              END
              AND (s.stat_basis = 'source_reported'
                   OR (s.stat_year = 2026 AND s.stat_basis = 'roster_derived'))
        )
        SELECT
            stat_year, program_name, region_name,
            elementary_count, middle_count, high_count,
            special_count, total_count,
            CASE WHEN stat_basis = 'roster_derived' THEN '명단 재집계'
                 ELSE COALESCE(legacy_payload->>'data_status', '원문수록')
            END AS data_status,
            verification_status AS validation_status,
            source_title, source_url, source_locator,
            checked_on, notes
        FROM ranked_stats
        WHERE source_rank = 1
        ORDER BY region_name
    """

    try:
        with closing(get_connection()) as connection:
            with _diagnostic_stage("execute_query"), closing(connection.cursor()) as cursor:
                cursor.execute(sql, (year,))
                with _diagnostic_stage("fetch_rows"):
                    rows = cursor.fetchall()
    except _DBDiagnosticError:
        raise HTTPException(
            status_code=503,
            detail="DB 조회에 실패했습니다. 터미널의 오류 코드를 확인하세요.",
        ) from None

    return {"year": year, "count": len(rows), "items": rows}


@app.get("/api/schools")
def school_list(
    year: int = Query(ge=2000, le=2100),
    region: str = Query(min_length=1, max_length=30),
    level: str = Query(default="", max_length=20),
):
    sql = """
        SELECT school_id, school_name, region, district, school_level
        FROM (
            SELECT DISTINCT ON (s.region_name, s.school_name)
                s.id AS school_id, s.school_name,
                s.region_name AS region, s.district_raw AS district, s.school_level
            FROM vtn_education.school_program_participation AS s
            JOIN vtn_education.education_programs AS p ON p.id = s.program_id
            WHERE p.program_code = 'ai_focus_school'
              AND s.stat_year = %s
              AND s.region_name = %s
    """
    values = [year, region]

    if level:
        sql += " AND s.school_level = %s"
        values.append(level)

    sql += """
            ORDER BY s.region_name, s.school_name, s.checked_on DESC, s.id
        ) AS schools
        ORDER BY school_level, school_name, school_id
    """

    try:
        with closing(get_connection()) as connection:
            with _diagnostic_stage("execute_query"), closing(connection.cursor()) as cursor:
                cursor.execute(sql, tuple(values))
                with _diagnostic_stage("fetch_rows"):
                    rows = cursor.fetchall()
    except _DBDiagnosticError:
        raise HTTPException(
            status_code=503,
            detail="학교 목록 조회에 실패했습니다.",
        ) from None

    return {
        "year": year,
        "region": region,
        "level": level,
        "count": len(rows),
        "items": rows,
    }
