/* ============================================================
   US FLIGHT DELAY ANALYSIS — SQL SCRIPT
   Dataset: US DOT Reporting Carrier On-Time Performance
   (Kaggle: "Airline Delay and Cancellation Data")
   Author: Chandraboli Banerjee
   ============================================================
   Workflow: Excel (clean) -> SQL (this file, analyze) -> Power BI (visualize)
   Import the cleaned CSV from Excel into this table before running queries.
   ============================================================ */


/* ------------------------------------------------------------
   1. TABLE CREATION
   Adjust data types to match your SQL engine (MySQL/Postgres/SQLite).
   ------------------------------------------------------------ */

CREATE TABLE flight_delays (
    flight_date        DATE,
    airline             VARCHAR(50),
    tail_number         VARCHAR(20),
    origin              VARCHAR(10),
    dest                VARCHAR(10),
    dep_delay           INT,          -- minutes, negative = early
    arr_delay           INT,
    cancelled           TINYINT,      -- 1 = cancelled, 0 = not
    cancellation_reason VARCHAR(20),
    carrier_delay       INT,
    weather_delay       INT,
    nas_delay           INT,
    security_delay      INT,
    late_aircraft_delay INT,
    delay_status         VARCHAR(20),  -- 'Delayed' / 'On-Time' (from Excel)
    primary_delay_reason VARCHAR(30)   -- from Excel formula
);

-- Import cleaned CSV here using your SQL client's import wizard
-- (e.g. LOAD DATA INFILE in MySQL, \copy in Postgres)


/* ------------------------------------------------------------
   2. BASIC OVERVIEW / SANITY CHECKS
   ------------------------------------------------------------ */

-- Total flights and date range
SELECT
    COUNT(*)              AS total_flights,
    MIN(flight_date)      AS start_date,
    MAX(flight_date)      AS end_date
FROM flight_delays;

-- Overall on-time vs delayed split
SELECT
    delay_status,
    COUNT(*) AS num_flights,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM flight_delays), 2) AS pct
FROM flight_delays
GROUP BY delay_status;


/* ------------------------------------------------------------
   3. AIRLINE-WISE ANALYSIS
   ------------------------------------------------------------ */

-- Average delay and total flights per airline
SELECT
    airline,
    COUNT(*)                          AS total_flights,
    ROUND(AVG(dep_delay), 2)          AS avg_dep_delay,
    ROUND(AVG(arr_delay), 2)          AS avg_arr_delay,
    SUM(CASE WHEN cancelled = 1 THEN 1 ELSE 0 END)               AS cancelled_flights,
    ROUND(SUM(CASE WHEN cancelled = 1 THEN 1 ELSE 0 END) * 100.0
          / COUNT(*), 2)              AS cancellation_rate_pct
FROM flight_delays
GROUP BY airline
ORDER BY avg_dep_delay DESC;


/* ------------------------------------------------------------
   4. AIRPORT-WISE ANALYSIS
   ------------------------------------------------------------ */

-- Top 10 most delayed origin airports
SELECT
    origin,
    COUNT(*)                 AS total_departures,
    ROUND(AVG(dep_delay), 2) AS avg_dep_delay
FROM flight_delays
GROUP BY origin
ORDER BY avg_dep_delay DESC
LIMIT 10;

-- Top 10 most delayed routes (origin -> dest)
SELECT
    origin,
    dest,
    COUNT(*)                 AS total_flights,
    ROUND(AVG(arr_delay), 2) AS avg_arr_delay
FROM flight_delays
GROUP BY origin, dest
HAVING COUNT(*) > 50          -- ignore routes with too few flights
ORDER BY avg_arr_delay DESC
LIMIT 10;


/* ------------------------------------------------------------
   5. DELAY BUCKETING (CASE WHEN)
   ------------------------------------------------------------ */

SELECT
    CASE
        WHEN dep_delay <= 0            THEN 'Early/On-Time'
        WHEN dep_delay BETWEEN 1 AND 15  THEN '1-15 min'
        WHEN dep_delay BETWEEN 16 AND 60 THEN '16-60 min'
        WHEN dep_delay > 60             THEN '60+ min'
        ELSE 'Unknown'
    END AS delay_bucket,
    COUNT(*) AS num_flights
FROM flight_delays
GROUP BY delay_bucket
ORDER BY num_flights DESC;


/* ------------------------------------------------------------
   6. DELAY REASON BREAKDOWN
   ------------------------------------------------------------ */

SELECT
    'Carrier'  AS reason, SUM(carrier_delay)       AS total_minutes FROM flight_delays
UNION ALL
SELECT 'Weather', SUM(weather_delay)       FROM flight_delays
UNION ALL
SELECT 'NAS',      SUM(nas_delay)           FROM flight_delays
UNION ALL
SELECT 'Security', SUM(security_delay)      FROM flight_delays
UNION ALL
SELECT 'Late Aircraft', SUM(late_aircraft_delay) FROM flight_delays
ORDER BY total_minutes DESC;


/* ------------------------------------------------------------
   7. TIME TRENDS
   ------------------------------------------------------------ */

-- Monthly average delay trend
SELECT
    EXTRACT(YEAR FROM flight_date)  AS yr,
    EXTRACT(MONTH FROM flight_date) AS mo,
    ROUND(AVG(dep_delay), 2)        AS avg_dep_delay,
    COUNT(*)                        AS total_flights
FROM flight_delays
GROUP BY yr, mo
ORDER BY yr, mo;

-- Day-of-week pattern (useful for the heatmap in Power BI)
SELECT
    TO_CHAR(flight_date, 'Day')     AS day_of_week,  -- use DAYNAME() in MySQL
    ROUND(AVG(dep_delay), 2)        AS avg_dep_delay,
    COUNT(*)                        AS total_flights
FROM flight_delays
GROUP BY day_of_week
ORDER BY avg_dep_delay DESC;


/* ------------------------------------------------------------
   8. CASCADING DELAY ANALYSIS (WINDOW FUNCTION — LAG)
   Does a delayed flight cause the SAME aircraft's next flight
   to also be delayed?
   ------------------------------------------------------------ */

SELECT
    tail_number,
    flight_date,
    origin,
    dest,
    dep_delay,
    LAG(arr_delay) OVER (
        PARTITION BY tail_number
        ORDER BY flight_date
    ) AS previous_flight_arr_delay
FROM flight_delays
WHERE tail_number IS NOT NULL
ORDER BY tail_number, flight_date;

-- Correlation check: avg dep_delay when previous flight arrived late vs on-time
WITH lagged AS (
    SELECT
        tail_number,
        dep_delay,
        LAG(arr_delay) OVER (PARTITION BY tail_number ORDER BY flight_date) AS prev_arr_delay
    FROM flight_delays
)
SELECT
    CASE WHEN prev_arr_delay > 15 THEN 'Previous Flight Late'
         ELSE 'Previous Flight On-Time' END AS previous_status,
    ROUND(AVG(dep_delay), 2) AS avg_current_dep_delay,
    COUNT(*) AS num_flights
FROM lagged
WHERE prev_arr_delay IS NOT NULL
GROUP BY previous_status;


/* ------------------------------------------------------------
   9. CANCELLATIONS
   ------------------------------------------------------------ */

SELECT
    cancellation_reason,
    COUNT(*) AS num_cancellations
FROM flight_delays
WHERE cancelled = 1
GROUP BY cancellation_reason
ORDER BY num_cancellations DESC;

/* ============================================================
   END OF SCRIPT — export results of each query as needed
   and load into Power BI (or connect Power BI directly to
   this database via Get Data > SQL Server / MySQL / Postgres)
   ============================================================ */
