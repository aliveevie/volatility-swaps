import { Link, useLocation } from "react-router-dom";
import { Wallet, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/volswap-logo.png";

const navLinks = [
  { to: "/", label: "Swap" },
  { to: "/pool", label: "Pool" },
  { to: "/analytics", label: "Analytics" },
];

interface NavbarProps {
  isConnected: boolean;
  shortenedAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Navbar = ({ isConnected, shortenedAddress, onConnect, onDisconnect }: NavbarProps) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="VolSwap" className="h-8 w-8" />
          <span className="text-xl font-bold gradient-text">VolSwap</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.to
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="hidden md:flex items-center gap-2">
              <span className="px-3 py-2 rounded-lg glass text-sm font-semibold text-foreground">
                {shortenedAddress}
              </span>
              <button
                onClick={onDisconnect}
                className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold transition-all hover:opacity-90 glow-blue"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong border-t border-border/50"
          >
            <div className="flex flex-col p-4 gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === link.to
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isConnected ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg glass mt-2">
                  <span className="text-sm font-semibold text-foreground">{shortenedAddress}</span>
                  <button onClick={onDisconnect} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onConnect(); setMobileOpen(false); }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold mt-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
