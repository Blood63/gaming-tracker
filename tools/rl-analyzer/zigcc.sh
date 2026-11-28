#!/bin/bash
args=()
for a in "$@"; do
  case "$a" in
    -l:libpthread.a|-lmsvcrt|-lgcc_eh|-lgcc|-lmingw32|-lmingwex|-Wl,--disable-auto-image-base|-Wl,--dynamicbase|-Wl,-O1|-fno-use-linker-plugin|-Wl,--high-entropy-va|-nodefaultlibs) ;;
    # Rust ≥ 1.8x lie « synchronization » (WaitOnAddress) : zig ne fournit que le jeu d'API équivalent (Windows 8+)
    -lsynchronization) args+=("-lapi-ms-win-core-synch-l1-2-0");;
    *) args+=("$a");;
  esac
done
exec python3 -m ziglang cc -target x86_64-windows-gnu "${args[@]}" -lunwind
