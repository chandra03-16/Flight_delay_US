import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileSpreadsheet, 
  Terminal, 
  Layout, 
  Plane, 
  Award, 
  Map,
  BookOpen
} from "lucide-react";
import { Flight, CleanedFlight } from "./types";
import { generateFlightData } from "./data/flights";

// Sub-components
import ExcelStage from "./components/ExcelStage";
import SqlStage from "./components/SqlStage";
import PowerBiStage from "./components/PowerBiStage";

export default function App() {
  const [activeTab, setActiveTab] = useState<"excel" | "sql" | "powerbi">("excel");
  const [rawFlights, setRawFlights] = useState<Flight[]>([]);
  const [cleanedFlights, setCleanedFlights] = useState<CleanedFlight[]>([]);

  // Generate flight dataset on load
  useEffect(() => {
    const data = generateFlightData();
    setRawFlights(data);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30">
      
      {/* Dynamic Navigation Top-Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 shrink-0 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3">
            <div className="bg-cyan-950/50 border border-cyan-800/50 p-2 rounded-lg text-cyan-400 shadow-md">
              <Plane className="rotate-45" size={20} />
            </div>
            <div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em]">
                  Project Portfolio / Data Analysis
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display mt-0.5">
                  SkyMetrics: Flight Delay Performance
                </h1>
              </div>
            </div>
          </div>

          {/* Nav Workflow Steps */}
          <nav className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("excel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                activeTab === "excel" 
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50" 
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
              }`}
              id="app-tab-excel"
            >
              <FileSpreadsheet size={14} />
              <span>STEP 1: Excel</span>
            </button>

            <button
              onClick={() => setActiveTab("sql")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                activeTab === "sql" 
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50" 
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
              }`}
              id="app-tab-sql"
            >
              <Terminal size={14} />
              <span>STEP 2: SQL</span>
            </button>

            <button
              onClick={() => setActiveTab("powerbi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                activeTab === "powerbi" 
                  ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50" 
                  : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
              }`}
              id="app-tab-powerbi"
            >
              <Layout size={14} />
              <span>STEP 3: Power BI</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Intro Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 md:p-8 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle background visual highlights */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute left-1/4 bottom-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-cyan-950/40 text-cyan-400 text-xs font-bold px-2.5 py-1 rounded border border-cyan-800/50 flex items-center gap-1">
                <Award size={12} />
                <span>Premium Portfolio Blueprint</span>
              </span>
              <span className="text-slate-700 text-xs font-mono">•</span>
              <span className="text-xs text-slate-400 font-medium">Domain: Aviation Logistics & Operations</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight leading-tight text-white">
              Aviation Operations Performance Analysis
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              Become a business-savvy data analyst. This interactive builder guides you to transform, query, and visualize **1,500 real US domestic flights** (based on Bureau of Transportation Statistics data). Develop elite SQL, Excel, and Power BI skills to showcase your analytical insights.
            </p>
          </div>

          {/* Quick Metrics of Loaded Database */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-5 rounded-xl flex flex-row lg:flex-col gap-6 shrink-0 lg:min-w-[200px] text-center lg:text-left justify-around lg:justify-start">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Database Status</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center lg:justify-start gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span>Pipeline Operational</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">Flight Volume</span>
              <span className="text-lg font-bold font-mono text-slate-100 block mt-0.5">1,500 rows</span>
            </div>
          </div>
        </section>

        {/* Dynamic Stage Render */}
        <section className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full"
            >
              {activeTab === "excel" && (
                <ExcelStage 
                  rawFlights={rawFlights} 
                  cleanedFlights={cleanedFlights} 
                  onSetCleanedFlights={setCleanedFlights} 
                />
              )}

              {activeTab === "sql" && (
                <SqlStage 
                  cleanedFlights={cleanedFlights.length > 0 ? cleanedFlights : rawFlights} 
                />
              )}

              {activeTab === "powerbi" && (
                <PowerBiStage 
                  rawFlights={rawFlights} 
                  cleanedFlights={cleanedFlights} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* Elegant Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 text-xs text-center shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Us_flight_delay_cb</p>
          <div className="flex gap-4 font-semibold">
            <a href="#excel-stage-container" onClick={() => setActiveTab("excel")} className="hover:text-white transition">Step 1: Excel</a>
            <a href="#sql-stage-container" onClick={() => setActiveTab("sql")} className="hover:text-white transition">Step 2: SQL</a>
            <a href="#powerbi-stage-container" onClick={() => setActiveTab("powerbi")} className="hover:text-white transition">Step 3: Power BI</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
