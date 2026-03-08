import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import Pool from "./pages/Pool";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import { useWallet } from "./hooks/useWallet";
import "@/lib/web3modal";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isConnected, shortenedAddress, connect, disconnect } = useWallet();

  return (
    <>
      <Navbar
        isConnected={isConnected}
        shortenedAddress={shortenedAddress}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/pool" element={<Pool />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
