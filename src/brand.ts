// Personal monogram: two interlocking rings (D & J), original design.
// Geometry keeps the original viewBox so the boot sequence's hardcoded
// symbol coordinates (plus at x≈69, minus at x≈241) stay centered in the rings.
const ringPaths = `<path d="M15 72A55 55 0 1 1 125 72A55 55 0 1 1 15 72ZM185 72A55 55 0 1 1 295 72A55 55 0 1 1 185 72Z" fill="none" stroke="currentColor" stroke-width="22"/>`;
const barPath = `<path d="M155 20v104" fill="none" stroke="currentColor" stroke-width="14"/>`;
export const labelMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 145" color="#171713"><circle cx="70" cy="72" r="55" fill="none" stroke="currentColor" stroke-width="22"/><circle cx="240" cy="72" r="55" fill="none" stroke="currentColor" stroke-width="22"/><path d="M155 20v104" fill="none" stroke="currentColor" stroke-width="14"/></svg>`;
// NOTE: the boot sequence expects the first <path> to be the main contour and a
// second path it can remove during construction. Keep this two-path structure.
export const logo = `<svg viewBox="0 0 310 185" aria-label="Dong Dejia" role="img">${ringPaths}${barPath}<text x="155" y="176" text-anchor="middle" font-family="MiSans,sans-serif" font-size="17" font-weight="700" letter-spacing="14">DEJIA·DONG</text></svg>`;
// Single continuous contour of the monogram for the (disabled) opening draw animation.
export const bootMarkContour =
  "M15 72A55 55 0 1 1 125 72A55 55 0 1 1 15 72ZM185 72A55 55 0 1 1 295 72A55 55 0 1 1 185 72Z";

// Optical spacing for this fixed wordmark (TERMINAL), measured via canvas
// measureText at 750 35px MiSans against the 189px container.
const terminalPositions = [2, 25, 47, 72, 105, 116, 143, 169];
export const brandHeading = `<h1>DONG DEJIA</h1><div>PERSONAL ARCHIVE</div><p><span class="brand-analysis" role="img" aria-label="TERMINAL">${[..."TERMINAL"].map((letter, i) => `<span aria-hidden="true" style="left:${terminalPositions[i]}px">${letter}</span>`).join("")}</span> <b>OS</b></p>`;
