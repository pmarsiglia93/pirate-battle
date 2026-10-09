# Architecture

## Decisions

Use npm with a committed lockfile, Vite, React Strict Mode and PixiJS v8. The simulation is pure TypeScript. All balance numbers live in one configuration; each match copies its options. The logical arena is 1600 × 900, with 64 px solid tiles and circle hulls. Axis-separated movement slides along solid cells.

Assets were inspected before implementation. Ship families have intact, lightly damaged, heavily damaged and sunk variants: pirate 2/8/14/20, red 3/9/15/21, blue 5/11/17/23. Sprites point upward; render rotation adds π/2 to mathematical headings. UI atlas border and layout metadata remain in 1× logical units, including the retina atlas. Individual PNGs avoid atlas cropping ambiguity. Water is tile 73; shore tiles 1/2/3/17/18/19/33/34/35 surround grass and palms.

Spawn limits are 1.5–15 seconds, retaining the requested 4 second default. No balance changes yet. Seeded randomness is independent from the frame rate.

See docs/PLAN.md for delivery status. Detailed lifecycle, network and validation notes will be completed alongside their implementations.
