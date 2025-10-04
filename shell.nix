{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell rec {
	buildInputs = with pkgs; [
		nodejs
		typescript-language-server
	];
}
