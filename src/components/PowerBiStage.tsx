import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { 
  Map, 
  Filter, 
  Info, 
  Layout, 
  ChevronDown, 
  RefreshCw, 
  Activity, 
  Percent, 
  Clock, 
  Ban, 
  Plane,
  HelpCircle,
  BookOpen
} from "lucide-react";
import { CleanedFlight, Flight, PowerBiFilters, Kpis } from "../types";

interface PowerBiStageProps {
  rawFlights: Flight[];
  cleanedFlights: CleanedFlight[];
}

// Fixed coordinates of airports for our SVG Geo Bubble Map
const AIRPORT_COORDS: Record<string, { name: string; x: number; y: number }> = {
  SFO: { name: "San Francisco", x: 8, y: 40 },
  LAX: { name: "Los Angeles", x: 12, y: 68 },
  DEN: { name: "Denver", x: 38, y: 46 },
  DFW: { name: "Dallas-Ft. Worth", x: 50, y: 74 },
  ORD: { name: "Chicago O'Hare", x: 68, y: 32 },
  ATL: { name: "Atlanta Hartsfield", x: 78, y: 60 },
  JFK: { name: "New York JFK", x: 90, y: 28 },
};

export default function PowerBiStage({ rawFlights, cleanedFlights }: PowerBiStageProps) {
  const [filters, setFilters] = useState<PowerBiFilters>({
    airline: "All",
    airport: "All",
    month: "All",
    delayCause: "All",
  });

  const [guideTab, setGuideTab] = useState<"visuals" | "dax">("visuals");

  // Determine which dataset to use (cleaned gets priority, fallback to raw so dashboard is never empty)
  const activeDataset = useMemo(() => {
    return cleanedFlights.length > 0 ? cleanedFlights : rawFlights;
  }, [cleanedFlights, rawFlights]);

  const isUsingRawFallback = cleanedFlights.length === 0;

  // Filter lists derived dynamically from dataset
  const uniqueAirlines = useMemo(() => {
    const set = new Set(activeDataset.map(f => f.Airline));
    return ["All", ...Array.from(set)].sort();
  }, [activeDataset]);

  const uniqueAirports = useMemo(() => {
    const set = new Set<string>();
    activeDataset.forEach(f => {
      set.add(f.Origin);
      set.add(f.Dest);
    });
    return ["All", ...Array.from(set)].sort();
  }, [activeDataset]);

  const months = [
    { code: "All", name: "All Months" },
    { code: "01", name: "January" },
    { code: "02", name: "February" },
    { code: "03", name: "March" },
    { code: "04", name: "April" },
    { code: "05", name: "May" },
    { code: "06", name: "June" },
    { code: "07", name: "July" },
    { code: "08", name: "August" },
    { code: "09", name: "September" },
    { code: "10", name: "October" },
    { code: "11", name: "November" },
    { code: "12", name: "December" },
  ];

  // Apply filters to active dataset
  const filteredFlights = useMemo(() => {
    return activeDataset.filter(f => {
      if (filters.airline !== "All" && f.Airline !== filters.airline) return false;
      
      if (filters.airport !== "All") {
        if (f.Origin !== filters.airport && f.Dest !== filters.airport) return false;
      }
      
      if (filters.month !== "All") {
        const m = f.Flight_Date.split("-")[1];
        if (m !== filters.month) return false;
      }
      
      if (filters.delayCause !== "All") {
        if (filters.delayCause === "Carrier" && f.Carrier_Delay <= 0) return false;
        if (filters.delayCause === "Weather" && f.Weather_Delay <= 0) return false;
        if (filters.delayCause === "NAS" && f.NAS_Delay <= 0) return false;
        if (filters.delayCause === "Late Aircraft" && f.Late_Aircraft_Delay <= 0) return false;
      }
      
      return true;
    });
  }, [activeDataset, filters]);

  // Compute KPIs
  const kpis = useMemo((): Kpis => {
    const total = filteredFlights.length;
    if (total === 0) {
      return { totalFlights: 0, onTimeRate: 0, avgDelay: 0, cancelledCount: 0, mostDelayedRoute: "N/A" };
    }

    const nonCancelled = filteredFlights.filter(f => f.Cancelled === 0);
    const cancelledCount = filteredFlights.filter(f => f.Cancelled === 1).length;
    
    // On-Time: Dep_Delay <= 15
    const onTimeCount = nonCancelled.filter(f => (f.Dep_Delay ?? 0) <= 15).length;
    const onTimeRate = total > 0 ? (onTimeCount / total) * 100 : 0;

    // Avg Delay
    const totalDelay = nonCancelled.reduce((sum, f) => sum + (f.Arr_Delay ?? 0), 0);
    const avgDelay = nonCancelled.length > 0 ? totalDelay / nonCancelled.length : 0;

    // Most Delayed Route
    const routes: Record<string, { count: number; totalDelay: number }> = {};
    nonCancelled.forEach(f => {
      const key = `${f.Origin} ➔ ${f.Dest}`;
      if (!routes[key]) routes[key] = { count: 0, totalDelay: 0 };
      routes[key].count += 1;
      routes[key].totalDelay += (f.Arr_Delay ?? 0);
    });

    let mostDelayedRoute = "N/A";
    let maxAvg = -1;
    Object.keys(routes).forEach(key => {
      const r = routes[key];
      if (r.count >= 3) { // minimum threshold of flights
        const avg = r.totalDelay / r.count;
        if (avg > maxAvg) {
          maxAvg = avg;
          mostDelayedRoute = `${key} (${Math.round(avg)}m)`;
        }
      }
    });

    return {
      totalFlights: total,
      onTimeRate,
      avgDelay,
      cancelledCount,
      mostDelayedRoute,
    };
  }, [filteredFlights]);

  // Compute Chart 1: Airline OTP Bar Chart
  const airlineChartData = useMemo(() => {
    const carrierGroups: Record<string, { total: number; onTime: number }> = {};
    filteredFlights.forEach(f => {
      const carrier = f.Airline;
      if (!carrierGroups[carrier]) carrierGroups[carrier] = { total: 0, onTime: 0 };
      carrierGroups[carrier].total += 1;
      if (f.Cancelled === 0 && (f.Dep_Delay ?? 0) <= 15) {
        carrierGroups[carrier].onTime += 1;
      }
    });

    return Object.keys(carrierGroups).map(carrier => {
      const g = carrierGroups[carrier];
      const nameShort = carrier.replace(" Air Lines", "").replace(" Airlines", "").replace(" Airways", "");
      return {
        name: nameShort,
        "On-Time %": parseFloat(((g.onTime / g.total) * 100).toFixed(1)),
        Volume: g.total
      };
    }).sort((a, b) => b["On-Time %"] - a["On-Time %"]);
  }, [filteredFlights]);

  // Compute Chart 2: Delay Cause Pie Chart
  const causeChartData = useMemo(() => {
    let carrier = 0;
    let weather = 0;
    let nas = 0;
    let lateAircraft = 0;
    let security = 0;

    filteredFlights.forEach(f => {
      if (f.Cancelled === 0) {
        carrier += f.Carrier_Delay;
        weather += f.Weather_Delay;
        nas += f.NAS_Delay;
        lateAircraft += f.Late_Aircraft_Delay;
        security += f.Security_Delay;
      }
    });

    const totalDelayMins = carrier + weather + nas + lateAircraft + security;
    if (totalDelayMins === 0) return [];

    return [
      { name: "Late Aircraft", value: lateAircraft, color: "#f59e0b" },
      { name: "Carrier", value: carrier, color: "#0ea5e9" },
      { name: "NAS (Airspace)", value: nas, color: "#6366f1" },
      { name: "Weather", value: weather, color: "#ef4444" },
      { name: "Security", value: security, color: "#10b981" },
    ].filter(d => d.value > 0);
  }, [filteredFlights]);

  // Compute Chart 3: Monthly Delay Trends Line Chart
  const monthlyChartData = useMemo(() => {
    const monthlyGroups: Record<string, { total: number; delayMins: number }> = {};
    // Initialize months
    for (let i = 1; i <= 12; i++) {
      const key = i.toString().padStart(2, '0');
      monthlyGroups[key] = { total: 0, delayMins: 0 };
    }

    filteredFlights.forEach(f => {
      const monthKey = f.Flight_Date.split("-")[1];
      if (monthlyGroups[monthKey] && f.Cancelled === 0) {
        monthlyGroups[monthKey].total += 1;
        monthlyGroups[monthKey].delayMins += (f.Arr_Delay ?? 0);
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return Object.keys(monthlyGroups).map((monthKey, idx) => {
      const g = monthlyGroups[monthKey];
      return {
        name: monthNames[idx],
        "Avg Delay": g.total > 0 ? parseFloat((g.delayMins / g.total).toFixed(1)) : 0,
        Volume: g.total
      };
    });
  }, [filteredFlights]);

  // Compute Airport metrics for SVG Map
  const airportMapMetrics = useMemo(() => {
    const airports: Record<string, { total: number; totalDelay: number }> = {};
    Object.keys(AIRPORT_COORDS).forEach(code => {
      airports[code] = { total: 0, totalDelay: 0 };
    });

    filteredFlights.forEach(f => {
      if (f.Cancelled === 0) {
        if (airports[f.Origin]) {
          airports[f.Origin].total += 1;
          airports[f.Origin].totalDelay += (f.Dep_Delay ?? 0);
        }
        if (airports[f.Dest]) {
          airports[f.Dest].total += 1;
          airports[f.Dest].totalDelay += (f.Arr_Delay ?? 0);
        }
      }
    });

    return Object.keys(airports).map(code => {
      const a = airports[code];
      const avg = a.total > 0 ? a.totalDelay / a.total : 0;
      return {
        code,
        coords: AIRPORT_COORDS[code],
        volume: a.total,
        avgDelay: avg
      };
    });
  }, [filteredFlights]);

  // Compute Day x Hour Heatmap matrix
  const heatmapData = useMemo(() => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    // Hours groupings: 0=Morning (6-11), 1=Afternoon (11-16), 2=Evening (16-21), 3=Night (21-6)
    const hours = ["Morning (6am-11am)", "Afternoon (11am-4pm)", "Evening (4pm-9pm)", "Night (9pm-6am)"];
    
    const matrix: Record<string, Record<number, { count: number; totalDelay: number }>> = {};
    days.forEach(d => {
      matrix[d] = {};
      for (let h = 0; h < 4; h++) {
        matrix[d][h] = { count: 0, totalDelay: 0 };
      }
    });

    filteredFlights.forEach(f => {
      if (f.Cancelled === 1) return;
      
      // Extract Day of Week
      let day = f.Day_Of_Week;
      if (!day) {
        const dateObj = new Date(f.Flight_Date + "T00:00:00");
        const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        day = daysArr[dateObj.getDay()];
      }

      // Extract Scheduled Hour
      const [hStr] = f.Scheduled_Dep_Time.split(":");
      const hourVal = parseInt(hStr);

      let hourGroup = 3; // Night by default
      if (hourVal >= 6 && hourVal < 11) hourGroup = 0;
      else if (hourVal >= 11 && hourVal < 16) hourGroup = 1;
      else if (hourVal >= 16 && hourVal < 21) hourGroup = 2;

      if (matrix[day] && matrix[day][hourGroup]) {
        matrix[day][hourGroup].count += 1;
        matrix[day][hourGroup].totalDelay += (f.Dep_Delay ?? 0);
      }
    });

    return { days, hours, matrix };
  }, [filteredFlights]);

  const resetFilters = () => {
    setFilters({
      airline: "All",
      airport: "All",
      month: "All",
      delayCause: "All",
    });
  };

  return (
    <div className="flex flex-col gap-6" id="powerbi-stage-container">
      {/* Top Warning Banner if Excel Stage is incomplete */}
      {isUsingRawFallback && (
        <div className="bg-amber-950/20 border border-amber-900/30 text-amber-450 p-4 rounded-lg flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-500 animate-spin" />
            <span>⚡ Running in Preview Mode: Currently displaying raw, uncleaned flight statistics. Clean the data in Step 1 to sync your Excel feature columns!</span>
          </div>
        </div>
      )}

      {/* Filter Control Pane */}
      <div className="bg-slate-900/40 p-4.5 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm font-mono">
          <Filter size={16} className="text-cyan-400" />
          <span>Report Slicers:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Airline Slicer */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Airline</span>
            <select
              value={filters.airline}
              onChange={(e) => setFilters(prev => ({ ...prev, airline: e.target.value }))}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-150 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-medium cursor-pointer"
              id="filter-airline-select"
            >
              <option value="All">All Airlines</option>
              {uniqueAirlines.filter(a => a !== "All").map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Airport Slicer */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Airport Hub</span>
            <select
              value={filters.airport}
              onChange={(e) => setFilters(prev => ({ ...prev, airport: e.target.value }))}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-150 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-medium cursor-pointer"
              id="filter-airport-select"
            >
              <option value="All">All Airports</option>
              {uniqueAirports.filter(ap => ap !== "All").map(ap => (
                <option key={ap} value={ap}>{ap} ({AIRPORT_COORDS[ap]?.name || "Hub"})</option>
              ))}
            </select>
          </div>

          {/* Month Slicer */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Month</span>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-150 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-medium cursor-pointer"
              id="filter-month-select"
            >
              {months.map(m => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Delay Cause Slicer */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">Primary Cause</span>
            <select
              value={filters.delayCause}
              onChange={(e) => setFilters(prev => ({ ...prev, delayCause: e.target.value }))}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-150 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-medium cursor-pointer"
              id="filter-cause-select"
            >
              <option value="All">All Delay Causes</option>
              <option value="Carrier">Carrier (Airlines)</option>
              <option value="Weather">Weather</option>
              <option value="NAS">NAS (Air Traffic)</option>
              <option value="Late Aircraft">Late Aircraft (Reactionary)</option>
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 self-end py-2 px-3 rounded-lg hover:bg-slate-900/50 transition cursor-pointer"
            id="reset-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/40 text-cyan-400 rounded-lg shrink-0 border border-cyan-900/30">
            <Plane size={20} />
          </div>
          <div className="leading-tight">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Total Flights</span>
            <div className="text-lg font-bold text-white mt-0.5 font-display" id="kpi-flights">
              {kpis.totalFlights.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/40 text-emerald-400 rounded-lg shrink-0 border border-emerald-900/30">
            <Percent size={20} />
          </div>
          <div className="leading-tight">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">On-Time %</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5 font-display" id="kpi-otp">
              {kpis.onTimeRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-amber-950/40 text-amber-400 rounded-lg shrink-0 border border-amber-900/30">
            <Clock size={20} />
          </div>
          <div className="leading-tight">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Avg Delay</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5 font-display" id="kpi-avg-delay">
              {kpis.avgDelay.toFixed(1)} m
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-3">
          <div className="p-2.5 bg-red-950/40 text-red-400 rounded-lg shrink-0 border border-red-900/30">
            <Ban size={20} />
          </div>
          <div className="leading-tight">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Cancellations</span>
            <div className="text-lg font-bold text-red-400 mt-0.5 font-display" id="kpi-cancelled">
              {kpis.cancelledCount}
            </div>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-lg flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2.5 bg-indigo-950/40 text-indigo-400 rounded-lg shrink-0 border border-indigo-900/30">
            <Activity size={20} />
          </div>
          <div className="leading-tight min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">Worst Route</span>
            <div className="text-xs font-bold text-cyan-300 mt-0.5 truncate font-mono" id="kpi-worst-route" title={kpis.mostDelayedRoute}>
              {kpis.mostDelayedRoute}
            </div>
          </div>
        </div>
      </div>

      {/* Report Layout Grid (Aesthetic Swiss Grid mimicking actual Power BI dashboard canvases!) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Bubble Map Visual & Monthly Trends */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          {/* Map Visual Card */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-display">Map Visual: Delay Severity by Airport Hub</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">GEO BUBBLE MAP</span>
            </div>

            {/* US Map Outline + Custom Coordinate Overlay */}
            <div className="relative bg-slate-950 border border-slate-850 rounded-xl h-[280px] overflow-hidden flex items-center justify-center">
              {/* Simplified US Outline background (Clean abstract grid representation) */}
              <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
              <svg className="absolute inset-0 w-full h-full text-slate-800 pointer-events-none" viewBox="0 0 100 80">
                <path d="M 5,20 L 30,10 L 60,12 L 95,15 L 90,65 L 75,70 L 60,78 L 40,75 L 15,70 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
              </svg>

              {/* Interactive Airport Dots */}
              {airportMapMetrics.map((ap) => {
                // Size represents flight volume, color represents delay intensity
                const maxVol = Math.max(...airportMapMetrics.map(x => x.volume)) || 1;
                const radius = Math.max(6, Math.min(22, (ap.volume / maxVol) * 22));
                
                // Color ramp: low (green), medium (yellow), high (orange/red)
                let color = "fill-emerald-500/80 stroke-emerald-600";
                if (ap.avgDelay > 22) color = "fill-red-500/80 stroke-red-600";
                else if (ap.avgDelay > 15) color = "fill-amber-500/80 stroke-amber-600";

                return (
                  <button
                    key={ap.code}
                    onClick={() => setFilters(prev => ({ ...prev, airport: ap.code }))}
                    className="absolute group focus:outline-none transition-transform hover:scale-115 cursor-pointer z-10"
                    style={{ left: `${ap.coords.x}%`, top: `${ap.coords.y}%` }}
                    title={`${ap.coords.name} (${ap.code})\nAvg Delay: ${Math.round(ap.avgDelay)}m\nFlights: ${ap.volume}`}
                  >
                    <svg width={radius * 2} height={radius * 2} className="overflow-visible">
                      <circle
                        cx={radius}
                        cy={radius}
                        r={radius}
                        className={`${color} stroke-2 cursor-pointer transition-all`}
                      />
                    </svg>
                    {/* Tooltip Hover indicator */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-900 text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow font-semibold z-20">
                      {ap.code}: {Math.round(ap.avgDelay)}m avg
                    </div>
                  </button>
                );
              })}

              <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[9px] bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-400 font-semibold shadow-sm font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" /> On-Time Hub</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Moderate Delays</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" /> High Congestion</span>
              </div>
            </div>
          </div>

          {/* Monthly Trend Visual */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-display">Seasonal Trend: Average Delay & Flight Volume</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">LINE CHART</span>
            </div>

            <div className="h-[210px] w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", fontSize: "11px", border: "1px solid #1e293b" }}
                    labelStyle={{ fontWeight: "bold", color: "#22d3ee" }}
                  />
                  <Line type="monotone" dataKey="Avg Delay" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Airline Ranking & Delay Causes & Heatmap */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Airline OTP Bar Chart */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-display">Carrier Performance: On-Time % Ranking</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">BAR CHART</span>
            </div>

            <div className="h-[200px] w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={airlineChartData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} width={75} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", fontSize: "11px", border: "1px solid #1e293b" }}
                  />
                  <Bar dataKey="On-Time %" fill="#0284c7" radius={[0, 4, 4, 0]}>
                    {airlineChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry["On-Time %"] > 80 ? "#10b981" : entry["On-Time %"] > 70 ? "#06b6d4" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delay Cause Breakdown (Donut) */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-display">Delay Cause Share (Minutes)</h3>
              <span className="text-[10px] font-mono text-slate-500">DONUT CHART</span>
            </div>

            <div className="flex items-center justify-center h-[180px] w-full text-xs font-mono">
              {causeChartData.length === 0 ? (
                <span className="text-slate-500 text-xs">No delays in filtered set.</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={causeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {causeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8" }} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", fontSize: "11px", border: "1px solid #1e293b" }} 
                      formatter={(value: number) => [`${value.toLocaleString()}m`, "Minutes"]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day x Hour Delay Intensity Heatmap */}
      <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="text-cyan-400" size={18} />
            <h3 className="text-sm font-bold text-white font-display">Time Congestion: Day of Week x Hour of Day (Avg Delay)</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">HEATMAP MATRIX</span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Headers */}
            <div className="grid grid-cols-5 text-center font-mono text-[10px] font-bold text-slate-500 pb-2 border-b border-slate-800">
              <div className="text-left pl-2">Day of Week</div>
              {heatmapData.hours.map((h, i) => (
                <div key={i}>{h}</div>
              ))}
            </div>

            {/* Matrix Rows */}
            <div className="flex flex-col gap-1.5 mt-2">
              {heatmapData.days.map((day) => (
                <div key={day} className="grid grid-cols-5 items-center font-semibold text-xs">
                  <div className="font-sans text-slate-300 pl-2">{day}</div>
                  {[0, 1, 2, 3].map((hourGroupIdx) => {
                    const cell = heatmapData.matrix[day][hourGroupIdx];
                    const avg = cell.count > 0 ? cell.totalDelay / cell.count : 0;
                    
                    // Heatmap color intensity ramp (custom styled dark glass glows)
                    let bg = "bg-slate-950/40 text-slate-600 border-slate-900";
                    if (avg > 35) bg = "bg-red-950/60 text-red-400 border-red-900/50";
                    else if (avg > 25) bg = "bg-orange-950/60 text-orange-400 border-orange-900/50";
                    else if (avg > 15) bg = "bg-amber-950/60 text-amber-450 border-amber-900/50";
                    else if (avg > 5) bg = "bg-cyan-950/60 text-cyan-400 border-cyan-900/50";
                    else if (cell.count > 0) bg = "bg-emerald-950/60 text-emerald-450 border-emerald-900/50";

                    return (
                      <div
                        key={hourGroupIdx}
                        className={`py-3.5 text-center font-mono text-xs rounded-lg border flex flex-col justify-center items-center transition ${bg}`}
                        title={`${day} ${heatmapData.hours[hourGroupIdx]}\nAvg Delay: ${Math.round(avg)}m\nFlights: ${cell.count}`}
                      >
                        <span className="font-bold">{Math.round(avg)}m</span>
                        <span className="text-[9px] opacity-75 mt-0.5">{cell.count} flts</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Power BI Desktop Developer Build Guide */}
      <div className="bg-slate-900/40 text-slate-100 p-6 rounded-xl border border-slate-800 shadow-xl mt-4 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400 animate-pulse" />
            <h3 className="font-bold font-display text-base">Power BI Desktop - Developer Guide</h3>
          </div>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 text-xs font-mono">
            <button
              onClick={() => setGuideTab("visuals")}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                guideTab === "visuals" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Report Layout
            </button>
            <button
              onClick={() => setGuideTab("dax")}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                guideTab === "dax" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              DAX Calculations
            </button>
          </div>
        </div>

        {guideTab === "visuals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              <span className="font-bold text-cyan-400 text-sm font-mono">1. Visual Canvas Layout</span>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Page Canvas</strong>: Set page background to dark slate (#020617) and use an Elegant Slate dark header.</li>
                <li><strong>KPI Cards Visual</strong>: Place 5 new Multi-Row Card or standard KPI visual containers in a horizontal strip. Enable border glows with 5% opacity.</li>
                <li><strong>Geo Bubble Map Visual</strong>: Set location to Latitude/Longitude coordinates or Country/City hierarchy. Bind <strong>Bubble Size</strong> to flight volumes and <strong>Bubble Color</strong> using conditional formatting on average departure delay.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              <span className="font-bold text-cyan-400 text-sm font-mono">2. Slicers & Dynamic Heatmaps</span>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Dynamic Filters</strong>: Add vertical dropdown Slicer visuals for <code>Airline</code>, <code>Origin Airport</code>, and <code>Month</code>. Set selection type to "Show Select All" option.</li>
                <li><strong>Day x Hour Heatmap Matrix</strong>: Insert a Matrix visual. Drag <code>Day_Of_Week</code> to Rows, <code>Hour_Of_Day</code> (or morning/evening brackets) to Columns, and average <code>Dep_Delay</code> to Values.</li>
                <li><strong>Conditional Formatting</strong>: Enable Cell Background Color conditional formatting with a 3-point gradient: Green (0-10m), Yellow (11-25m), and Red (&gt;25m) for real-time risk highlighting.</li>
              </ul>
            </div>
          </div>
        )}

        {guideTab === "dax" && (
          <div className="flex flex-col gap-3 bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 text-xs font-mono">
            <span className="font-bold text-cyan-400 font-sans text-sm mb-2">Core DAX Measures for Your Resume / Project</span>
            
            <div className="flex flex-col gap-1 border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold">1. On-Time Performance (OTP) % Measure</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Calculates the percentage of flights departing within 15 minutes of scheduled time:</p>
              <code className="bg-slate-950 p-2.5 rounded text-slate-300 block overflow-x-auto text-[11px] border border-slate-900">
                OTP % = 
DIVIDE(
    CALCULATE(
        COUNTROWS(flights), 
        flights[Dep_Delay] &lt;= 15, 
        flights[Cancelled] = 0
    ), 
    COUNTROWS(flights), 
    0
) * 100
              </code>
            </div>

            <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 pt-1">
              <span className="text-emerald-400 font-bold">2. Average Delay (Excluding Cancelled Flights)</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Computes arrival delays safely by ensuring cancelled flights do not bias values:</p>
              <code className="bg-slate-950 p-2.5 rounded text-slate-300 block overflow-x-auto text-[11px] border border-slate-900">
                Avg Delay (Mins) = 
CALCULATE(
    AVERAGE(flights[Arr_Delay]), 
    flights[Cancelled] = 0
)
              </code>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <span className="text-emerald-400 font-bold">3. Late Aircraft Reactionary Delay Share</span>
              <p className="text-slate-400 font-sans text-[11px] mb-2">Isolates the share of total delay minutes attributable to reactionary cascading delays:</p>
              <code className="bg-slate-950 p-2.5 rounded text-slate-300 block overflow-x-auto text-[11px] border border-slate-900">
                Late Aircraft Share % = 
DIVIDE(
    SUM(flights[Late_Aircraft_Delay]), 
    SUM(flights[Dep_Delay]), 
    0
) * 100
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
