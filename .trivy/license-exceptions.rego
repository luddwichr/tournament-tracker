# Trivy ignore policy — package-scoped license exceptions.
#
# Passed to the "licenses" npm script via --ignore-policy. Unlike the
# license.ignored list in trivy.yaml (which would waive a license for EVERY
# package), each rule here waives a license only for a specific package. So a
# future MPL-2.0 dependency — or lightningcss switching to a different
# non-permissive license — still fails the gate.
#
# Finding fields: input.Name = SPDX license id, input.PkgName = package name.
package trivy

import rego.v1

default ignore := false

# MPL-2.0 (weak, file-level copyleft) for the lightningcss family only:
# a non-optional, build-time-only dependency of Vite (its CSS transformer). Its
# code never ships in dist/, and we neither modify nor redistribute its source,
# so MPL-2.0's file-level obligations are not implicated. It cannot be removed
# without dropping Vite.
ignore if {
	input.Name == "MPL-2.0"
	startswith(input.PkgName, "lightningcss")
}
