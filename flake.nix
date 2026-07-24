{
  description = "Fractals — an interactive Reveal.js presentation (static bundle)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22 # runs the Playwright end-to-end tests
            pkgs.chromium # browser Playwright drives (matches project setup)
            pkgs.python3 # `python3 -m http.server` for serving the bundle
          ];

          # The bundle has no build step; these vars let the Playwright suite
          # use the nix-provided Chromium instead of downloading its own
          # (which lacks the right system libraries on NixOS).
          CHROME_BIN = "${pkgs.chromium}/bin/chromium";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

          shellHook = ''
            # Let the existing test harness find the browser without edits.
            mkdir -p scratchpad
            echo "${pkgs.chromium}/bin/chromium" > scratchpad/chrome-path.txt

            echo "fractal-talk dev shell"
            echo "  node      $(node --version)"
            echo "  chromium  $(chromium --version 2>/dev/null | head -1)"
            echo ""
            echo "  serve : python3 -m http.server 8099"
            echo "  test  : npm install && node scratchpad/test.mjs"
          '';
        };
      });
    };
}
