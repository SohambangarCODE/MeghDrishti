# Quantified installed-data audit

| Metric | Numerator / denominator | Coverage | Meaning |
| --- | ---: | ---: | --- |
| Companies with identifier/name/sector | 215 / 215 | 100.0% | Dataset-reported identity/taxonomy; not independent verification |
| Companies with recorded commercial relationships | 192 / 215 | 89.3% | Dataset-reported graph only |
| Companies with verified operating coordinates | 0 / 215 | 0.0% | Requires non-synthetic record plus identifiable operating-location evidence |
| Companies with synthetic-only facilities | 215 / 215 | 100.0% | Supplied enrichment explicitly synthetic |
| Companies lacking operating-location evidence | 215 / 215 | 100.0% | Unknown actual footprint, not zero risk |
| Facilities with illustrative coordinate pairs | 327 / 327 | 100.0% | Synthetic latitude/longitude |
| Facilities with measured operational shares | 0 / 327 | 0.0% | Measured field, never assumed overlay |
| Facilities with assumed operational shares | 327 / 327 | 100.0% | Demo parameter |
| Relationships with measured dependency weights | 0 / 350 | 0.0% | No measured values or evidence supplied |
| Relationships using assumed effective weights | 350 / 350 | 100.0% | Replacement already included |
| Relationships with unknown effective demo weights | 0 / 350 | 0.0% | Computational availability only |
| Relationships whose real measured dependence is unknown | 350 / 350 | 100.0% | Schema lacks measured dependence/evidence; separate from demo-weight availability |
| Companies with usable synthetic route geometry | 215 / 215 | 100.0% | Geometry supports demo rendering, not observed shipments |
| Companies with evidence-supported observed routes | 0 / 215 | 0.0% | No supplied operational route evidence |
| Route usages with measured dependence shares | 0 / 215 | 0.0% | Measured field null |
| Relationships with independently identifiable source URL | 0 / 350 | 0.0% | Generic dataset attribution does not prove an edge |
| Companies with verified projection geography mappings | 0 / 215 | 0.0% | All linked regions synthetic with providerGeographyId null |
| Regions with sourced provider geography mapping | 0 / 4 | 0.0% | Country of registration is not operating geography |

## Missing evidence by record category

### company

| Missing field or evidence | Record count |
| --- | ---: |
| identityId | 0 |
| name | 0 |
| sector | 0 |
| ticker | 1 |
| exchange | 1 |
| operatingLocationEvidence | 215 |
| projectionMapping | 215 |
| researchCheckedAt | 215 |

### facility

| Missing field or evidence | Record count |
| --- | ---: |
| observedCoordinatesEvidence | 327 |
| ownershipEvidence | 327 |
| measuredOperationalShare | 327 |
| sourceURLs | 327 |
| sourcePublicationDate | 327 |
| checkedAt | 327 |
| measuredVulnerability | 327 |

### commercialRelationship

| Missing field or evidence | Record count |
| --- | ---: |
| measuredDependencyWeightEvidence | 350 |
| verifiedProductOrService | 350 |
| source | 350 |
| URL | 350 |
| observedReplacementCapacity | 350 |
| currentAsOf | 350 |

### route

| Missing field or evidence | Record count |
| --- | ---: |
| observedGeometryEvidence | 4 |
| verifiedTransportMode | 4 |
| sourceURLs | 4 |

### routeUsage

| Missing field or evidence | Record count |
| --- | ---: |
| measuredDependenceShare | 215 |
| observedReplacementCapacity | 215 |
| measuredVulnerability | 215 |

### region

| Missing field or evidence | Record count |
| --- | ---: |
| verifiedProviderMapping | 4 |

