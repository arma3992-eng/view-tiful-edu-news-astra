import os
from contextlib import closing
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="뷰티풀 에듀 학교 통계 API")


def get_connection():
    return mysql.connector.connect(
        host=os.environ["DB_HOST"],
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        connection_timeout=5,
    )


@app.get("/api/school-stats")
def school_stats(year: int = Query(default=2026, ge=2000, le=2100)):
    sql = """
        SELECT
            stat_year, program_name, region_name,
            elementary_count, middle_count, high_count,
            special_count, total_count,
            data_status, validation_status,
            source_title, source_url, source_locator,
            checked_on, notes
        FROM ai_school_region_year
        WHERE stat_year = %s
        ORDER BY region_name
    """

    try:
        with closing(get_connection()) as connection:
            with closing(connection.cursor(dictionary=True)) as cursor:
                cursor.execute(sql, (year,))
                rows = cursor.fetchall()
    except mysql.connector.Error as error:
        print(f"MySQL 오류 코드: {error.errno}")
        raise HTTPException(
            status_code=503,
            detail="DB 조회에 실패했습니다. 터미널의 오류 코드를 확인하세요.",
        ) from None

    return {"year": year, "count": len(rows), "items": rows}



# 기존 뉴스 사이트 폴더의 화면을 제공합니다.

@app.get("/api/schools")
def school_list(
    year: int = Query(ge=2000, le=2100),
    region: str = Query(min_length=1, max_length=30),
    level: str = Query(default="", max_length=20),
):
    sql = """
        SELECT DISTINCT
            s.school_id, s.school_name,
            s.region, s.district, s.school_level
        FROM schools AS s
        JOIN ai_focus_status AS f
            ON s.school_id = f.school_id
        WHERE f.selected = 1
          AND f.year = %s
          AND s.region = %s
    """
    values = [year, region]

    if level:
        sql += " AND s.school_level = %s"
        values.append(level)

    sql += " ORDER BY s.school_level, s.school_name, s.school_id"

    try:
        with closing(get_connection()) as connection:
            with closing(connection.cursor(dictionary=True)) as cursor:
                cursor.execute(sql, tuple(values))
                rows = cursor.fetchall()
    except mysql.connector.Error as error:
        print(f"MySQL 오류 코드: {error.errno}")
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

    # 기존 뉴스 사이트 폴더의 화면을 제공합니다.
SITE_DIR = BASE_DIR.parent / "view-tiful-edu-news-design"
app.mount("/", StaticFiles(directory=str(SITE_DIR), html=True), name="news")
