#!/usr/bin/env bash
set -euo pipefail

# Install LibreOffice using the available package manager.
# Supports apt, dnf, yum, pacman, zypper, and Homebrew.

if command -v libreoffice >/dev/null 2>&1; then
	echo "LibreOffice is already installed: $(libreoffice --version 2>/dev/null)"
	exit 0
fi

PKG_MANAGER=""
if command -v apt-get >/dev/null 2>&1; then
	PKG_MANAGER="apt"
elif command -v dnf >/dev/null 2>&1; then
	PKG_MANAGER="dnf"
elif command -v yum >/dev/null 2>&1; then
	PKG_MANAGER="yum"
elif command -v pacman >/dev/null 2>&1; then
	PKG_MANAGER="pacman"
elif command -v zypper >/dev/null 2>&1; then
	PKG_MANAGER="zypper"
elif command -v brew >/dev/null 2>&1; then
	PKG_MANAGER="brew"
else
	echo "Unsupported environment: no known package manager found." >&2
	echo "Please install LibreOffice manually and set LIBREOFFICE_PATH." >&2
	exit 1
fi

SUDO=""
if [[ "$PKG_MANAGER" != "brew" ]]; then
	if [[ "$(id -u)" -ne 0 ]]; then
		if command -v sudo >/dev/null 2>&1; then
			SUDO="sudo"
		else
			echo "Root privileges are required to install LibreOffice using $PKG_MANAGER." >&2
			exit 1
		fi
	fi
fi

case "$PKG_MANAGER" in
	apt)
		$SUDO apt-get update
		$SUDO apt-get install -y libreoffice
		;;
	dnf)
		$SUDO dnf install -y libreoffice
		;;
	yum)
		$SUDO yum install -y libreoffice
		;;
	pacman)
		$SUDO pacman -Sy --noconfirm libreoffice-fresh || $SUDO pacman -Sy --noconfirm libreoffice-still
		;;
	zypper)
		$SUDO zypper refresh
		$SUDO zypper install -y libreoffice
		;;
	brew)
		brew update
		brew install --cask libreoffice || brew install libreoffice
		;;
	*)
		echo "Installation for package manager $PKG_MANAGER is not implemented." >&2
		exit 1
		;;
esac

if ! command -v libreoffice >/dev/null 2>&1; then
	echo "LibreOffice installation finished, but the binary was not found in PATH." >&2
	echo "Please ensure LibreOffice is installed and available as 'libreoffice'." >&2
	exit 1
fi

if output="$(libreoffice --version 2>&1)"; then
	echo "LibreOffice installed and verified: $output"
else
	echo "LibreOffice verification failed" >&2
	echo "$output" >&2
	exit 1
fi
