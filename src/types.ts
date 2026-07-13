/**
 * Shared Type Definitions for US Flight Delay Portfolio Dashboard
 */

export interface Flight {
  Flight_Date: string;      // YYYY-MM-DD
  Airline: string;          // Carrier Name (e.g., Delta Air Lines)
  Flight_Num: string;       // e.g., DL123
  Tail_Number: string;      // e.g., N101DA (important for aircraft tracking)
  Origin: string;           // Airport code (e.g., ORD)
  Origin_City: string;      // City Name (e.g., Chicago, IL)
  Dest: string;             // Airport code (e.g., LGA)
  Dest_City: string;        // City Name (e.g., New York, NY)
  Scheduled_Dep_Time: string; // HH:MM
  Actual_Dep_Time: string | null;  // HH:MM or null if cancelled
  Dep_Delay: number | null; // departure delay minutes or null
  Scheduled_Arr_Time: string; // HH:MM
  Actual_Arr_Time: string | null;  // HH:MM or null
  Arr_Delay: number | null; // arrival delay minutes or null
  Carrier_Delay: number;    // Carrier delay minutes
  Weather_Delay: number;    // Weather delay minutes
  NAS_Delay: number;        // National Airspace System delay minutes
  Security_Delay: number;   // Security delay minutes
  Late_Aircraft_Delay: number; // Late aircraft delay minutes
  Cancelled: number;        // 0 or 1
  Cancellation_Reason: string | null; // A = Carrier, B = Weather, C = NAS, D = Security
}

// Cleaned version types which will include added Excel/SQL columns
export interface CleanedFlight extends Flight {
  Delay_Category?: 'On-Time' | 'Minor Delay' | 'Major Delay' | 'Cancelled';
  Season?: 'Winter' | 'Spring' | 'Summer' | 'Fall';
  Day_Of_Week?: string;     // Monday, Tuesday, etc.
  Hour_Of_Day?: number;     // 0-23 (derived from Scheduled_Dep_Time)
}

export interface SqlQuery {
  id: string;
  title: string;
  description: string;
  query: string;
  explanation: string;
  interviewInsight: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface PowerBiFilters {
  airline: string;
  airport: string;
  month: string;
  delayCause: string;
}

export interface Kpis {
  totalFlights: number;
  onTimeRate: number;
  avgDelay: number;
  cancelledCount: number;
  mostDelayedRoute: string;
}
