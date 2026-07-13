import { SqlQuery } from "../types";

export const SQL_QUERIES: SqlQuery[] = [
  {
    id: "avg_delay_airline",
    title: "1. Average Delay by Airline",
    description: "Calculate the average departure and arrival delay for each airline, along with total flight volume, ordered by worst arrival delay.",
    query: `SELECT 
    Airline,
    COUNT(*) as Total_Flights,
    ROUND(AVG(Dep_Delay), 2) as Avg_Dep_Delay,
    ROUND(AVG(Arr_Delay), 2) as Avg_Arr_Delay,
    SUM(CASE WHEN Cancelled = 1 THEN 1 ELSE 0 END) as Cancelled_Flights
FROM flights
GROUP BY Airline
ORDER BY Avg_Arr_Delay DESC;`,
    explanation: "This query uses aggregate functions (COUNT, AVG, SUM) and GROUP BY to summarize delay performance at the carrier level. It handles cancellations safely since cancelled flights have NULL delay values which AVG automatically excludes.",
    interviewInsight: "In interviews, highlight how you handle NULLs in aggregations. Explain that in SQL, AVG() ignores NULLs (like cancelled flights), preventing skew. Point out that JetBlue or Southwest might show higher delays because of their tight hub networks or short aircraft turnaround slots."
  },
  {
    id: "on_time_performance",
    title: "2. On-Time Performance (OTP) Ranking",
    description: "Rank airlines by their On-Time Performance percentage. A flight is legally 'on-time' if it departs or arrives within 15 minutes of its scheduled time.",
    query: `SELECT 
    Airline,
    COUNT(*) as Total_Flights,
    SUM(CASE WHEN Dep_Delay <= 15 AND Cancelled = 0 THEN 1 ELSE 0 END) as On_Time_Flights,
    ROUND(
        (SUM(CASE WHEN Dep_Delay <= 15 AND Cancelled = 0 THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100, 
        2
    ) as On_Time_Percentage
FROM flights
GROUP BY Airline
ORDER BY On_Time_Percentage DESC;`,
    explanation: "Here, we use conditional aggregation (SUM CASE WHEN) to count how many flights met the FAA on-time threshold of <= 15 minutes, divided by the total count. This provides the industry-standard OTP metric.",
    interviewInsight: "OTP is the gold-standard KPI for airline operations. Talk about how Southwest's point-to-point business model makes them susceptible to delays propagating throughout the day, while Delta's hub-and-spoke model allows them to isolate delays more effectively, giving Delta a superior OTP."
  },
  {
    id: "delay_cause_breakdown",
    title: "3. Delay Cause Breakdown",
    description: "Analyze the root causes of delays. The US DOT breaks delays into 5 categories: Carrier, Weather, National Airspace System (NAS), Security, and Late Aircraft.",
    query: `SELECT 
    SUM(CASE WHEN Carrier_Delay > 0 THEN 1 ELSE 0 END) as Carrier_Delay_Incidents,
    ROUND(AVG(CASE WHEN Carrier_Delay > 0 THEN Carrier_Delay END), 1) as Avg_Carrier_Delay_Mins,
    
    SUM(CASE WHEN Weather_Delay > 0 THEN 1 ELSE 0 END) as Weather_Delay_Incidents,
    ROUND(AVG(CASE WHEN Weather_Delay > 0 THEN Weather_Delay END), 1) as Avg_Weather_Delay_Mins,
    
    SUM(CASE WHEN NAS_Delay > 0 THEN 1 ELSE 0 END) as NAS_Delay_Incidents,
    ROUND(AVG(CASE WHEN NAS_Delay > 0 THEN NAS_Delay END), 1) as Avg_NAS_Delay_Mins,
    
    SUM(CASE WHEN Late_Aircraft_Delay > 0 THEN 1 ELSE 0 END) as Late_Aircraft_Incidents,
    ROUND(AVG(CASE WHEN Late_Aircraft_Delay > 0 THEN Late_Aircraft_Delay END), 1) as Avg_Late_Aircraft_Mins
FROM flights;`,
    explanation: "This query utilizes conditional AVG and SUM to calculate both the frequency (count) and severity (average duration) of delays by department/cause. It filters out non-delayed legs so that average minutes reflect actual delayed legs.",
    interviewInsight: "Knowing delay categories is crucial for domain expertise. Carrier delays are within airline control (maintenance, crew). NAS delays represent airport congestion and air traffic control. Late Aircraft delays are reactive. Highlight that while Weather gets the most news coverage, Late Aircraft and NAS are statistically far more common."
  },
  {
    id: "worst_airports",
    title: "4. Top Worst Origin Airports",
    description: "Identify the top worst origin airports by average departure delay, restricting the analysis to airports with at least 30 scheduled departures.",
    query: `SELECT 
    Origin,
    Origin_City,
    COUNT(*) as Departures,
    ROUND(AVG(Dep_Delay), 2) as Avg_Dep_Delay,
    MAX(Dep_Delay) as Max_Dep_Delay
FROM flights
GROUP BY Origin, Origin_City
HAVING COUNT(*) >= 30
ORDER BY Avg_Dep_Delay DESC;`,
    explanation: "This query leverages the HAVING clause to filter groups after aggregation, ensuring that low-volume regional airports don't skew the results. It ranks the worst major airports by departure delay.",
    interviewInsight: "This query showcases your understanding of the SQL Logical Query Processing Order (FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY). Point out that Chicago ORD and New York JFK regularly rank high here due to winter weather and high congestion."
  },
  {
    id: "cascading_delays_lag",
    title: "5. Cascading Delay Tracking (Window Functions)",
    description: "Track how a delay on an aircraft's previous leg cascades into its next flight. We use the LAG() window function to compare a flight's delay with its immediate predecessor.",
    query: `WITH flight_sequence AS (
    SELECT 
        Tail_Number,
        Flight_Date,
        Flight_Num,
        Origin,
        Dest,
        Scheduled_Dep_Time,
        Dep_Delay,
        LAG(Dep_Delay, 1) OVER (
            PARTITION BY Tail_Number, Flight_Date 
            ORDER BY Scheduled_Dep_Time
        ) as Prev_Dep_Delay,
        LAG(Dest, 1) OVER (
            PARTITION BY Tail_Number, Flight_Date 
            ORDER BY Scheduled_Dep_Time
        ) as Prev_Dest
    FROM flights
    WHERE Cancelled = 0
)
SELECT *
FROM flight_sequence
WHERE Prev_Dep_Delay > 15
ORDER BY Tail_Number, Scheduled_Dep_Time
LIMIT 50;`,
    explanation: "Using a Common Table Expression (CTE) and the LAG() window function partitioned by Tail_Number and Flight_Date, we fetch the previous flight's delay. We then filter for records where the previous flight departed >15 minutes late, proving delay propagation.",
    interviewInsight: "This is a high-level window function query. Explain that partitioning by both Tail_Number and Flight_Date isolates a single physical aircraft's daily rotation. Tell the interviewer how tracking cascading delays is essential for network optimization and dynamic airline scheduling."
  },
  {
    id: "monthly_seasonal_trend",
    title: "6. Monthly and Seasonal Delay Trends",
    description: "Analyze delay volume and average arrival delays by month to identify seasonal high-pressure spikes (Winter storm season vs Summer travel congestion).",
    query: `SELECT 
    SUBSTR(Flight_Date, 6, 2) as Month_Num,
    CASE 
        WHEN SUBSTR(Flight_Date, 6, 2) IN ('12', '01', '02') THEN 'Winter'
        WHEN SUBSTR(Flight_Date, 6, 2) IN ('03', '04', '05') THEN 'Spring'
        WHEN SUBSTR(Flight_Date, 6, 2) IN ('06', '07', '08') THEN 'Summer'
        ELSE 'Autumn'
    END as Season,
    COUNT(*) as Flight_Count,
    ROUND(AVG(Arr_Delay), 2) as Avg_Arr_Delay,
    ROUND(SUM(CASE WHEN Arr_Delay > 15 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as Delay_Rate_Percent
FROM flights
GROUP BY Month_Num, Season
ORDER BY Month_Num;`,
    explanation: "This query extracts the month code from the Date string, maps months into physical meteorological seasons using a CASE statement, and calculates volume and delay rates.",
    interviewInsight: "Seasonal trends are extremely valuable for capacity planning. In winter, weather delays dominate (de-icing, blizzards), while in summer, volume-induced NAS delays dominate. Highlighting this business insight in an interview demonstrates that you aren't just a coder, but a business-focused analyst."
  }
];
