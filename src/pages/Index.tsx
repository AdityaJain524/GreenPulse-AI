import { Leaf, Radio, Server } from "lucide-react";
import { isBackendConnected } from "@/lib/backend-api";
import { useRealtimeData } from "@/hooks/use-realtime-data";
import { MetricsGrid } from "@/components/MetricsGrid";
import { EmissionChart } from "@/components/EmissionChart";
import { AlertsPanel } from "@/components/AlertsPanel";
import { VehicleRanking } from "@/components/VehicleRanking";
import { ChatInterface } from "@/components/ChatInterface";
import { WeatherWidget, ShipmentFeed } from "@/components/LiveWidgets";
import { VehicleMap } from "@/components/VehicleMap";
import { SustainabilityLeaderboard } from "@/components/SustainabilityLeaderboard";
import { RiskScoringPanel } from "@/components/RiskScoringPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VehicleStateMachine } from "@/components/VehicleStateMachine";
import { PredictionEngine } from "@/components/PredictionEngine";
import { FleetIntelligenceReport } from "@/components/FleetIntelligenceReport";
import { PipelineMetricsPanel } from "@/components/PipelineMetricsPanel";
import { CrisisSimulationPanel } from "@/components/CrisisSimulationPanel";

const Index = () => {
  const {
    gpsStream,
    shipments,
    weather,
    alerts,
    vehicleMetrics,
    emissionTimeline,
    totalEmissions,
    dataPoints,
  } = useRealtimeData();

  const activeVehicles = vehicleMetrics.filter((v) => v.status === "active").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary glow-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">GreenPulse AI</h1>
              <p className="text-[10px] text-muted-foreground">Carbon & Sustainable Logistics Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isBackendConnected() && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1">
                <Server className="h-3 w-3 text-accent" />
                <span className="text-[10px] font-medium text-accent">PATHWAY</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
              <Radio className="h-3 w-3 text-primary animate-pulse" />
              <span className="font-mono text-xs font-medium text-primary">
                {dataPoints} events streamed
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 lg:px-6">

        <PipelineMetricsPanel />

        {/* ── Metrics Row ── */}
        <MetricsGrid
          totalEmissions={totalEmissions}
          activeVehicles={activeVehicles}
          alertCount={alerts.length}
          dataPoints={dataPoints}
          weather={weather}
        />

        {/* ── Charts + Alerts ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmissionChart data={emissionTimeline} />
          </div>
          <div>
            <AlertsPanel alerts={alerts} />
          </div>
        </div>

        {/* ── Live Vehicle Map ── */}
        <VehicleMap gpsStream={gpsStream} />

        {/* ── Sustainability + Risk ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <SustainabilityLeaderboard vehicles={vehicleMetrics} totalEmissions={totalEmissions} />
          <RiskScoringPanel vehicles={vehicleMetrics} alerts={alerts} />
        </div>

        {/* ── NEW: State Machine + Prediction Engine ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <VehicleStateMachine vehicles={vehicleMetrics} alerts={alerts} />
          <PredictionEngine vehicles={vehicleMetrics} alerts={alerts} />
        </div>

        <CrisisSimulationPanel vehicles={vehicleMetrics} />

        {/* ── NEW: Fleet Intelligence Report (full width) ── */}
        <FleetIntelligenceReport
          vehicles={vehicleMetrics}
          alerts={alerts}
          totalEmissions={totalEmissions}
        />

        {/* ── Vehicle Ranking + Live Widgets + AI Chat ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <VehicleRanking vehicles={vehicleMetrics} />
            <div className="grid gap-5 sm:grid-cols-2">
              <WeatherWidget weather={weather} />
              <ShipmentFeed shipments={shipments} />
            </div>
          </div>
          <div className="h-[500px]">
            <ChatInterface
              vehicles={vehicleMetrics}
              alerts={alerts}
              totalEmissions={totalEmissions}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
