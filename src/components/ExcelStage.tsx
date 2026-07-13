import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileSpreadsheet, 
  Trash2, 
  PlusCircle, 
  FileDown, 
  HelpCircle, 
  CheckCircle,
  TableProperties,
  ArrowRight
} from "lucide-react";
import { Flight, CleanedFlight } from "../types";

interface ExcelStageProps {
  rawFlights: Flight[];
  cleanedFlights: CleanedFlight[];
  onSetCleanedFlights: (flights: CleanedFlight[]) => void;
}

export default function ExcelStage({ rawFlights, cleanedFlights, onSetCleanedFlights }: ExcelStageProps) {
  const [step, setStep] = useState<"clean" | "helpers" | "pivots">("clean");
  const [isCleaned, setIsCleaned] = useState(false);
  const [hasHelpers, setHasHelpers] = useState(false);
  const [activePivot, setActivePivot] = useState<"airline" | "day" | "season">("airline");

  // A small slice of 8 flights to display in the live preview spreadsheet
  const [previewData, setPreviewData] = useState<any[]>(() => 
    rawFlights.slice(0, 8).map((f, i) => {
      // Intentionally insert some messy values for demonstration
      if (i === 1) return { ...f, Flight_Date: "2025/01/15", Scheduled_Dep_Time: "700" }; // unstandardized
      if (i === 3) return { ...f, Flight_Date: "2025-01-15", Flight_Num: null }; // missing
      if (i === 5) return { ...f, isDuplicate: true }; // duplicate marker
      return f;
    })
  );

  // Excel Step 1: Remove nulls and duplicates, standardize formats
  const handleCleanData = () => {
    setIsCleaned(true);
    setPreviewData(prev => 
      prev
        .filter(f => !f.isDuplicate && f.Flight_Num !== null)
        .map(f => {
          // Standardize dates and times
          let date = f.Flight_Date;
          if (date === "2025/01/15") date = "2025-01-15";
          let time = f.Scheduled_Dep_Time;
          if (time === "700") time = "07:00";
          return { ...f, Flight_Date: date, Scheduled_Dep_Time: time };
        })
    );
  };

  // Excel Step 2: Add Helper Columns
  const handleAddHelpers = () => {
    if (!isCleaned) return;
    setHasHelpers(true);
    setPreviewData(prev => 
      prev.map(f => {
        // Calculate Season
        const month = parseInt(f.Flight_Date.split("-")[1]);
        let season: "Winter" | "Spring" | "Summer" | "Fall" = "Fall";
        if ([12, 1, 2].includes(month)) season = "Winter";
        else if ([3, 4, 5].includes(month)) season = "Spring";
        else if ([6, 7, 8].includes(month)) season = "Summer";

        // Calculate Day of Week
        const dateObj = new Date(f.Flight_Date + "T00:00:00");
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayOfWeek = days[dateObj.getDay()];

        // Calculate Delay Category
        let category: "On-Time" | "Minor Delay" | "Major Delay" | "Cancelled" = "On-Time";
        if (f.Cancelled === 1) category = "Cancelled";
        else if (f.Dep_Delay !== null && f.Dep_Delay > 45) category = "Major Delay";
        else if (f.Dep_Delay !== null && f.Dep_Delay > 15) category = "Minor Delay";

        return {
          ...f,
          Delay_Category: category,
          Season: season,
          Day_Of_Week: dayOfWeek
        };
      })
    );

    // Update parent global state with fully calculated cleaned flight data
    const fullCleaned = rawFlights.map(f => {
      const month = parseInt(f.Flight_Date.split("-")[1]);
      let season: "Winter" | "Spring" | "Summer" | "Fall" = "Fall";
      if ([12, 1, 2].includes(month)) season = "Winter";
      else if ([3, 4, 5].includes(month)) season = "Spring";
      else if ([6, 7, 8].includes(month)) season = "Summer";

      const dateObj = new Date(f.Flight_Date + "T00:00:00");
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayOfWeek = days[dateObj.getDay()];

      let category: "On-Time" | "Minor Delay" | "Major Delay" | "Cancelled" = "On-Time";
      if (f.Cancelled === 1) category = "Cancelled";
      else if (f.Dep_Delay !== null && f.Dep_Delay > 45) category = "Major Delay";
      else if (f.Dep_Delay !== null && f.Dep_Delay > 15) category = "Minor Delay";

      const [h] = f.Scheduled_Dep_Time.split(":").map(Number);

      return {
        ...f,
        Delay_Category: category,
        Season: season,
        Day_Of_Week: dayOfWeek,
        Hour_Of_Day: h
      };
    });

    onSetCleanedFlights(fullCleaned);
  };

  // Convert objects to CSV and trigger a download
  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).filter(k => k !== "isDuplicate");
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
        }).join(",")
      )
    ];
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="excel-stage-container">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3 flex flex-col gap-2">
        <h3 className="text-sm font-mono font-semibold text-slate-500 uppercase tracking-widest mb-2">Excel Workflow</h3>
        <button
          onClick={() => setStep("clean")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition border ${
            step === "clean" 
              ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50 font-semibold shadow-sm" 
              : "bg-transparent hover:bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200"
          }`}
          id="excel-tab-clean"
        >
          <Trash2 size={18} />
          <div className="text-sm leading-tight">
            <div>1. Clean & Standardize</div>
            <span className="text-[10px] opacity-70">{isCleaned ? "Completed" : "In Progress"}</span>
          </div>
        </button>

        <button
          onClick={() => setStep("helpers")}
          disabled={!isCleaned}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition border ${
            !isCleaned ? "opacity-40 cursor-not-allowed" : ""
          } ${
            step === "helpers" 
              ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50 font-semibold shadow-sm" 
              : "bg-transparent hover:bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200"
          }`}
          id="excel-tab-helpers"
        >
          <PlusCircle size={18} />
          <div className="text-sm leading-tight">
            <div>2. Helper Columns</div>
            <span className="text-[10px] opacity-70">{hasHelpers ? "Created" : "Locked"}</span>
          </div>
        </button>

        <button
          onClick={() => setStep("pivots")}
          disabled={!hasHelpers}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition border ${
            !hasHelpers ? "opacity-40 cursor-not-allowed" : ""
          } ${
            step === "pivots" 
              ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50 font-semibold shadow-sm" 
              : "bg-transparent hover:bg-slate-900/40 border-transparent text-slate-400 hover:text-slate-200"
          }`}
          id="excel-tab-pivots"
        >
          <TableProperties size={18} />
          <div className="text-sm leading-tight">
            <div>3. Sanity Pivots</div>
            <span className="text-[10px] opacity-70">Analyze Trends</span>
          </div>
        </button>

        <div className="mt-6 p-4 bg-slate-900/40 rounded-xl border border-slate-800">
          <h4 className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider mb-2">Portfolio Deliverables</h4>
          <p className="text-xs text-slate-400 mb-3">
            Download the structured flight datasets below to build your Power BI Desktop or SQL database locally.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => downloadCSV(rawFlights, "flights_raw.csv")}
              className="flex items-center justify-between text-left text-xs bg-slate-950 hover:bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-300 font-medium transition cursor-pointer"
              id="download-raw-btn"
            >
              <span>Raw Dataset (1.5K rows)</span>
              <FileDown size={14} className="text-slate-500" />
            </button>
            <button
              onClick={() => {
                if (!hasHelpers) {
                  alert("Please complete the 'Helper Columns' step first to generate the fully calculated portfolio CSV!");
                  return;
                }
                downloadCSV(cleanedFlights, "flights_cleaned_portfolio.csv");
              }}
              className={`flex items-center justify-between text-left text-xs p-2.5 rounded-lg font-medium transition cursor-pointer border ${
                hasHelpers 
                  ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-600 font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                  : "bg-slate-900 text-slate-500 border-slate-850 cursor-not-allowed"
              }`}
              id="download-cleaned-btn"
            >
              <span>Cleaned Portfolio CSV</span>
              <FileDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {/* Step Content: Cleaning & Standardizing */}
        {step === "clean" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-cyan-950/50 text-cyan-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-cyan-800/30">Step 1.1</span>
                <h2 className="text-lg font-display font-bold text-white">Remove Duplicates, Nulls & Standardize</h2>
              </div>
              <p className="text-sm text-slate-400">
                Identify messiness (missing flight numbers, duplicate records, non-standard dates/times) and clean them.
              </p>
            </div>

            {/* Simulated Excel Spreadsheet */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="bg-slate-900/80 border-b border-slate-800 p-2.5 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400"><FileSpreadsheet size={14} /> Excel Sandbox (Raw Preview)</span>
                <span className="text-[11px]">8 of 1500 rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                      <th className="p-2 border-r border-slate-800 w-10 text-center">Row</th>
                      <th className="p-2 border-r border-slate-800">Date</th>
                      <th className="p-2 border-r border-slate-800">Airline</th>
                      <th className="p-2 border-r border-slate-800">Flight Num</th>
                      <th className="p-2 border-r border-slate-800">Origin</th>
                      <th className="p-2 border-r border-slate-800">Dest</th>
                      <th className="p-2 border-r border-slate-800">Scheduled Dep</th>
                      <th className="p-2">Status / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {previewData.map((row, index) => (
                        <motion.tr 
                          key={index}
                          exit={{ opacity: 0, height: 0, backgroundColor: "#450a0a" }}
                          transition={{ duration: 0.3 }}
                          className={`border-b border-slate-850/60 transition ${
                            row.isDuplicate ? "bg-red-950/30 text-red-400" :
                            row.Flight_Num === null ? "bg-amber-950/30 text-amber-400" :
                            row.Flight_Date === "2025/01/15" || row.Scheduled_Dep_Time === "700" ? "bg-blue-950/30 text-cyan-400" :
                            "hover:bg-slate-900/30 text-slate-300"
                          }`}
                        >
                          <td className="p-2 border-r border-slate-800 bg-slate-900/40 text-center font-mono text-slate-500">{index + 1}</td>
                          <td className="p-2 border-r border-slate-800 font-mono">{row.Flight_Date}</td>
                          <td className="p-2 border-r border-slate-800 font-medium">{row.Airline}</td>
                          <td className="p-2 border-r border-slate-800 font-mono">{row.Flight_Num ?? <span className="italic opacity-60">[NULL]</span>}</td>
                          <td className="p-2 border-r border-slate-800 font-mono">{row.Origin}</td>
                          <td className="p-2 border-r border-slate-800 font-mono">{row.Dest}</td>
                          <td className="p-2 border-r border-slate-800 font-mono">{row.Scheduled_Dep_Time}</td>
                          <td className="p-2 font-mono text-[11px] font-semibold">
                            {row.isDuplicate && "⚠️ Duplicate Record"}
                            {row.Flight_Num === null && "⚠️ Null Flight Number"}
                            {row.Flight_Date === "2025/01/15" && "🔄 Date Format Standardized"}
                            {row.Scheduled_Dep_Time === "700" && "🔄 Time Format Standardized"}
                            {!row.isDuplicate && row.Flight_Num !== null && row.Flight_Date !== "2025/01/15" && row.Scheduled_Dep_Time !== "700" && "✓ Valid Row"}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between">
              <button
                onClick={handleCleanData}
                disabled={isCleaned}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition text-sm cursor-pointer ${
                  isCleaned 
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 cursor-default" 
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                }`}
                id="excel-clean-action-btn"
              >
                {isCleaned ? <CheckCircle size={16} /> : <Trash2 size={16} />}
                {isCleaned ? "Dataset Cleaned & Standardized" : "Run Cleaning Pipeline"}
              </button>

              {isCleaned && (
                <button
                  onClick={() => setStep("helpers")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  id="excel-next-step-btn"
                >
                  Proceed to Helper Columns <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Instruction block */}
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
                <HelpCircle size={16} className="text-cyan-400" />
                <span>How to do this in Excel Desktop (Formula Guides)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
                <div className="flex flex-col gap-1 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="font-semibold text-slate-200 mb-1">Standardizing Date Formats</div>
                  <p>Dates with mixed slashes like <code className="bg-black/30 border border-slate-800 px-1 py-0.5 rounded text-red-400">2025/01/15</code> cause indexing errors. Use Excel's formatting pane or format them via string split:</p>
                  <code className="bg-black/40 border border-slate-800/80 p-2 rounded font-mono text-cyan-400 mt-1 block">
                    =DATE(LEFT(A2,4), MID(A2,6,2), RIGHT(A2,2))
                  </code>
                </div>

                <div className="flex flex-col gap-1 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="font-semibold text-slate-200 mb-1">Standardizing Messy Times</div>
                  <p>Incomplete times like <code className="bg-black/30 border border-slate-800 px-1 py-0.5 rounded text-red-400">700</code> must be padded to a 4-digit format and formatted as <code className="font-mono text-emerald-400">07:00</code>:</p>
                  <code className="bg-black/40 border border-slate-800/80 p-2 rounded font-mono text-cyan-400 mt-1 block">
                    =TEXT(TIME(LEFT(A2,LEN(A2)-2), RIGHT(A2,2), 0), "hh:mm")
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step Content: Helper Columns */}
        {step === "helpers" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-cyan-950/50 text-cyan-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-cyan-800/30">Step 1.2</span>
                <h2 className="text-lg font-display font-bold text-white">Feature Engineering (Helper Columns)</h2>
              </div>
              <p className="text-sm text-slate-400">
                Create new calculated helper columns: <strong className="text-slate-200">Delay Category</strong>, <strong className="text-slate-200">Season</strong>, and <strong className="text-slate-200">Day of Week</strong> to enable rich slicing in Power BI.
              </p>
            </div>

            {/* Simulated Spreadsheet Grid */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="bg-slate-900/80 border-b border-slate-800 p-2.5 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-cyan-400"><FileSpreadsheet size={14} /> Spreadsheet Preview with Calculated Columns</span>
                <span className="text-[11px]">6 Validated Rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
                      <th className="p-2 border-r border-slate-800 text-center w-8">Row</th>
                      <th className="p-2 border-r border-slate-800">Date</th>
                      <th className="p-2 border-r border-slate-800">Airline</th>
                      <th className="p-2 border-r border-slate-800">Delay (Min)</th>
                      <th className="p-2 border-r border-slate-800 bg-emerald-950/40 text-emerald-400 font-mono font-semibold">Delay_Category (NEW)</th>
                      <th className="p-2 border-r border-slate-800 bg-cyan-950/20 text-cyan-400 font-mono font-semibold">Season (NEW)</th>
                      <th className="p-2 bg-blue-950/30 text-cyan-300 font-mono font-semibold">Day_Of_Week (NEW)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-slate-850 hover:bg-slate-900/30 text-slate-300">
                        <td className="p-2 border-r border-slate-800 bg-slate-900/40 text-center font-mono text-slate-500">{index + 1}</td>
                        <td className="p-2 border-r border-slate-800 font-mono">{row.Flight_Date}</td>
                        <td className="p-2 border-r border-slate-800 font-medium">{row.Airline}</td>
                        <td className="p-2 border-r border-slate-800 font-mono text-center">{row.Dep_Delay ?? "Cancelled"}</td>
                        
                        {/* New Helper Columns */}
                        <td className="p-2 border-r border-slate-800 font-medium bg-emerald-950/20">
                          {row.Delay_Category ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.Delay_Category === "On-Time" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/30" :
                              row.Delay_Category === "Minor Delay" ? "bg-amber-950 text-amber-400 border border-amber-800/30" :
                              row.Delay_Category === "Major Delay" ? "bg-red-950 text-red-400 border border-red-800/30" :
                              "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                              {row.Delay_Category}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic font-normal">[Click Calculate]</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-800 font-mono text-slate-300 bg-cyan-950/10">
                          {row.Season ?? <span className="text-slate-500 italic font-normal">[Click Calculate]</span>}
                        </td>
                        <td className="p-2 text-slate-300 bg-blue-950/10">
                          {row.Day_Of_Week ?? <span className="text-slate-500 italic font-normal">[Click Calculate]</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center justify-between">
              <button
                onClick={handleAddHelpers}
                disabled={hasHelpers}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition text-sm cursor-pointer ${
                  hasHelpers 
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 cursor-default" 
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                }`}
                id="excel-calculate-helpers-btn"
              >
                {hasHelpers ? <CheckCircle size={16} /> : <PlusCircle size={16} />}
                {hasHelpers ? "Helper Columns Calculated" : "Calculate Helper Columns"}
              </button>

              {hasHelpers && (
                <button
                  onClick={() => setStep("pivots")}
                  className="flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  id="excel-goto-pivots-btn"
                >
                  Generate Pivot Tables <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Formulas Box */}
            <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
                <HelpCircle size={16} className="text-cyan-400" />
                <span>Formulas to write in Excel Desktop</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
                <div className="flex flex-col gap-1 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="font-semibold text-slate-200 mb-1">1. Delay_Category</div>
                  <p className="mb-2">Classify delays based on Federal Aviation Administration criteria:</p>
                  <code className="bg-black/40 border border-slate-800/80 p-2 rounded font-mono text-cyan-400 block">
                    =IF(U2=1, "Cancelled", IF(K2&lt;=15, "On-Time", IF(K2&lt;=45, "Minor Delay", "Major Delay")))
                  </code>
                </div>

                <div className="flex flex-col gap-1 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="font-semibold text-slate-200 mb-1">2. Day_Of_Week</div>
                  <p className="mb-2">Calculate day of week names from date value for dashboard slicing:</p>
                  <code className="bg-black/40 border border-slate-800/80 p-2 rounded font-mono text-cyan-400 block">
                    =TEXT(A2, "dddd")
                  </code>
                </div>

                <div className="flex flex-col gap-1 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="font-semibold text-slate-200 mb-1">3. Season</div>
                  <p className="mb-2">Map dates into meteorological seasons for trend analysis:</p>
                  <code className="bg-black/40 border border-slate-800/80 p-2 rounded font-mono text-cyan-400 block">
                    =CHOOSE(MONTH(A2), "Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Fall", "Fall", "Fall", "Winter")
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step Content: Pivot Tables */}
        {step === "pivots" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-cyan-950/50 text-cyan-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-cyan-800/30">Step 1.3</span>
                <h2 className="text-lg font-display font-bold text-white">Sanity-Check with Pivot Tables</h2>
              </div>
              <p className="text-sm text-slate-400">
                Before doing heavy SQL, professional analysts run quick Excel Pivot Tables to verify distribution of delays and trends.
              </p>
            </div>

            {/* Pivot Table Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActivePivot("airline")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activePivot === "airline" 
                    ? "border-cyan-500 text-cyan-400" 
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
                id="pivot-tab-airline"
              >
                Average Delay by Airline
              </button>
              <button
                onClick={() => setActivePivot("day")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activePivot === "day" 
                    ? "border-cyan-500 text-cyan-400" 
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
                id="pivot-tab-day"
              >
                Day of Week x Delay Category
              </button>
              <button
                onClick={() => setActivePivot("season")}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activePivot === "season" 
                    ? "border-cyan-500 text-cyan-400" 
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
                id="pivot-tab-season"
              >
                Seasonal Performance
              </button>
            </div>

            {/* Pivot Table Rendering */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-300">
              {activePivot === "airline" && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-1.5 text-[10px]">
                    <span>ROWS: Airline</span>
                    <span>VALUES: Average Dep Delay, Average Arr Delay</span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 font-bold text-slate-200">
                        <th className="py-2">Row Labels</th>
                        <th className="py-2 text-right">Average of Dep_Delay</th>
                        <th className="py-2 text-right">Average of Arr_Delay</th>
                        <th className="py-2 text-right">Count of Flights</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">American Airlines</td>
                        <td className="py-2 text-right">18.4 mins</td>
                        <td className="py-2 text-right">17.2 mins</td>
                        <td className="py-2 text-right text-slate-400">312</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Delta Air Lines</td>
                        <td className="py-2 text-right">12.1 mins</td>
                        <td className="py-2 text-right">11.4 mins</td>
                        <td className="py-2 text-right text-slate-400">295</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">JetBlue Airways</td>
                        <td className="py-2 text-right">24.6 mins</td>
                        <td className="py-2 text-right">25.3 mins</td>
                        <td className="py-2 text-right text-slate-400">289</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Southwest Airlines</td>
                        <td className="py-2 text-right">19.8 mins</td>
                        <td className="py-2 text-right">18.5 mins</td>
                        <td className="py-2 text-right text-slate-400">302</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">United Airlines</td>
                        <td className="py-2 text-right">14.9 mins</td>
                        <td className="py-2 text-right">15.1 mins</td>
                        <td className="py-2 text-right text-slate-400">302</td>
                      </tr>
                      <tr className="font-bold bg-slate-900/60 text-slate-200 border-t border-slate-800">
                        <td className="py-2">Grand Total</td>
                        <td className="py-2 text-right">17.9 mins</td>
                        <td className="py-2 text-right">17.5 mins</td>
                        <td className="py-2 text-right">1500</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activePivot === "day" && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-1.5 text-[10px]">
                    <span>ROWS: Day of Week</span>
                    <span>COLUMNS: Delay Category | VALUES: Count</span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 font-bold text-slate-200">
                        <th className="py-2">Row Labels</th>
                        <th className="py-2 text-right">On-Time</th>
                        <th className="py-2 text-right">Minor Delay</th>
                        <th className="py-2 text-right">Major Delay</th>
                        <th className="py-2 text-right">Cancelled</th>
                        <th className="py-2 text-right font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Monday</td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">165</td>
                        <td className="py-2 text-right text-amber-400">32</td>
                        <td className="py-2 text-right text-red-400">14</td>
                        <td className="py-2 text-right text-slate-400">4</td>
                        <td className="py-2 text-right font-bold">215</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Friday</td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">148</td>
                        <td className="py-2 text-right text-amber-400">45</td>
                        <td className="py-2 text-right text-red-400">22</td>
                        <td className="py-2 text-right text-slate-400">6</td>
                        <td className="py-2 text-right font-bold">221</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Sunday</td>
                        <td className="py-2 text-right text-emerald-400 font-semibold">152</td>
                        <td className="py-2 text-right text-amber-400">40</td>
                        <td className="py-2 text-right text-red-400">19</td>
                        <td className="py-2 text-right text-slate-400">5</td>
                        <td className="py-2 text-right font-bold">216</td>
                      </tr>
                      <tr className="border-b border-slate-900 text-slate-400 italic">
                        <td className="py-2 font-semibold">Other Days</td>
                        <td className="py-2 text-right">585</td>
                        <td className="py-2 text-right">120</td>
                        <td className="py-2 text-right">36</td>
                        <td className="py-2 text-right">7</td>
                        <td className="py-2 text-right font-bold text-slate-200">748</td>
                      </tr>
                      <tr className="font-bold bg-slate-900/60 text-slate-200 border-t border-slate-800">
                        <td className="py-2">Grand Total</td>
                        <td className="py-2 text-right text-emerald-400">1050</td>
                        <td className="py-2 text-right text-amber-400">237</td>
                        <td className="py-2 text-right text-red-400">91</td>
                        <td className="py-2 text-right text-slate-400">22</td>
                        <td className="py-2 text-right font-bold">1500</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activePivot === "season" && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-1.5 text-[10px]">
                    <span>ROWS: Season</span>
                    <span>VALUES: Average Arrival Delay, Count</span>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 font-bold text-slate-200">
                        <th className="py-2">Row Labels</th>
                        <th className="py-2 text-right">Average of Arr_Delay</th>
                        <th className="py-2 text-right">Count of Flights</th>
                        <th className="py-2 text-right">% of Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Winter (Dec-Feb)</td>
                        <td className="py-2 text-right text-red-400 font-bold">24.5 mins</td>
                        <td className="py-2 text-right text-slate-400">385</td>
                        <td className="py-2 text-right text-slate-400">25.7%</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Spring (Mar-May)</td>
                        <td className="py-2 text-right text-emerald-400">11.2 mins</td>
                        <td className="py-2 text-right text-slate-400">375</td>
                        <td className="py-2 text-right text-slate-400">25.0%</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Summer (Jun-Aug)</td>
                        <td className="py-2 text-right text-amber-400">18.4 mins</td>
                        <td className="py-2 text-right text-slate-400">390</td>
                        <td className="py-2 text-right text-slate-400">26.0%</td>
                      </tr>
                      <tr className="border-b border-slate-900">
                        <td className="py-2 font-semibold">Fall (Sep-Nov)</td>
                        <td className="py-2 text-right text-emerald-400">10.1 mins</td>
                        <td className="py-2 text-right text-slate-400">350</td>
                        <td className="py-2 text-right text-slate-400">23.3%</td>
                      </tr>
                      <tr className="font-bold bg-slate-900/60 text-slate-200 border-t border-slate-800">
                        <td className="py-2">Grand Total</td>
                        <td className="py-2 text-right text-slate-300">17.5 mins</td>
                        <td className="py-2 text-right text-slate-400">1500</td>
                        <td className="py-2 text-right text-slate-400">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
