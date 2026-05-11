import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ImageBackground, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// all nesscsary imports for UI and frontend 


const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday"];
    const DAY_NICKNAMES= ["Sun", "Mon", "Tue", "Wed", "Thurs",
        "Fri", "Sat"]; 
        // days to be displayed on the APP 
        // as well as shortened nicknames 


const Open_Hours_GYM = { 
0:{ open: 8, close: 24},
1:{open: 5.5, close: 25},
2:{open: 5.5, close: 25},
3:{open: 5.5, close: 25},
4:{open: 5.5, close: 24},
5:{open: 5.5, close: 24},
6:{open: 8, close: 24},
};
// sunday to monday ex 8am open on sunday close 12:00am 
//general structure for time (ARC Only) 

// Rock Climbing Wall hours — sourced from arc.sdsu.edu/hours (verified May 2026)
// Keys: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const Open_Hours_Climbing = {
  0: { open: 13, close: 18 }, // Sun  1pm–6pm
  1: { open: 14, close: 21 }, // Mon  2pm–9pm
  2: { open: 10, close: 21 }, // Tue  10am–9pm
  3: { open: 14, close: 21 }, // Wed  2pm–9pm
  4: { open: 14, close: 21 }, // Thu  2pm–9pm
  5: { open: 13, close: 18 }, // Fri  1pm–6pm
  6: { open: 13, close: 18 }, // Sat  1pm–6pm
};

const Open_Hours_SS = {
0:{ open: "10:00 AM", close: "6:00PM"},
1:{ open: "7:00 AM", close: "9:00PM"},
2:{ open: "7:00 AM", close: "9:00PM"},
3:{ open: "7:00 AM", close: "9:00PM"},
4:{ open: "7:00 AM", close: "9:00PM"},
5:{ open: "7:00 AM", close: "8:00PM"},
6:{ open: "10:00 AM", close: "6:00PM"},
};
// sunday to monday ex 10AM open on Sunday 6pm close
//hard coded structure for specfically the hours tab UI 

const Crowd_Cntrl_Gage= [
    ["Free", "#02f850"],
    ["Lightly Occupied", "#e5e82e"],
    ["Fairly Occupied", "#f69e06"],
    ["Heavily Occupied", "#f24d06"], 
    ["Extremely Occupied", "#fd0606"]
]
// completed now, should display how busy the gym is alongside a corosponding color which progressvely gets more red 


// ─── API Configuration ────────────────────────────────────────────────────────
// Update API_BASE_URL to your Railway deployment URL once hosted.
// Keep localhost for local development.
const API_BASE_URL = "http://localhost:8000";

// Maps JS Date.getDay() index → day abbreviation used in crowd_data.csv.
// Note: the display array uses "Thurs" but the CSV (and backend) uses "Thu".
const DAY_CSV_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calls the FastAPI /recommendations endpoint for a single day and time window.
 * Runs the response through the adapter/schema-validation layer before returning
 * so the UI never receives malformed data (R2 mitigation).
 * Throws on non-2xx responses so callers can catch and fall back gracefully.
 */
async function fetchRecommendations(dayIdx, startHour, endHour) {
  const response = await fetch(`${API_BASE_URL}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      days: [DAY_CSV_NAMES[dayIdx]],
      start_hour: startHour,
      end_hour: endHour,
    }),
  });
  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }
  const json = await response.json();

  // ── Schema validation (R2 mitigation) ──────────────────────────────────────
  // Validate shape inline here (mirrors api_adapter.js logic).
  // If the backend schema changes, this is the single place to update.
  const items = Array.isArray(json.recommendations) ? json.recommendations : [];
  const validated = items.filter(item => {
    const ok =
      item && typeof item.day === "string" &&
      typeof item.hour === "number" &&
      typeof item.occupancy === "number";
    if (!ok) console.warn("[ARCCO] Unexpected recommendation shape:", JSON.stringify(item));
    return ok;
  });
  return validated; // [{ day, hour, occupancy }, ...]
}

// ─────────────────────────────────────────────────────────────────────────────

//Helper Functions
function isArcOpen() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const {open, close} = Open_Hours_GYM[now.getDay()];
    return h >= open && h < close;
}

// Gets crowd data (pct)=percent and determines color
function getCrowd(pct) {
    if (pct == null)
        return {
            label: "Unknown",
            color: "#8a8a8a",
            bar: "#8a8a8a",
            bg: "rgba(255,255,255,0.75)"
        };
    if (pct < 15) {
        return {
            label: "Not Busy",
            color: "#00b303",
            bar: "#00b303",
            bg: "rgba(255,255,255,0.75)"
        }
    };
    if (pct < 35) {
        return {
            label: "A Little Busy",
            color: "#1aff00",
            bar: "#1aff00",
            bg: "rgba(255,255,255,0.75)"
        }
    };
    if (pct < 55) {
        return {
            label: "Somewhat Busy",
            color: "#fffb2a",
            bar: "#fffb2a",
            bg: "rgba(255,255,255,0.75)"
        }
    }
    if (pct < 75){
        return {
            label: "Very Busy",
            color: "#fa9d2c",
            bar: "#fa9d2c",
            bg: "rgba(255,255,255,0.75)"
        }
    };
    return {
        label: "As Busy As It Gets",
        color: "#dc2626",
        bar: "#dc2626",
        bg: "rgba(255,255,255,0.75)"
    };
}

function fmtArcHour(h) {
    if (h == null) {
        return "-";
    }
    const a = h % 24;
    const hasHalf = h % 1 === 0.5;
    const wholeH = Math.floor(a);
    const suffix = a >= 12 ? "PM" : "AM";
    const display = wholeH > 12 ? wholeH - 12 : wholeH === 0 ? 12 : wholeH;
    return `${display}${hasHalf ? ":30" : ""} ${suffix}`;
}

function fmtHour(h) {
    if (h === 0 || h === 24) return "12 AM";
    if (h === 12) return "12 PM";
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function getTimelineSlots() {
    const {open, close} = Open_Hours_GYM[new Date().getDay()];
    const slots = [];
    for (let h = Math.ceil(open); h < Math.min(close, 24); h++) slots.push(h);
    return slots;
}

function emptySchedule() {
    const s = {};
    for (let d = 0; d < 7; d++) s[d] = [];
    return s;
}

// Hour Stepper
function HourStepper({ value, onChange, min = 5, max = 24 }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1a2035", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
      <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.04)" }}>
        <Text style={{ color: "#64748b", fontSize: 18, lineHeight: 20 }}>−</Text>
      </TouchableOpacity>
      <Text style={{ color: "#e2e8f0", fontSize: 13, fontWeight: "600", minWidth: 64, textAlign: "center" }}>
        {fmtHour(value)}
      </Text>
      <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.04)" }}>
        <Text style={{ color: "#64748b", fontSize: 18, lineHeight: 20 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// Hours Card that generates weekly operating hours for each facility
function HoursCard({ title, emoji, hoursMap, isLive, onEdit }) {
  // Current day logic
  const today   = new Date().getDay();
  const todayHr = hoursMap[today];
  const isOpen  = todayHr != null;
  // Format Hours
  const openLabel  = isLive ? fmtArcHour(todayHr?.open)  : todayHr?.open  ?? "Closed";
  const closeLabel = isLive ? fmtArcHour(todayHr?.close) : todayHr?.close ?? "";

  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
          <View>
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#e2e8f0" }}>{title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOpen ? "#34d399" : "#f87171" }} />
              <Text style={{ fontSize: 11, color: isOpen ? "#34d399" : "#f87171", fontWeight: "600" }}>
                {isOpen ? `Open · ${openLabel} – ${closeLabel}` : "Closed Today"}
              </Text>
            </View>
          </View>
        </View>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(56,189,248,0.08)", borderWidth: 1, borderColor: "rgba(56,189,248,0.2)" }}>
            <Text style={{ fontSize: 11, color: "#38bdf8" }}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ gap: 6 }}>
        {DAY_NICKNAMES.map((day, i) => {
          const hr      = hoursMap[i];
          const isToday = i === today;
          const open    = isLive ? fmtArcHour(hr?.open)  : hr?.open;
          const close   = isLive ? fmtArcHour(hr?.close) : hr?.close;
          return (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: isToday ? "rgba(56,189,248,0.06)" : "transparent", borderWidth: isToday ? 1 : 0, borderColor: "rgba(56,189,248,0.15)" }}>
              <Text style={{ fontSize: 13, fontWeight: isToday ? "700" : "400", color: isToday ? "#38bdf8" : "#64748b", width: 36 }}>{day}</Text>
              <Text style={{ fontSize: 13, color: hr ? (isToday ? "#e2e8f0" : "#94a3b8") : "#334155" }}>
                {hr ? `${open} – ${close}` : "Closed"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Segment Bar
function SegmentBar({ pct, color, height = 16 }) {
  const total  = 20;
  const filled = Math.round((pct / 100) * total);
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flex: 1, height, borderRadius: 3, backgroundColor: i < filled ? color : "rgba(0,0,0,0.1)" }} />
      ))}
    </View>
  );
}

// Algorithm to suggest best times to get to ARC
function computeSuggestions(history, schedule, allowEarlyLate = false) {
  const REASONABLE_START = 8;
  const REASONABLE_END = 22;
  const suggestions = [];
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const { open, close } = Open_Hours_GYM[dayIdx];
    const arcOpen  = Math.ceil(open);
    const arcClose = Math.min(Math.floor(close), 24);
    const minHour  = allowEarlyLate ? arcOpen      : Math.max(arcOpen + 1, REASONABLE_START);
    const maxHour  = allowEarlyLate ? arcClose - 1 : Math.min(arcClose - 2, REASONABLE_END);
    for (let h = minHour; h <= maxHour; h++) {
      const busy = (schedule[dayIdx] || []).some(b => h >= b.start && h < b.end);
      if (busy) continue;
      const FLOORS = ["ARC Floor 1", "ARC Floor 2"];
      const readings = [];
      history.forEach(({ timestamp, data }) => {
        const d = new Date(timestamp);
        if (d.getDay() !== dayIdx || d.getHours() !== h) return;
        const floors = data.filter(l => FLOORS.includes(l.LocationName) && !l.IsClosed);
        if (!floors.length) return;
        const avg = floors.reduce((s, l) => s + (l.TotalCapacity > 0 ? (l.LastCount / l.TotalCapacity) * 100 : 0), 0) / floors.length;
        readings.push(avg);
      });
      const crowdPct  = readings.length ? readings.reduce((a, b) => a + b, 0) / readings.length : null;
      const baseScore = crowdPct !== null ? 100 - crowdPct : 50;
      const timeBonus = (h >= 9 && h <= 11) || (h >= 14 && h <= 16) ? 5 : 0;
      suggestions.push({ day: dayIdx, hour: h, score: baseScore + timeBonus, crowdPct, readings: readings.length });
    }
  }
  // Sort by score descending. Tiebreaker: prefer today so that when historical
  // data is sparse (all slots score ~50), today's slots surface first rather
  // than Sunday (day 0) which was previously always first due to loop order.
  const todayIdx = new Date().getDay();
  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.day === todayIdx && b.day !== todayIdx) return -1;
    if (b.day === todayIdx && a.day !== todayIdx) return 1;
    return a.hour - b.hour;
  });
  return suggestions;
}


// diffrent sections of the arc
const Arc_sections = [{
name: "ARC", locations: [
    "ARC Floor 1", "ARC Floor 2", "ARC Olympic Gym", "ARC Courts"],},]

const ROOM_NAME_MAP = {
  "ARC Floor 1": "ARC Floor 1",
  "ARC Floor 2": "ARC Floor 2",

  "Climbing Wall": "Climbing Wall",
  "Climbing": "Climbing (Closed Area)",

  "ARC Olympic Lifting Zones": "Olympic Lifting",
  "South Court": "South Court",
  "4 Court Gym": "4 Court Gym",
  "North Court": "North Court",

  "ARC Express": "ARC Express",

  "Aquaplex Pool Deck": "Pool Deck",
  "Competition Pool": "Competition Pool",
  "Recreation Pool": "Recreation Pool",

  "Spa": "Spa",
  "Tennis Courts": "Tennis Courts",
};

const SAMPLE_DATA = [
  {
    FacilityName: "ARC",
    LocationName: "ARC Floor 1",
    LocationId: "arc-floor-1",
    IsClosed: false,
    LastCount: 133,
    TotalCapacity: 198,
  },
  {
    FacilityName: "ARC",
    LocationName: "ARC Floor 2",
    LocationId: "arc-floor-2",
    IsClosed: false,
    LastCount: 99,
    TotalCapacity: 130,
  },
  {
    FacilityName: "ARC",
    LocationName: "Climbing Wall",
    LocationId: "climbing-wall",
    IsClosed: false,
    LastCount: 22,
    TotalCapacity: 100,
  },
  {
    FacilityName: "ARC",
    LocationName: "ARC Olympic Lifting Zones",
    LocationId: "olympic-lifting",
    IsClosed: false,
    LastCount: 45,
    TotalCapacity: 150,
  },
  {
    FacilityName: "ARC",
    LocationName: "South Court",
    LocationId: "south-court",
    IsClosed: false,
    LastCount: 2,
    TotalCapacity: 50,
  },
  {
    FacilityName: "ARC",
    LocationName: "4 Court Gym",
    LocationId: "4-court-gym",
    IsClosed: false,
    LastCount: 22,
    TotalCapacity: 367,
  },
  {
    FacilityName: "ARC",
    LocationName: "North Court",
    LocationId: "north-court",
    IsClosed: false,
    LastCount: 3,
    TotalCapacity: 100,
  },
  {
    FacilityName: "ARC",
    LocationName: "ARC Express",
    LocationId: "arc-express",
    IsClosed: false,
    LastCount: 25,
    TotalCapacity: 100,
  },
  {
    FacilityName: "Aquatics",
    LocationName: "Aquaplex Pool Deck",
    LocationId: "pool-deck",
    IsClosed: false,
    LastCount: 5,
    TotalCapacity: 167,
  },
  {
    FacilityName: "Aquatics",
    LocationName: "Competition Pool",
    LocationId: "competition-pool",
    IsClosed: false,
    LastCount: 5,
    TotalCapacity: 71,
  },
  {
    FacilityName: "Aquatics",
    LocationName: "Recreation Pool",
    LocationId: "recreation-pool",
    IsClosed: false,
    LastCount: 3,
    TotalCapacity: 150,
  },
  {
    FacilityName: "Aquatics",
    LocationName: "Spa",
    LocationId: "spa",
    IsClosed: false,
    LastCount: 10,
    TotalCapacity: 20,
  },
  {
    FacilityName: "Outdoor",
    LocationName: "Tennis Courts",
    LocationId: "tennis-courts",
    IsClosed: true,
    LastCount: 0,
    TotalCapacity: 0,
  },
];

//layout/ general UI colors 
const styles = StyleSheet.create({
    container:{
        flex: 1, backgroundColor: "#000105",
    },
    header:{
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingTop: Platform.OS === "ios" ? 56 :40,
        paddingBottom: 12
    },
    Barsize:{
        flexDirection: "row",
        borderTopWidth :1,
        borderTopColor: "rgba(255,255,255,0.05)",
        backgroundColor: "#080b15", 
        paddingBottom: Platform.OS === "ios" ? 24: 8
    },
    tabs:{
        flex: 1,
        alignItems: "center",
        paddingTop: 10,
        paddingBottom: 4,
        position: "relative",
    },
    sched:{
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.01)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)"
    },
    sched2: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderColor: "rgba(251, 191, 36,.3)",
    },
    overlays:{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    card:{
        backgroundColor: "#0a0f1b",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        maxHeight: "90%",
        flex:1,
        marginTop: "10%" ,
    },
    header2:{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 18,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
    },
    primaryHeader:{
    paddingVertical: 7, 
    paddingHorizontal: 16,
    borderRadius: 8, 
    backgroundColor : "rgba(49, 189, 249, 0.04)",
    borderWidth: 1,
    borderColor:  "rgba(49, 189, 249, 0.04)"
},
secondHeader:{
    paddingVertical: 7, 
    paddingHorizontal:20,
    borderRadius: 8,
    backgroundColor: "rgba(49, 189, 249, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(49, 189, 249, 0.04)"
},
modalOverlay:{
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
},
modalCard:{
    backgroundColor: "#0a0f1b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    maxHeight: "90%",
    flex:1,
    marginTop: "10%",
},
modalHeader:{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
},
btnPrimary:{
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "rgba(56,189,248,.12)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,.3)",
},
btnSecondary:{
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
},
});

//Main Screen that displays ARC gym status, crowd level, and usage trends
function StatusScreen({ data, history, loading, error, arcOpen, schedule, setShowSchedule, apiStatus, lastUpdated }) {
    //Animated screen fade-in
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!loading) Animated.timing(fadeAnim, {toValue: 1, duration: 450, useNativeDriver: true}).start();
    }, [loading]);
    
    const locs = data.filter(l => l.FacilityName === "ARC"); //gets only ARC locations
    const openLocs = locs.filter(l => !l.IsClosed); //keeps only open locations
    const overallPct = openLocs.length // Calculate average occupancy percentage across all open ARC locations
        ? Math.round(openLocs.reduce((s, l) => s + (l.TotalCapacity > 0 ? (l.LastCount / l.TotalCapacity) * 100 : 0), 0) / openLocs.length)
        : 0;
    const crowd = getCrowd(arcOpen ? overallPct : null); //determines crowd level based on occupancy

    // Only show ARC Floor 1 & 2
    const arcFloors = data.filter(l => ["ARC Floor 1", "ARC Floor 2"].includes(l.LocationName));

    const totalBusyBlocks = Object.values(schedule).reduce((s, b) => s + b.length, 0);
    const todaySuggestions = computeSuggestions(history, schedule, false).filter(s => s.day === new Date().getDay());
    const bestToday = todaySuggestions[0];
    // above is computing best times to visit today based on past history and schedule

    if (loading) { // Shows the loading spinner while fetching data
        return (
            <View style={{flex: 1, alignItems: "center", justifyContent: "center", gap: 14}}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={{ fontSize: 13, color: "#334155" }}>Loading live data...</Text>
            </View>
        );
    }

    return (
        // Main scrollable screen w fade-in animation
                <ImageBackground
            source={require("../../assets/images/background2.png")}
            style={{ flex: 1 }}
            imageStyle={{ opacity: 0.55 }}
        >
        <Animated.ScrollView style={{ flex: 1, opacity: fadeAnim }} contentContainerStyle={{ padding: 16, paddingBottom: 40}}>
            {/* API health / stale-data banner — shown when backend is unreachable (R1 mitigation) */}
            {apiStatus === "unhealthy" && (
              <View style={{ backgroundColor: "rgba(248,113,113,.08)", borderWidth: 1, borderColor: "rgba(248,113,113,.22)", borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 14 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fca5a5", fontSize: 12, fontWeight: "600" }}>Backend unavailable</Text>
                  <Text style={{ color: "#f87171", fontSize: 11, marginTop: 2 }}>
                    {lastUpdated
                      ? `Showing data cached at ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Start the FastAPI server to refresh.`
                      : "Live data is unavailable. Start the FastAPI backend server."}
                  </Text>
                </View>
              </View>
            )}

            {/* Last updated timestamp — shown when data is fresh */}
            {apiStatus === "healthy" && lastUpdated && (
              <View style={{ alignSelf: "flex-end", marginBottom: 8 }}>
                <Text style={{ fontSize: 10, color: "#334155" }}>
                  Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            )}

            {/*Best time banner to display best time to visit based on data*/}
            {totalBusyBlocks > 0 && bestToday && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(56,189,248,.07)", borderWidth: 1, borderColor: "rgba(56,189,248,.2)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1}}>
                        <Text style={{ fontSize: 16 }}>✨</Text>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#38bdf8" }}>
                            Best time today:{" "}
                            <Text style={{ color: "#94a3b8", fontWeight: "400" }}>{fmtHour(bestToday.hour)} - {fmtHour(bestToday.hour + 1)}</Text>
                            {bestToday.crowdPct !==null && (
                                <Text style={{ color: getCrowd(bestToday.crowdPct).color }}> ~{Math.round(bestToday.crowdPct)}% full</Text>
                            )}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowSchedule(true)}>
                        <Text style={{ fontSize: 11, color: "#38bdf8", textDecorationLine: "underline" }}>See all →</Text>
                    </TouchableOpacity>
                    </View>
        )}

        {/* Edit Schedule Button */}
        <TouchableOpacity
          onPress={() => setShowSchedule(true)}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: "rgba(56,189,248,.12)",
            borderWidth: 1,
            borderColor: "rgba(56,189,248,.3)",
            marginBottom: 14
          }}
        >
          <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600" }}>
            Edit Schedule
          </Text>
        </TouchableOpacity>




            {/* Big meter used to display current occupancy percent or closed status*/}
            <View style={{ backgroundColor: arcOpen ? crowd.bg : "rgba(255,255,255,.02)", borderWidth: 1, borderColor: arcOpen ? crowd.color + "28" : "rgba(255,255,255,.05)", borderRadius: 20, padding: 22, marginBottom: 14 }}>
                <View>
                    <View>
                    <Text style={{ fontSize: 10, color: "#334155", letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>
                        How busy is the ARC right now?
                    </Text>
                    <Text style={{ fontSize: 52, fontWeight: "800", color: arcOpen ? crowd.color : "#1e293b", lineHeight: 56 }}>
                        {arcOpen ? `${overallPct}%` : "-"}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: "600", marginTop: 8, color: arcOpen ? crowd.color : "#334155" }}>
                        {arcOpen ? crowd.label : "Closed Right Now"}
                    </Text>
                </View>
                    <View style={{ alignItems: "flex-end", paddingTop: 4}}>
                        <Text style={{ fontSize: 10, color: "#334155", letterSpacing: 1.2, marginBottom: 4}}>TODAY'S HOURS</Text>
                        <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "500" }}>
                            {fmtArcHour(Open_Hours_GYM[new Date().getDay()].open)} – {fmtArcHour(Open_Hours_GYM[new Date().getDay()].close)}
                        </Text>
                    </View>
                </View>
                {arcOpen && <SegmentBar pct={overallPct} color={crowd.bar} />}
                <View style={{ flexDirection: "row", gap: 5, marginTop: 14, flexWrap: "wrap" }}>
                    {Crowd_Cntrl_Gage.map(([label, color]) => {
                        const active = crowd.label === label && arcOpen;
                        return (
                            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, backgroundColor: active ? color + "18" : "rgba(255,255,255,.02)", borderWidth: 1, borderColor: active ? color + "40" : "rgba(255,255,255,.04)" }}>
                                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: active ? color : "#1e293b" }} />
                                <Text style={{ fontSize: 9, color: active ? color : "#334155" }}>{label}</Text>
                            </View>
                        )
                    })}
                </View>
            </View>

            {/* Timeline to show past data (every 5 minutes)*/}
            <View style={{ backgroundColor: "rgba(255,255,255,.02)", borderWidth: 1, borderColor: "rgba(255,255,255,.05)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: "#334155", letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase" }}>
                    Today's Timeline · {history.length} Snapshot{history.length !== 1 ? "s" : ""} Collected
                </Text>

                {/* <Timeline history={history} /> */}
                {history.length < 2 && (
                    <Text style={{ textAlign: "center", paddingTop: 8, fontSize: 11, color: "#1e293b" }}>Timeline fills in every 5 min as you use the app</Text>
                )}
            </View>

            {/* ARC Floor 1 & 2 cards */}
            {/* Renders individual cards for Floor 1 and Floor 2*/}
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>ARC Floors</Text>
            {arcFloors.length > 0
                ? arcFloors.map(loc => <LocationCard key={loc.LocationId || loc.LocationName} loc={loc} />)
                : <Text style={{ color: "#334155", fontSize: 13, marginBottom: 12 }}>No floor data available.</Text>
            }

            {error && (
                <View style ={{ marginTop: 8, backgroundColor: "rgba(248,113,113,.07)", borderWidth: 1, borderColor: "rgba(248,113,113,.18)", borderRadius: 10, padding: 12 }}>
                    <Text style={{ color: "#fca5a5", fontSize: 12 }}>⚠ {error}</Text>
                </View>
            )} 
            {/* Shows an error message if data fetch fails*/}
        </Animated.ScrollView>
        </ImageBackground>
    );
}

//Starting function ScheduleModal
function ScheduleModal({ visible, schedule, onSave, onClose, history }) {
  // Local copy of the schedule so edits in the modal do not immediately change parent state
  const [localSchedule,  setLocalSchedule]  = useState(() => JSON.parse(JSON.stringify(schedule)));

  // Whether suggestions can include very early or very late hours
  const [allowEarlyLate, setAllowEarlyLate] = useState(false);

  // Currently selected day tab inside the schedule editor
  const [activeDay,      setActiveDay]      = useState(new Date().getDay());

  // Temporary start/end values for adding a new busy block
  const [addStart,       setAddStart]       = useState(9);
  const [addEnd,         setAddEnd]         = useState(10);

  // Controls whether the modal shows the schedule editor or suggestion list
  const [tab,            setTab]            = useState("schedule");

  // Backend-fetched suggestions state
  const [apiSuggestions,    setApiSuggestions]    = useState(null);  // null = not yet fetched
  const [apiFetching,       setApiFetching]        = useState(false);
  const [apiSuggestError,   setApiSuggestError]    = useState(null);

  // Reset the local editable schedule every time the modal opens
  useEffect(() => {
    if (visible) {
      setLocalSchedule(JSON.parse(JSON.stringify(schedule)));
      setApiSuggestions(null);
      setApiSuggestError(null);
    }
  }, [visible]);

  // Fetch backend suggestions whenever the suggestions tab is active
  const todayDay = new Date().getDay();
  useEffect(() => {
    if (tab !== "suggestions" || apiFetching || apiSuggestions !== null) return;
    const { open, close } = Open_Hours_GYM[todayDay];
    const startHour = Math.ceil(open);
    const endHour   = Math.min(Math.floor(close), 23);
    setApiFetching(true);
    setApiSuggestError(null);
    fetchRecommendations(todayDay, startHour, endHour)
      .then(results => setApiSuggestions(results))
      .catch(err => {
        console.warn("Backend suggestions unavailable, falling back to local:", err.message);
        setApiSuggestError("Could not reach backend — showing local estimates.");
        setApiSuggestions(null);
      })
      .finally(() => setApiFetching(false));
  }, [tab, todayDay]);

  // Compute local suggestions as fallback (used when backend is unreachable)
  const allSuggestions  = computeSuggestions(history, localSchedule, allowEarlyLate);
  const topSuggestions  = allSuggestions.filter(s => s.day === todayDay).slice(0, 7);

  // Adds a busy block for the currently active day
  function addBlock() {
    if (addStart >= addEnd) return;

    setLocalSchedule(prev => {
      const next = JSON.parse(JSON.stringify(prev));

      // Add the new block and keep blocks sorted by start time
      next[activeDay] = [...(next[activeDay] || []), { start: addStart, end: addEnd }]
        .sort((a, b) => a.start - b.start);

      return next;
    });
}

// Removes a specific busy block from a given day
  function removeBlock(dayIdx, idx) {
    setLocalSchedule(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[dayIdx] = next[dayIdx].filter((_, i) => i !== idx);
      return next;
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={{ fontWeight: "700", fontSize: 16, color: "#e2e8f0" }}>My Schedule</Text>
              <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                Set your busy hours — we'll find the best time to go
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: "#475569", fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab switcher between editing schedule and viewing suggestions */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)", paddingHorizontal: 16 }}>
            {[["schedule", "📅 My Schedule"], ["suggestions", `✨ Best Times${topSuggestions.length ? ` (${topSuggestions.length})` : ""}`]].map(([id, label]) => (
              <TouchableOpacity
                key={id}
                onPress={() => setTab(id)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === id ? "#38bdf8" : "transparent",
                  marginBottom: -1
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: tab === id ? "600" : "400", color: tab === id ? "#38bdf8" : "#64748b" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {tab === "schedule" && (
              <>
                {/* Day selector pills */}
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {DAY_NICKNAMES.map((d, i) => {
                    const hasBusy = (localSchedule[i] || []).length > 0;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setActiveDay(i)}
                        style={{
                          paddingVertical: 5,
                          paddingHorizontal: 12,
                          borderRadius: 20,
                          backgroundColor: activeDay === i ? "rgba(56,189,248,.15)" : "rgba(255,255,255,.03)",
                          borderWidth: 1,
                          borderColor: activeDay === i ? "rgba(56,189,248,.4)" : hasBusy ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,.07)"
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: activeDay === i ? "700" : "400", color: activeDay === i ? "#38bdf8" : hasBusy ? "#fbbf24" : "#64748b" }}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={{ fontSize: 11, color: "#475569", letterSpacing: 1, marginBottom: 12 }}>
                  {DAY_NAMES[activeDay].toUpperCase()} — BUSY BLOCKS
                </Text>

                {/* Show either empty state or existing busy blocks for the selected day */}
                {(localSchedule[activeDay] || []).length === 0 ? (
                  <View style={{ backgroundColor: "rgba(255,255,255,.02)", borderWidth: 1, borderColor: "rgba(255,255,255,.05)", borderRadius: 10, padding: 16, alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, color: "#334155" }}>
                      No busy blocks on {DAY_NAMES[activeDay]} — you're free all day!
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 6, marginBottom: 16 }}>
                    {localSchedule[activeDay].map((block, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: "rgba(251,191,36,0.07)",
                          borderWidth: 1,
                          borderColor: "rgba(251,191,36,0.2)",
                          borderRadius: 10,
                          padding: 12
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fbbf24" }} />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#fde68a" }}>
                            {fmtHour(block.start)} – {fmtHour(block.end)}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#92400e" }}>Busy</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeBlock(activeDay, idx)}>
                          <Text style={{ color: "#475569", fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
    )}
  </>
)}

{tab === "schedule" && (
  <>
    {/* Add new busy block controls */}
                <View style={{ backgroundColor: "rgba(255,255,255,.02)", borderWidth: 1, borderColor: "rgba(255,255,255,.06)", borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 11, color: "#475569", letterSpacing: 1, marginBottom: 10 }}>ADD BUSY BLOCK</Text>
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 12, color: "#64748b", width: 34 }}>From</Text>
                      <HourStepper value={addStart} onChange={setAddStart} min={5} max={23} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 12, color: "#64748b", width: 34 }}>To</Text>
                      <HourStepper value={addEnd} onChange={setAddEnd} min={6} max={24} />
                    </View>
                    <TouchableOpacity
                      onPress={addBlock}
                      style={{
                        alignSelf: "flex-start",
                        paddingVertical: 8,
                        paddingHorizontal: 20,
                        borderRadius: 8,
                        backgroundColor: "rgba(56,189,248,.12)",
                        borderWidth: 1,
                        borderColor: "rgba(56,189,248,.3)"
                      }}
                    >
                      <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600" }}>+ Add Block</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Basic validation for time range */}
                  {addStart >= addEnd && (
                    <Text style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>
                      End time must be after start time
                    </Text>
                  )}
                </View>

                {/* Toggle for allowing recommendations outside normal hours */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 16,
                    padding: 14,
                    backgroundColor: "rgba(255,255,255,.02)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,.05)",
                    borderRadius: 10
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "500", color: "#94a3b8" }}>Include early / late hours</Text>
                    <Text style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                      Allow suggestions before 8 AM or after 10 PM
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAllowEarlyLate(p => !p)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: allowEarlyLate ? "rgba(56,189,248,.4)" : "rgba(255,255,255,.08)",
                      borderWidth: 1,
                      borderColor: allowEarlyLate ? "rgba(56,189,248,.6)" : "rgba(255,255,255,.12)",
                      justifyContent: "center"
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: allowEarlyLate ? 20 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: allowEarlyLate ? "#38bdf8" : "#475569"
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
                       {tab === "suggestions" && (
              <>
                {/* Summary of how suggestions are generated */}
                <Text style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 18 }}>
                  Best times for <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>{DAY_NAMES[todayDay]}</Text>{" "}
                  {apiSuggestions ? "from backend crowd data." : `based on ${history.length} local reading${history.length !== 1 ? "s" : ""} from ARC Floor 1 & 2.`}
                </Text>

                {/* Backend fetch error — show fallback notice */}
                {apiSuggestError && (
                  <View style={{ backgroundColor: "rgba(251,191,36,.07)", borderWidth: 1, borderColor: "rgba(251,191,36,.2)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <Text style={{ fontSize: 12, color: "#fde68a" }}>⚠ {apiSuggestError}</Text>
                  </View>
                )}

                {/* Loading state while fetching from backend */}
                {apiFetching && (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <ActivityIndicator size="small" color="#38bdf8" />
                    <Text style={{ fontSize: 12, color: "#334155", marginTop: 8 }}>Fetching from backend…</Text>
                  </View>
                )}

                {/* Suggestions list — backend results take priority, local fallback if unavailable */}
                {!apiFetching && (() => {
                  // Build display items from backend or local computation
                  const displayItems = apiSuggestions
                    ? apiSuggestions.map(r => ({
                        day: todayDay,
                        hour: r.hour,
                        crowdPct: r.occupancy,  // backend returns raw occupancy %
                        source: "backend",
                      }))
                    : topSuggestions;

                  if (displayItems.length === 0) {
                    return (
                      <Text style={{ textAlign: "center", padding: 32, color: "#334155", fontSize: 13 }}>
                        No free slots found. Try removing busy blocks or enabling early/late hours.
                      </Text>
                    );
                  }

                  return (
                    <View style={{ gap: 8 }}>
                      {displayItems.map((s, idx) => {
                        const crowd = getCrowd(s.crowdPct);
                        return (
                          <View
                            key={idx}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                              backgroundColor: idx === 0 ? "rgba(56,189,248,.07)" : "rgba(255,255,255,.025)",
                              borderWidth: 1,
                              borderColor: idx === 0 ? "rgba(56,189,248,.25)" : "rgba(255,255,255,.06)",
                              borderRadius: 12,
                              padding: 14
                            }}
                          >
                            {/* Rank badge */}
                            <View
                              style={{
                                width: 28, height: 28, borderRadius: 14,
                                backgroundColor: idx === 0 ? "rgba(56,189,248,.2)" : "rgba(255,255,255,.05)",
                                borderWidth: 1,
                                borderColor: idx === 0 ? "rgba(56,189,248,.4)" : "rgba(255,255,255,.08)",
                                alignItems: "center", justifyContent: "center"
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: "700", color: idx === 0 ? "#38bdf8" : "#475569" }}>
                                {idx + 1}
                              </Text>
                            </View>

                            {/* Time info */}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: "700", fontSize: 14, color: "#e2e8f0" }}>
                                {DAY_NAMES[s.day ?? todayDay]}
                              </Text>
                              <Text style={{ fontSize: 12, color: "#64748b" }}>
                                {fmtHour(s.hour)} – {fmtHour(s.hour + 1)}
                              </Text>
                            </View>

                            {/* Crowd percentage */}
                            <View style={{ alignItems: "flex-end" }}>
                              {s.crowdPct != null ? (
                                <>
                                  <Text style={{ fontSize: 16, fontWeight: "800", color: crowd.color }}>
                                    {Math.round(s.crowdPct)}%
                                  </Text>
                                  <Text style={{ fontSize: 10, color: crowd.color }}>{crowd.label}</Text>
                                </>
                              ) : (
                                <Text style={{ fontSize: 11, color: "#334155" }}>No data yet</Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </>
            )}
          </ScrollView>

          {/* Modal footer buttons */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, padding: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.06)" }}>
            <TouchableOpacity onPress={onClose} style={styles.btnSecondary}>
              <Text style={{ color: "#94a3b8", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { onSave(localSchedule); onClose(); }} style={styles.btnPrimary}>
              <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600" }}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}



            


// Location card bar
function LocationCard({loc}) {
    const pct = loc.TotalCapacity > 0 ? Math.round((loc.LastCount/loc.TotalCapacity) * 100) : 0;
    const crowd = getCrowd(loc.IsClosed ? null : pct);
    return (
        <View style = {{backgroundColor : loc.IsClosed ? "rgba(255,255,255,0.05)" : crowd.bg, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, opacity: loc.IsClosed ? 0.5 : 1, marginBottom: 8}}>
            <View style = {{flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: loc.IsClosed ? 0 : 10}}>
                <View style = {{flex: 1, paddingRight: 8}}>
                    <Text style = {{fontWeight: "600",fontSize: 14, color: loc.IsClosed ? "#94a3b8" : "#1e293b"}}> {loc.LocationName} </Text>
                    {loc.IsClosed && <Text style = {{fontSize: 10, color: "#94a3b8", marginTop: 3}}>Closed</Text>}
                </View>
                {!loc.IsClosed && (
                    <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 18, fontWeight: "800", color: crowd.color }}>{pct}%</Text>
                        <Text style={{ fontSize: 10, color: crowd.color, opacity: 0.9, marginTop: 2 }}>{crowd.label}</Text>
                    </View>
                )}
            </View>
            {!loc.IsClosed && (
                <>
                <SegmentBar pct = {pct} color={crowd.bar} height = {13}/>
                <View style = {{flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7}}>
                    <View style = {{flexDirection: "row", alignItems: "center", gap: 5}}>
                        <View style = {{width: 5, height: 5, borderRadius: 3, backgroundColor: crowd.color}} />
                        <Text style = {{fontSize: 11, color: crowd.color, fontWeight: "500"}} > {loc.LastCount} people here</Text>
                    </View>
                <Text style = {{fontSize: 10, color: "#64748b"}}>cap {loc.TotalCapacity}</Text>
                    </View>
                </>
            )}
        </View>
    );
}
// Allows the "Counts" page to be used
function FacilitySection({ name, locs }) {
  const openLocs    = locs.filter(l => !l.IsClosed);
  const facilityPct = openLocs.length ? Math.round(openLocs.reduce((s, l) => s + (l.TotalCapacity > 0 ? (l.LastCount / l.TotalCapacity) * 100 : 0), 0) / openLocs.length) : null;
  const crowd       = getCrowd(facilityPct);
  const totalPeople = openLocs.reduce((s, l) => s + l.LastCount, 0);
  return (
    <View style={{ marginBottom: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#e2e8f0", letterSpacing: 1.5, textTransform: "uppercase" }}>{name}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
        {facilityPct !== null && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 11, color: "#94a3b8" }}>{totalPeople} people</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: crowd.color }}>{facilityPct}%</Text>
          </View>
        )}
      </View>
      {locs.map(loc => <LocationCard key={loc.LocationId || loc.LocationName} loc={loc} />)}
    </View>
  );
}



function CountScreen({data, loading, error, arcOpen}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    if (loading) { // displays loading state
        return (
            <View style={{flex: 1, alignItems: "center", justifyContent: "center", gap: 14}}>
                <ActivityIndicator size = "large" color = "#38bdf8" />
                <Text style = {{fontSize: 13, color: "#334155"}}>Loading Live Data</Text>
            </View>
        )
    }

    // When the ARC is closed, zero out all counts so cards show as closed
    const displayData = arcOpen
        ? data
        : data.map(l => ({ ...l, IsClosed: true, LastCount: 0 }));

    const filtered = displayData.filter(l => !["ARC Floor 1", "ARC Floor 2"].includes(l.LocationName));
    const allFacilities = {};
    filtered.forEach( loc => {
        if (!allFacilities[loc.FacilityName]) allFacilities[loc.FacilityName] = [];
        allFacilities[loc.FacilityName].push(loc);
    });

    return ( // displays the live counts for each facility, organized by facility name and location, with a fade in animation when data is loaded
        <Animated.ScrollView style = {{flex: 1, opacity: fadeAnim}} contentContainerStyle = {{padding: 16, paddingBottom: 40}}>
            <Text style = {{fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16}}>Live Facility Counts</Text>
            {Object.entries(allFacilities).map(([name, locs]) => (
                <FacilitySection key = {name} name = {name} locs = {locs} />
            ))}
            {error && (
                <View style = {{marginTop: 8, backgroundColor: "rgba(248, 113, 113, .07)", borderWidth: 1, borderColor: "rgba(248, 113, 113, .18)", borderRadius: 10, padding: 12}}>
                    <Text style = {{color: "#fca5a5", fontSize: 12}}> {error}</Text>
                </View>
            )}
        </Animated.ScrollView>
    )
}

function HoursScreen({shakeSmartHours}) {
    return ( //Displays the hours for each facility, with a note about how ARC and Rock Climbing Wall hours are based on the weekly schedule, and a live indicator for facilities that have live data available
        <ScrollView contentContainerStyle = {{padding : 16, paddingBottom: 40}}>
        <Text style = {{fontSize: 11, fontWeight: "700", color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16}}> Facility Hours </Text>
        <HoursCard
        title = "ARC"
        hoursMap = {Open_Hours_GYM}
        isLive = {true}/>
        <HoursCard
        title = "Rock Climbing Wall"
        hoursMap = {Open_Hours_Climbing}
        isLive = {true}/>
        <HoursCard
        title = "Shake Smart"
        hoursMap = {shakeSmartHours}
        isLive = {false}/>

        <View style = {{marginTop: 8, backgroundColor: "rgba(56, 189, 248, 0.05)", borderWidth: 1, borderColor: "rgba(56, 189, 248, 0.15)", borderRadius: 10, padding: 12}}>
            <Text style = {{fontSize: 11, color: "#475569", lineHeight: 16}}>
                Hours sourced from arc.sdsu.edu/hours. Rock Climbing Wall hours differ from the main ARC — check the site for holiday or special closures.
            </Text>
        </View>
        </ScrollView>
    )
}

export default function APP(){
const[history, setHistory] = useState([]);
const arcOpen = isArcOpen();
const[activeTab, setActiveTab] = useState("Status");
const[shakeSmartHours, setShakeSmartHours] = useState(Open_Hours_SS);
const[schedule, setSchedule] = useState(emptySchedule);
const[showSchedule, setShowSchedule] = useState(false);
const[data, setData] = useState([]);
const[lastUpdated, setLastUpdated] = useState(null);  // timestamp of last successful data fetch
const[cachedData, setCachedData] = useState(null);    // last known-good data for stale display
const[error, setError] = useState(null);
const[loading, setLoading] = useState(false);
// "healthy" | "unhealthy" | "unknown"
const[apiStatus, setApiStatus] = useState("unknown");

useEffect(() => {
  const now = new Date();
  const mockHistory = [];

  for (let i = 0; i < 20; i++) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);

    mockHistory.push({
      timestamp,
      data: [
        {
          LocationName: "ARC Floor 1",
          TotalCapacity: 200,
          LastCount: Math.floor(Math.random() * 200),
          IsClosed: false
        },
        {
          LocationName: "ARC Floor 2",
          TotalCapacity: 150,
          LastCount: Math.floor(Math.random() * 150),
          IsClosed: false
        }
      ]
    });
  }

  setHistory(mockHistory);
  setData(SAMPLE_DATA);
  setCachedData(SAMPLE_DATA);
  setLastUpdated(new Date());  // mark when data was last set
}, []);


// Set initial mock schedule (busy blocks for demo purposes)
// TODO: replace with persisted user schedule once storage is implemented
useEffect(() => {
  const mockSchedule = emptySchedule();
  mockSchedule[1] = [{ start: 10, end: 12 }, { start: 15, end: 17 }]; // Mon
  const today = new Date().getDay();
  mockSchedule[today] = [{ start: 13, end: 15 }];
  setSchedule(mockSchedule);
}, []);

// API health check on mount — runs once, sets apiStatus banner
// Also acts as early warning if the backend is not running locally
useEffect(() => {
  let cancelled = false;
  fetch(`${API_BASE_URL}/health`, { method: "GET" })
    .then(res => {
      if (!cancelled) setApiStatus(res.ok ? "healthy" : "unhealthy");
    })
    .catch(() => {
      if (!cancelled) setApiStatus("unhealthy");
    });
  return () => { cancelled = true; };
}, []);



return( //Main app component that manages state and renders the header, main content based on active tab, and bottom tab bar. It also includes modals for schedule and shake smart hours.
    <View style= {styles.container}>
         <StatusBar style ="light" />
          <View style={styles.header}>
            <View style = {{flexDirection: "row", alignItems: "center", gap: 10}}>
                <View style = {{width: 8, height: 8, borderRadius: 4, backgroundColor: arcOpen ? "#34d399" : "#f87171"}} />
                <Text style = {{fontWeight: "700", fontSize: 15, color: "#e2e8f0",}}> ARC Crowd Measure</Text>
                <View style = {{paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: arcOpen ? "rgba(52, 211, 153, 0.1)" : "rgba(248, 113, 113, 0.08)", borderWidth: 1, borderColor: arcOpen ? "rgba(52, 211, 153, 0.2)" : "rgba(248, 113, 113, 0.15)"}}>
                <Text style = {{fontSize: 10, fontWeight: "600", letterSpacing: 0.8, color: arcOpen ? "#34d399" : "#f87171"}}> {arcOpen ? "OPEN" : "CLOSED"}</Text>
                </View>
            </View>
          </View>
          {activeTab === "Status" && (
            <StatusScreen
              data={data}
              history={history}
              loading={loading}
              error={error}
              arcOpen={arcOpen}
              schedule={schedule}
              setShowSchedule={setShowSchedule}
              apiStatus={apiStatus}
              lastUpdated={lastUpdated}
            />
          )}
          {activeTab === "Count" && (
            <CountScreen data={data} loading={loading} error={error} arcOpen={arcOpen} />
          )}
          {activeTab === "Hours" && (
            <HoursScreen shakeSmartHours={shakeSmartHours} />
          )}
          <View style={styles.Barsize}>
            {["Status", "Count", "Hours"].map(tab => (
              <TouchableOpacity key={tab} style={styles.tabs} onPress={() => setActiveTab(tab)}>
                <Text style={{ fontSize: 12, color: activeTab === tab ? "#38bdf8" : "#475569" }}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScheduleModal
            visible={showSchedule}
            schedule={schedule}
            onSave={setSchedule}
            onClose={() => setShowSchedule(false)}
            history={history}
          />
                <ImageBackground
        source={require("../../assets/images/background.png")}
        style={styles.heroHeader}
        imageStyle={{ opacity: 0.55 }}
      >
      </ImageBackground>
    </View>
);

}