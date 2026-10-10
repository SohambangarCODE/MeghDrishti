# Modeling assumptions

Configuration lives in `backend/config/model-defaults.json`. Stress is a dimensionless assumed operational disruption in [0,1], never a probability of default, stock return or predicted loss.

- Facility seed = event intensity × hazard vulnerability × operational share. Incomplete company facility-share coverage remains unknown; totals above one are rejected, never silently normalized.
- Route seed = intensity × route vulnerability × shipment share × (1 − assumed replacement fraction). A route/waypoint/region target maps only documented usage. A known 0.4 route share need not sum to one because it is a particular shipment dependency.
- Source seeds combine by maximum. Retain each source/path candidate. Commercial transmission multiplies stress by dependency weight and the configured transmission multiplier.
- Enumerate simple company paths, never revisiting a company. Facility, ownership, region, commodity and portfolio links do not count as commercial hops.
- Select highest stress, then shortest depth, then stable path ID. Alternative paths are not additive financial losses. Commodity links only explain supplied items.
- A missing factor remains null, even if another factor equals zero. A supported zero-severity path remains structurally connected. Unknown direct coverage remains null despite a calculable indirect finding.
- Capital is INR only. Duplicate company rows merge their actual invested amounts; duplicate holding record IDs are rejected as replay. Excluded/unmatched amounts remain in total capital and the unmodeled/unmapped totals.
- Evergreen's lack of a recorded affected path is not evidence of safety. Allocation comparison is sensitivity analysis, not a trade recommendation.

Reference: facility stress 0.6; Aster 0.252; Beacon 0.0882; Cedar 0.03087. Capital: INR 100 lakh, connected INR 90 lakh, assumed weighted INR 13.3434 lakh. Transfer INR 10 lakh Aster → Evergreen: capital stays 100 lakh, connected becomes 80 lakh, assumed weighted becomes 10.8234 lakh. Route-only seed is 0.192. No empirical calibration is claimed.

Weather adapter: intensity clips (maximum of seven daily maximum temperatures − 35°C) / 10°C to [0,1]. Threshold/span are disclosed configurable prototype assumptions. Missing daily coverage is unavailable. Rain and wind are context only. Annual future climatology is separate and cannot provide exact-date disaster forecasts.
