#!/bin/bash
# Compile rl-analyzer.exe (Windows 64 bits) depuis Linux/macOS, sans Windows ni Visual Studio.
# Prerequis : rust (rustup), `rustup target add x86_64-pc-windows-gnu`, `pip install ziglang`.
set -e
cd "$(dirname "$0")"
export CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER="$PWD/zigcc.sh"
cargo test --release
cargo build --release --target x86_64-pc-windows-gnu
cp target/x86_64-pc-windows-gnu/release/rl-analyzer.exe ../rl-uploader/rl-analyzer.exe
sha256sum ../rl-uploader/rl-analyzer.exe
