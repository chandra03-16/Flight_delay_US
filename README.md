# US Flight Delay Analysis — Project Guide
### SQL + Excel + Power BI (no code, no APIs)

**Author:** Chandraboli Banerjee
**Dataset:** US DOT Reporting Carrier On-Time Performance (available on Kaggle as "Airline Delay and Cancellation Data", 500K+ rows)

---

## 1. Excel — Data Cleaning

1. Import the raw CSV into Excel.
2. Remove exact duplicate rows (Data → Remove Duplicates).
3. Handle blanks:
   - If a flight was cancelled, delay values will be blank — leave as blank or set to `NULL` (don't set to 0, that would skew averages).
   - If not cancelled and delay is blank, set to `0`.
4. Convert `FlightDate` to proper Date format (Data → Text to Columns, or `=DATEVALUE()`).
5. Add helper columns:
   - `DelayStatus` → `=IF(DepDelay>15,"Delayed","On-Time")`
   - `PrimaryDelayReason` → use `INDEX/MATCH` with `MAX()` across the 5 delay-reason columns (Carrier, Weather, NAS, Security, Late Aircraft) to find which one contributed most.
6. Do a quick pivot table sanity check (e.g. flights per airline) to confirm the data looks right.
7. Save the cleaned file as `flight_delays_clean.csv` — this is what gets imported into SQL.

---

## 2. SQL — Analysis

Use `flight_delay_analysis.sql` (attached). It's organized into sections:

1. **Table creation** — schema for the cleaned data
2. **Sanity checks** — total flights, date range, on-time vs delayed split
3. **Airline-wise** — average delay & cancellation rate per airline
4. **Airport/route-wise** — most delayed airports and routes
5. **Delay bucketing** — `CASE WHEN` to group delays into ranges
6. **Delay reason breakdown** — carrier vs weather vs NAS vs security vs late aircraft
7. **Time trends** — monthly and day-of-week patterns
8. **Cascading delay analysis** — `LAG()` window function to check if a late-arriving aircraft causes its next flight to also be late
9. **Cancellations** — breakdown by reason

Run these in any SQL engine (MySQL, PostgreSQL, or even SQLite). Export result sets as CSV, or connect Power BI directly to the database.

---

## 3. Power BI — Dashboard

Connect Power BI to either your SQL database (Get Data → SQL Server/Postgres/MySQL) or the exported CSVs. Build these 7 visuals:

| # | Visual | Data |
|---|--------|------|
| 1 | KPI cards | Total flights, avg delay (min), % on-time |
| 2 | Bar chart | Avg delay by airline |
| 3 | Line chart | Delay trend over months |
| 4 | Pie/donut chart | Delay reason breakdown (Carrier/Weather/NAS/Security/Late Aircraft) |
| 5 | Bar chart | Top 10 delayed airports/routes |
| 6 | Heatmap (matrix) | Day of week × hour of day, colored by avg delay |
| 7 | Bar chart | Cancellation rate by airline |


## Workflow Summary

```
Raw CSV (Kaggle/DOT)
      │
      ▼
   Excel  →  clean data, add helper columns, export clean CSV
      │
      ▼
    SQL   →  import, run analysis queries (flight_delay_analysis.sql)
      │
      ▼
  Power BI →  connect to SQL/CSV, build 7-visual dashboard
```
