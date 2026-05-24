{
  description = "My Awesome Desktop Shell";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    ags,
  }: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
    pname = "ags";
    entry = "app.ts";

    astalPackages = with ags.packages.${system}; [
      io
      astal4 # or astal3 for gtk3
      apps
      tray
      notifd
      # notifd tray wireplumber
    ];

    extraPackages =
      astalPackages
      ++ [
        pkgs.libadwaita
        pkgs.libsoup_3
      ];
  in {
    packages.${system} = {
      default = pkgs.stdenv.mkDerivation {
        name = pname;
        src = ./.;
        fetcherVersion = 2;
        npmFlags = [ "--legacy-peer-deps" ];
        makeCacheWritable = true;

        nativeBuildInputs = with pkgs; [
          wrapGAppsHook4
          gobject-introspection
          nodejs
          npmHooks.npmConfigHook
          ags.packages.${system}.default
        ];

        buildInputs = extraPackages ++ [pkgs.gjs];

        npmDeps = pkgs.fetchNpmDeps {
          src = ./.;
          hash = "sha256-X5UHh2Dha4YkyRQf/D4fsSgIKSa2snVPTpdoHvFxYeE=";
        };

        installPhase = ''
          runHook preInstall

          mkdir -p $out/bin
          mkdir -p $out/share
          cp -r * $out/share
          ags bundle ${entry} $out/bin/${pname} -d "SRC='$out/share'"

          rm -rf $out/share
          runHook postInstall
        '';

        preFixup = ''
          gappsWrapperArgs+=(--set GSK_RENDERER cairo)
        '';
      };
    };

    devShells.${system} = {
      default = pkgs.mkShell {
        buildInputs = [
          (ags.packages.${system}.default.override {
            inherit extraPackages;
          })
        ];

        shellHook = ''
          export GSK_RENDERER=cairo
        '';
      };
    };
  };
}
