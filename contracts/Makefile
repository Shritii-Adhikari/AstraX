# AstroFlo Soroban contracts — build / test / deploy
#
# Usage:
#   make build           # compile all contracts to wasm (release)
#   make test            # run the full Rust test suite
#   make fmt             # format all crates
#   make lint            # clippy with warnings denied
#   make optimize        # build + stellar-optimize each wasm
#   make deploy CONTRACT=pool STELLAR_SECRET_KEY=S...   # deploy one contract
#
# Required env for deploy: STELLAR_SECRET_KEY (funded testnet secret).

CONTRACTS := factory pool position_manager router user_profile
WASM_DIR  := target/wasm32-unknown-unknown/release
NETWORK   ?= testnet

build:
	cargo build --target wasm32-unknown-unknown --release

test:
	cargo test

fmt:
	cargo fmt --all

lint:
	cargo clippy --all-targets -- -D warnings

# Optimize every contract wasm (smaller, deterministic) using the Stellar CLI.
optimize: build
	@for c in $(CONTRACTS); do \
		echo "Optimizing $$c ..."; \
		stellar contract optimize --wasm $(WASM_DIR)/$$c.wasm; \
	done

# Deploy a single contract: make deploy CONTRACT=pool STELLAR_SECRET_KEY=S...
deploy: build
	stellar contract deploy \
		--wasm $(WASM_DIR)/$(CONTRACT).wasm \
		--source $(STELLAR_SECRET_KEY) \
		--network $(NETWORK)

clean:
	cargo clean

.PHONY: build test fmt lint optimize deploy clean
