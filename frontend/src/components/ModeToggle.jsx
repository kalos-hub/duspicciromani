export const ModeToggle = ({ mode, onChange }) => {
  return (
    <div
      data-testid="mode-toggle"
      className="relative bg-stone-100 border-[2.5px] border-stone-900 rounded-full p-1 flex w-full max-w-md mx-auto pop-shadow-ink"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#d97706] transition-transform duration-300 ease-out"
        style={{ transform: mode === "offro" ? "translateX(100%)" : "translateX(0)" }}
      />
      <button
        type="button"
        data-testid="toggle-cerco"
        onClick={() => onChange("cerco")}
        className={`relative z-10 flex-1 py-3 rounded-full font-display text-base sm:text-lg transition-colors ${
          mode === "cerco" ? "text-white" : "text-stone-700"
        }`}
      >
        Cerco Spicci
      </button>
      <button
        type="button"
        data-testid="toggle-offro"
        onClick={() => onChange("offro")}
        className={`relative z-10 flex-1 py-3 rounded-full font-display text-base sm:text-lg transition-colors ${
          mode === "offro" ? "text-white" : "text-stone-700"
        }`}
      >
        Offro Spicci
      </button>
    </div>
  );
};
