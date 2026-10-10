# Asset provenance and licenses

The challenge assets were already present at initial commit `3158914` and were preserved. Source: [Jungle Gaming game developer challenge](https://github.com/junglegaming/game-developer-challenge/tree/main/assets).

The original ship, ship-part, effect and terrain artwork matches the **Pirate Pack by Kenney**. Kenney's [original publication](https://opengameart.org/content/pirate-pack-190) explicitly lists **CC0 1.0** and includes default/retina PNGs, spritesheets and vectors. [CC0 terms](https://creativecommons.org/publicdomain/zero/1.0/). Credit: Kenney / Kenney.nl. Attribution is appreciated even where not required.

The challenge also supplies menu/HUD/control artwork, UI atlas metadata, scene/reference images, its Jungle Gaming logo and WAV sounds. No separate license declaration for those additions was included in the repository. They are used here as the supplied basis of the requested challenge; this document does not claim they are covered by Kenney's CC0 grant or relicense them. Jungle Gaming branding remains its owner's property.

No externally generated art, web fonts or third-party music were added. UI text uses system fonts. The application code uses dependencies under their respective licenses in installed package metadata (React, PixiJS, TanStack Query, Axios, Vite, MSW, Playwright and tooling); asset terms remain separate from library licenses.

The original pack's license text is preserved in [`docs/KENNEY_LICENSE.txt`](docs/KENNEY_LICENSE.txt). Provenance was checked against Kenney's published archive: tile 73 has identical decoded pixels; the ship/effect files retain the original dimensions and artwork with renamed/reprocessed PNGs. No broader license is inferred for the challenge's added UI or audio.
