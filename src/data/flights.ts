import { Flight } from "../types";

// Helper to generate a realistic synthetic dataset of 1,500 flights with structural delay patterns
export function generateFlightData(): Flight[] {
  const airlines = [
    { code: "DL", name: "Delta Air Lines", onTimeProb: 0.82, carrierDelayProb: 0.05, baseDelay: 12 },
    { code: "UA", name: "United Airlines", onTimeProb: 0.79, carrierDelayProb: 0.06, baseDelay: 15 },
    { code: "AA", name: "American Airlines", onTimeProb: 0.75, carrierDelayProb: 0.08, baseDelay: 18 },
    { code: "WN", name: "Southwest Airlines", onTimeProb: 0.72, carrierDelayProb: 0.10, baseDelay: 20 },
    { code: "B6", name: "JetBlue Airways", onTimeProb: 0.65, carrierDelayProb: 0.12, baseDelay: 25 }
  ];

  const airports = [
    { code: "ATL", city: "Atlanta, GA", weatherDelayProb: 0.02, nasDelayProb: 0.04 },
    { code: "ORD", city: "Chicago, IL", weatherDelayProb: 0.08, nasDelayProb: 0.12 },
    { code: "DFW", city: "Dallas, TX", weatherDelayProb: 0.04, nasDelayProb: 0.06 },
    { code: "DEN", city: "Denver, CO", weatherDelayProb: 0.07, nasDelayProb: 0.08 },
    { code: "LAX", city: "Los Angeles, CA", weatherDelayProb: 0.01, nasDelayProb: 0.04 },
    { code: "JFK", city: "New York, NY", weatherDelayProb: 0.05, nasDelayProb: 0.14 },
    { code: "SFO", city: "San Francisco, CA", weatherDelayProb: 0.03, nasDelayProb: 0.15 }
  ];

  const tailNumbersByAirline: Record<string, string[]> = {
    "DL": ["N101DA", "N102DA", "N103DA", "N104DA", "N105DA"],
    "UA": ["N201UA", "N202UA", "N203UA", "N204UA", "N205UA"],
    "AA": ["N301AA", "N302AA", "N303AA", "N304AA", "N305AA"],
    "WN": ["N401WN", "N402WN", "N403WN", "N404WN", "N405WN"],
    "B6": ["N501JB", "N502JB", "N503JB", "N504JB", "N505JB"]
  };

  const flights: Flight[] = [];
  const totalFlightsToGenerate = 1500;
  
  // Base Date range: Year 2025 across all 12 months to show seasonal trends
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Helper to construct HH:MM string from total minutes
  const minsToTimeStr = (totalMins: number): string => {
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = Math.floor(totalMins % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Helper to add minutes to time string
  const addMinsToTime = (timeStr: string, minsToAdd: number): string => {
    const [h, m] = timeStr.split(":").map(Number);
    let total = h * 60 + m + minsToAdd;
    if (total < 0) total += 1440;
    return minsToTimeStr(total);
  };

  // 1. Generate 1,450 pseudo-random flights with realistic patterns
  let seed = 42;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < totalFlightsToGenerate - 50; i++) {
    // Select Airline
    const airline = airlines[Math.floor(random() * airlines.length)];
    
    // Select Date (distribute across 12 months)
    const monthIdx = Math.floor(random() * 12);
    const day = Math.floor(random() * daysInMonth[monthIdx]) + 1;
    const year = 2025;
    const dateStr = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    // Select Origin and Destination (must be different)
    const originIdx = Math.floor(random() * airports.length);
    let destIdx = Math.floor(random() * airports.length);
    while (destIdx === originIdx) {
      destIdx = Math.floor(random() * airports.length);
    }
    const origin = airports[originIdx];
    const dest = airports[destIdx];

    // Scheduled Departure Time (between 06:00 and 22:30)
    const depHour = 6 + Math.floor(random() * 17);
    const depMin = Math.floor(random() * 4) * 15; // 0, 15, 30, 45
    const scheduledDepMins = depHour * 60 + depMin;
    const scheduledDepTime = minsToTimeStr(scheduledDepMins);

    // Scheduled Flight Duration (between 60 and 360 mins, depending on distance)
    const duration = 90 + Math.floor(random() * 180);
    const scheduledArrMins = scheduledDepMins + duration;
    const scheduledArrTime = minsToTimeStr(scheduledArrMins);

    // Determine Tail Number
    const tails = tailNumbersByAirline[airline.code];
    const tailNumber = tails[Math.floor(random() * tails.length)];

    const flightNum = `${airline.code}${100 + Math.floor(random() * 899)}`;

    // Set up default delays
    let depDelay = 0;
    let arrDelay = 0;
    let carrierDelay = 0;
    let weatherDelay = 0;
    let nasDelay = 0;
    let securityDelay = 0;
    let lateAircraftDelay = 0;
    let cancelled = 0;
    let cancellationReason: string | null = null;

    // Seasonal Weather Effect Factor
    // Winter (Dec, Jan, Feb) and Summer (Jun, Jul, Aug) have more delays
    const seasonFactor = (monthIdx === 11 || monthIdx === 0 || monthIdx === 1) ? 1.6 : // winter
                         (monthIdx === 5 || monthIdx === 6 || monthIdx === 7) ? 1.3 : // summer
                         0.8; // spring/fall

    // Cancellation chance (1.5% average)
    if (random() < 0.015 * seasonFactor) {
      cancelled = 1;
      const reasons = ["A", "B", "C"]; // Carrier, Weather, NAS
      cancellationReason = reasons[Math.floor(random() * reasons.length)];
    }

    if (cancelled === 0) {
      const isDelayed = random() > (airline.onTimeProb - (origin.nasDelayProb + origin.weatherDelayProb) * seasonFactor);
      
      if (isDelayed) {
        // We have a delayed flight!
        const r = random();
        
        // Distribute delay minutes among primary causes
        if (r < 0.35) {
          // Carrier Delay
          carrierDelay = airline.baseDelay + Math.floor(random() * 45);
        } else if (r < 0.50) {
          // Weather Delay (boosted by seasonal and airport weather probability)
          weatherDelay = 25 + Math.floor(random() * 90 * origin.weatherDelayProb * seasonFactor * 5);
        } else if (r < 0.80) {
          // NAS Delay (airport traffic)
          nasDelay = 15 + Math.floor(random() * 40 * origin.nasDelayProb * seasonFactor * 4);
        } else if (r < 0.98) {
          // Late Aircraft Delay (reactionary delay)
          lateAircraftDelay = 20 + Math.floor(random() * 60);
        } else {
          // Security
          securityDelay = 10 + Math.floor(random() * 20);
        }

        depDelay = carrierDelay + weatherDelay + nasDelay + securityDelay + lateAircraftDelay;
        // Arrival delay can be slightly different due to airborne taxi adjustments
        arrDelay = Math.max(0, depDelay + Math.floor(random() * 15) - 8);
      }
    }

    flights.push({
      Flight_Date: dateStr,
      Airline: airline.name,
      Flight_Num: flightNum,
      Tail_Number: tailNumber,
      Origin: origin.code,
      Origin_City: origin.city,
      Dest: dest.code,
      Dest_City: dest.city,
      Scheduled_Dep_Time: scheduledDepTime,
      Actual_Dep_Time: cancelled ? null : addMinsToTime(scheduledDepTime, depDelay),
      Dep_Delay: cancelled ? null : depDelay,
      Scheduled_Arr_Time: scheduledArrTime,
      Actual_Arr_Time: cancelled ? null : addMinsToTime(scheduledArrTime, arrDelay),
      Arr_Delay: cancelled ? null : arrDelay,
      Carrier_Delay: carrierDelay,
      Weather_Delay: weatherDelay,
      NAS_Delay: nasDelay,
      Security_Delay: securityDelay,
      Late_Aircraft_Delay: lateAircraftDelay,
      Cancelled: cancelled,
      Cancellation_Reason: cancellationReason
    });
  }

  // 2. Inject SPECIFIC, HIGH-QUALITY cascading delay patterns (Step 2 Window function requirement)
  // We'll hardcode exactly 3 linked flights for Southwest tail N499WN on Jan 15th, 2025
  // And 3 linked flights for JetBlue tail N599JB on Jun 22nd, 2025
  // This ensures that the LAG window query returns EXACTLY what is expected!
  
  const cascadingFlights: Flight[] = [
    // Southwest Cascading Delays (Jan 15, 2025)
    {
      Flight_Date: "2025-01-15",
      Airline: "Southwest Airlines",
      Flight_Num: "WN101",
      Tail_Number: "N499WN",
      Origin: "MDW",
      Origin_City: "Chicago, IL",
      Dest: "DEN",
      Dest_City: "Denver, CO",
      Scheduled_Dep_Time: "07:00",
      Actual_Dep_Time: "07:55", // Delayed by 55 min
      Dep_Delay: 55,
      Scheduled_Arr_Time: "08:45",
      Actual_Arr_Time: "09:35", // Delayed by 50 min
      Arr_Delay: 50,
      Carrier_Delay: 45, // Mechanical issue causes primary delay
      Weather_Delay: 0,
      NAS_Delay: 10,
      Security_Delay: 0,
      Late_Aircraft_Delay: 0,
      Cancelled: 0,
      Cancellation_Reason: null
    },
    {
      Flight_Date: "2025-01-15",
      Airline: "Southwest Airlines",
      Flight_Num: "WN102",
      Tail_Number: "N499WN",
      Origin: "DEN",
      Origin_City: "Denver, CO",
      Dest: "LAS",
      Dest_City: "Las Vegas, NV",
      Scheduled_Dep_Time: "09:30", // Scheduled 9:30, but aircraft didn't arrive until 09:35!
      Actual_Dep_Time: "10:15", // Delayed by 45 min
      Dep_Delay: 45,
      Scheduled_Arr_Time: "10:25",
      Actual_Arr_Time: "11:05", // Delayed by 40 min
      Arr_Delay: 40,
      Carrier_Delay: 5,
      Weather_Delay: 0,
      NAS_Delay: 0,
      Security_Delay: 0,
      Late_Aircraft_Delay: 40, // 40 minutes of delay directly inherited from previous flight!
      Cancelled: 0,
      Cancellation_Reason: null
    },
    {
      Flight_Date: "2025-01-15",
      Airline: "Southwest Airlines",
      Flight_Num: "WN103",
      Tail_Number: "N499WN",
      Origin: "LAS",
      Origin_City: "Las Vegas, NV",
      Dest: "SFO",
      Dest_City: "San Francisco, CA",
      Scheduled_Dep_Time: "11:45", // Scheduled 11:45, but aircraft arrived 11:05 (leaves only 40 mins turn). It was delayed.
      Actual_Dep_Time: "12:35", // Delayed by 50 mins
      Dep_Delay: 50,
      Scheduled_Arr_Time: "13:20",
      Actual_Arr_Time: "14:12", // Delayed by 52 mins
      Arr_Delay: 52,
      Carrier_Delay: 10,
      Weather_Delay: 0,
      NAS_Delay: 10,
      Security_Delay: 0,
      Late_Aircraft_Delay: 30, // 30 minutes of delay inherited from previous LAS arrival!
      Cancelled: 0,
      Cancellation_Reason: null
    },

    // JetBlue Cascading Delays (Jun 22, 2025) - High weather/NAS delays in summer
    {
      Flight_Date: "2025-06-22",
      Airline: "JetBlue Airways",
      Flight_Num: "B6501",
      Tail_Number: "N599JB",
      Origin: "JFK",
      Origin_City: "New York, NY",
      Dest: "BOS",
      Dest_City: "Boston, MA",
      Scheduled_Dep_Time: "14:00",
      Actual_Dep_Time: "15:20", // Delayed by 80 mins
      Dep_Delay: 80,
      Scheduled_Arr_Time: "15:15",
      Actual_Arr_Time: "16:40", // Delayed by 85 mins
      Arr_Delay: 85,
      Carrier_Delay: 0,
      Weather_Delay: 60, // Heavy summer thunderstorm at JFK
      NAS_Delay: 20,
      Security_Delay: 0,
      Late_Aircraft_Delay: 0,
      Cancelled: 0,
      Cancellation_Reason: null
    },
    {
      Flight_Date: "2025-06-22",
      Airline: "JetBlue Airways",
      Flight_Num: "B6502",
      Tail_Number: "N599JB",
      Origin: "BOS",
      Origin_City: "Boston, MA",
      Dest: "MCO",
      Dest_City: "Orlando, FL",
      Scheduled_Dep_Time: "16:15", // Scheduled 16:15, but aircraft arrived at 16:40!
      Actual_Dep_Time: "17:35", // Delayed by 80 mins
      Dep_Delay: 80,
      Scheduled_Arr_Time: "19:25",
      Actual_Arr_Time: "20:40", // Delayed by 75 mins
      Arr_Delay: 75,
      Carrier_Delay: 5,
      Weather_Delay: 0,
      NAS_Delay: 10,
      Security_Delay: 0,
      Late_Aircraft_Delay: 65, // Inherited 65 minutes of late aircraft delay from the JFK weather delay
      Cancelled: 0,
      Cancellation_Reason: null
    }
  ];

  return [...flights, ...cascadingFlights];
}
