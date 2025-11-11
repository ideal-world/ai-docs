#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${MARKITDOWN_VENV_DIR:-$ROOT_DIR/.venv/markitdown}"
PYTHON_BIN="${PYTHON:-python3}"
MARKITDOWN_SPEC="${MARKITDOWN_SPEC:-markitdown[all]}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
	echo "Python interpreter not found: $PYTHON_BIN" >&2
	exit 1
fi

# Ensure python3-venv is available (required on Debian/Ubuntu)
if ! "$PYTHON_BIN" -m venv --help >/dev/null 2>&1; then
	echo "Error: python3-venv module not available." >&2
	
	# Attempt auto-installation on Debian/Ubuntu
	if command -v apt-get >/dev/null 2>&1; then
		PYTHON_VERSION=$("$PYTHON_BIN" --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
		VENV_PKG="python${PYTHON_VERSION}-venv"
		
		echo "Attempting to install $VENV_PKG..." >&2
		
		SUDO=""
		if [[ "$(id -u)" -ne 0 ]]; then
			if command -v sudo >/dev/null 2>&1; then
				SUDO="sudo"
			else
				echo "Root privileges required to install $VENV_PKG." >&2
				echo "Please run: apt install $VENV_PKG" >&2
				exit 1
			fi
		fi
		
		$SUDO apt-get update -qq || true
		if ! $SUDO apt-get install -y "$VENV_PKG"; then
			echo "Failed to install $VENV_PKG automatically." >&2
			echo "Please install manually: sudo apt install $VENV_PKG" >&2
			exit 1
		fi
		
		echo "$VENV_PKG installed successfully." >&2
	else
		echo "Please install python3-venv package for your distribution." >&2
		exit 1
	fi
fi

if [ ! -d "$VENV_DIR" ]; then
	echo "Creating virtual environment at $VENV_DIR"
	
	# Clear any partial venv first
	rm -rf "$VENV_DIR"
	
	if ! "$PYTHON_BIN" -m venv "$VENV_DIR" 2>&1; then
		rm -rf "$VENV_DIR"
		echo "Failed to create virtual environment." >&2
		echo "Ensure python3-venv is properly installed for your Python version." >&2
		exit 1
	fi
fi

# shellcheck disable=SC1090
if [[ "$OSTYPE" == msys* || "$OSTYPE" == cygwin* || "$OSTYPE" == win* ]]; then
	source "$VENV_DIR/Scripts/activate"
	BIN_PATH="$VENV_DIR/Scripts/markitdown.exe"
else
	source "$VENV_DIR/bin/activate"
	BIN_PATH="$VENV_DIR/bin/markitdown"
fi

echo "Installing $MARKITDOWN_SPEC into virtual environment"
pip install --upgrade pip
pip install "$MARKITDOWN_SPEC"

deactivate >/dev/null 2>&1 || true

if output="$("$BIN_PATH" --version 2>&1)"; then
	echo "MarkItDown CLI verified: $output"
else
	echo "MarkItDown verification failed" >&2
	echo "$output" >&2
	exit 1
fi

echo "MarkItDown CLI installed at: $BIN_PATH"
echo "To use this installation, add the following to config/system.yaml:"
echo ""
echo "markitdown:"
echo "  path: $BIN_PATH"
echo ""
