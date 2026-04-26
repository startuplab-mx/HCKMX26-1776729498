import { useState } from "react";
import Header from "./components/Header";
import MetricsCards from "./components/MetricsCards";
import DistributionChart from "./components/DistributionChart";
import ActivityChart from "./components/ActivityChart";
import EventsTable from "./components/EventsTable";
import EventDetailModal from "./components/EventDetailModal";
import DashboardStatus from "./components/DashboardStatus";
import HunterConsole from "./components/Hunter/HunterConsole";
import NetworkIntelligenceTab from "./components/Hunter/NetworkIntelligenceTab";
import { useEvents } from "./lib/useEvents";
import { Shield, Target, Network } from "lucide-react";

function App() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState("hunter");
  const { events, loading, error, lastRefresh, refresh } = useEvents(100);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:7071/api";
  const functionKey = import.meta.env.VITE_FUNCTION_KEY || "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />

      {/* Tab navigation */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("hunter")}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === "hunter"
                  ? "border-fuchsia-500 text-fuchsia-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Target size={16} />
              Intelligence
            </button>

            <button
              onClick={() => setActiveTab("network")}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === "network"
                  ? "border-red-500 text-red-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network size={16} />
              Network Intel
              <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-bold rounded">
                NEW
              </span>
            </button>

            <button
              onClick={() => setActiveTab("guardian")}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition ${
                activeTab === "guardian"
                  ? "border-cyan-500 text-cyan-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield size={16} />
              Guardian
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* HUNTER TAB */}
        {activeTab === "hunter" && <HunterConsole />}

        {/* NETWORK INTEL TAB */}
        {activeTab === "network" && (
          <NetworkIntelligenceTab
            apiBaseUrl={apiBaseUrl}
            functionKey={functionKey}
          />
        )}

        {/* GUARDIAN TAB */}
        {activeTab === "guardian" && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">
                Guardian · Panel de moderación
              </h2>
              <p className="text-slate-400">
                Monitoreo en tiempo real de chat en plataformas integradas
              </p>
            </div>

            <DashboardStatus
              loading={loading}
              error={error}
              lastRefresh={lastRefresh}
              onRefresh={refresh}
              eventCount={events.length}
            />

            {!loading && !error && events.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-400 text-lg mb-2">No hay eventos todavía</p>
                <p className="text-slate-600 text-sm">
                  Los eventos aparecerán aquí cuando los jugadores escriban en el chat
                </p>
              </div>
            ) : (
              <>
                <MetricsCards events={events} />
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DistributionChart events={events} />
                  <ActivityChart events={events} />
                </div>
                <div className="mt-6">
                  <EventsTable
                    events={events}
                    onEventClick={(event) => setSelectedEvent(event)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

export default App;
