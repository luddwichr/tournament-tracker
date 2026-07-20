# Trivy ignore policy — package-scoped license exceptions.
#
# Passed to the "licenses" npm script via --ignore-policy. Unlike the
# license.ignored list in trivy.yaml (which would waive a license for EVERY
# package), each rule here waives a license only for specific packages. So a
# future MPL-2.0 dependency — or lightningcss switching to a different
# non-permissive license — still fails the gate.
#
# Finding fields: input.Name = SPDX license id, input.PkgName = package name.
package trivy

import rego.v1

default ignore := false

# The lightningcss family: the base package plus its per-platform prebuilt
# binaries (kept in sync with package-lock.json). Listed explicitly rather than
# matched with startswith(): a prefix match would also waive MPL-2.0 for any
# package merely *named* like one of these — a typosquatted "lightningcss-evil"
# would silently pass the gate.
lightningcss_packages := {
	"lightningcss",
	"lightningcss-android-arm64",
	"lightningcss-darwin-arm64",
	"lightningcss-darwin-x64",
	"lightningcss-freebsd-x64",
	"lightningcss-linux-arm-gnueabihf",
	"lightningcss-linux-arm64-gnu",
	"lightningcss-linux-arm64-musl",
	"lightningcss-linux-x64-gnu",
	"lightningcss-linux-x64-musl",
	"lightningcss-win32-arm64-msvc",
	"lightningcss-win32-x64-msvc",
}

# MPL-2.0 (weak, file-level copyleft) for the lightningcss family only:
# a non-optional, build-time-only dependency of Vite (its CSS transformer). Its
# code never ships in dist/, and we neither modify nor redistribute its source,
# so MPL-2.0's file-level obligations are not implicated. It cannot be removed
# without dropping Vite.
ignore if {
	input.Name == "MPL-2.0"
	input.PkgName in lightningcss_packages
}
