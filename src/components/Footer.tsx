const Footer = () => {
  return (
    <footer className="border-t border-border/50 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap items-center justify-center gap-8 mb-8">
          {["Uniswap v4", "Chainlink", "Reactive Network"].map((partner) => (
            <div
              key={partner}
              className="px-6 py-3 rounded-lg glass text-sm font-semibold text-muted-foreground"
            >
              {partner}
            </div>
          ))}
        </div>
        <p className="text-center text-muted-foreground text-sm">
          Smarter fees. Safer liquidity. Fully automated.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
