"""Validated wire contracts. Money is INR; fractions represent assumed stress."""
from typing import Literal, Annotated
from pydantic import BaseModel, Field, ConfigDict, model_validator

Fraction = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
Identifier = Annotated[str, Field(min_length=1)]

class Contract(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Metadata(Contract):
    provenance: Literal['synthetic', 'dataset_reported', 'sourced', 'assumed', 'unknown']
    evidenceIds: list[str]
    missingFields: list[str]
    datasetVersion: Identifier
    sourceFields: dict | None = None

class Company(Metadata):
    id: Identifier
    externalId: str | None
    name: Identifier
    ticker: str | None
    exchange: str | None
    sectorId: str
    countryOfRegistration: str | None
    roles: list[str]

class Region(Metadata):
    id: Identifier
    name: str
    countryISO3: str | None
    geographyLevel: str
    providerGeographyId: str | None
    boundary: dict | None
    centroid: tuple[float, float] | None

class Facility(Metadata):
    id: Identifier
    companyId: Identifier
    name: str
    facilityType: str
    regionId: str | None
    latitude: Annotated[float, Field(ge=-90, le=90)] | None
    longitude: Annotated[float, Field(ge=-180, le=180)] | None
    locationPrecision: str
    operatingRelationship: str
    operationalShare: Fraction | None
    vulnerabilityByHazard: dict[str, Fraction | None] | None

    @model_validator(mode='after')
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError('Coordinates need both latitude and longitude')
        return self

class Route(Metadata):
    id: Identifier
    name: str
    mode: str
    waypointIds: list[str]
    geometry: dict | None
    regionIds: list[str]
    operatingStatus: str | None
    vulnerabilityByHazard: dict[str, Fraction | None] | None

class Waypoint(Metadata):
    id: Identifier
    regionId: str | None
    coordinates: tuple[float, float] | None
    role: str

class RouteUsage(Metadata):
    id: Identifier
    companyId: Identifier
    routeId: Identifier
    shipmentShare: Fraction | None
    substitutability: Fraction | None
    vulnerabilityByHazard: dict[str, Fraction | None] | None = None

class Commodity(Metadata):
    id: Identifier
    name: str
    category: str | None

class SupplyItem(Metadata):
    id: Identifier
    supplierId: Identifier
    customerId: Identifier
    commodityId: str | None
    facilityIds: list[str]
    routeIds: list[str]

class CommercialEdge(Metadata):
    id: Identifier
    supplierCompanyId: Identifier
    customerCompanyId: Identifier
    dependencyWeight: Fraction | None
    weightBasis: Literal['measured', 'assumed']
    substitutability: Fraction | None
    supplyItemIds: list[str]
    status: str | None
    currentAsOf: str | None

class Evidence(Contract):
    id: Identifier
    sourceName: str
    url: str | None
    retrievedAt: str | None
    documentDate: str | None
    claim: str
    entityIds: list[str]
    reportedOrVerifiedStatus: str

    @model_validator(mode='after')
    def safe_url(self):
        if self.url and not self.url.startswith(('https://', 'http://')):
            raise ValueError('Only HTTP(S) evidence links')
        return self

class Event(Metadata):
    id: Identifier
    hazardType: str
    geographicTargets: list[str]
    affectedEntityIds: list[str]
    intensity: Fraction | None
    intensityBasis: str
    validStart: str
    validEnd: str
    fetchedAt: str | None
    mode: Literal['demo']
    source: str
    model: str | None

class Holding(Contract):
    id: Identifier
    portfolioId: Identifier
    companyId: str | None
    originalInputName: Identifier
    amount: Annotated[float, Field(ge=0, le=9007199254740991, allow_inf_nan=False)]
    currency: Literal['INR']
    matchingStatus: Literal['matched', 'unmatched', 'ambiguous', 'excluded']
    exclusionReason: str | None

    @model_validator(mode='after')
    def check_match(self):
        if self.matchingStatus == 'matched' and not self.companyId:
            raise ValueError('Matched holding needs a company ID')
        if self.matchingStatus == 'excluded' and not self.exclusionReason:
            raise ValueError('Exclusion requires a reason')
        return self

class Overlay(Contract):
    targetId: Identifier
    field: Literal['operationalShare','shipmentShare','substitutability','dependencyWeight','vulnerability']
    hazardType: str | None = None
    value: Fraction
    rationale: Identifier
    provenance: Literal['assumed']

class Scenario(Contract):
    id: Identifier
    mode: Literal['demo']
    eventIds: Annotated[list[str], Field(min_length=1)]
    maxCommercialHops: Annotated[int, Field(ge=1, le=3)]
    transmissionMultiplier: Fraction
    assumptionOverrides: list[Overlay]
    futureProjectionQuery: None
    modelVersion: Identifier
    datasetVersion: Identifier
    # A what-if edits a copied event snapshot, never repository evidence.
    eventOverrides: dict[str, Fraction] = {}

class Dataset(Contract):
    schemaVersion: Literal['1.0.0']
    datasetVersion: Identifier
    dataState: Literal['fictional_reference', 'synthetic_operational_demo', 'sourced_operational'] = 'fictional_reference'
    sourceMetadata: dict | None = None
    companies: list[Company]
    regions: list[Region]
    facilities: list[Facility]
    routes: list[Route]
    waypoints: list[Waypoint]
    routeUsage: list[RouteUsage]
    commodities: list[Commodity]
    supplyItems: list[SupplyItem]
    commercialEdges: list[CommercialEdge]
    evidence: list[Evidence]
    events: list[Event]

    @model_validator(mode='after')
    def references_and_shares(self):
        records = [r for k in type(self).model_fields if isinstance(getattr(self, k), list) for r in getattr(self, k)]
        ids = [r.id for r in records]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate record ID')
        def ref(rows, key):
            if key is not None and key not in {r.id for r in rows}:
                raise ValueError(f'Broken reference: {key}')
        for r in records:
            if hasattr(r, 'datasetVersion') and r.datasetVersion != self.datasetVersion:
                raise ValueError(f'Record version mismatch: {r.id}')
            for e in getattr(r, 'evidenceIds', []): ref(self.evidence, e)
        for f in self.facilities:
            ref(self.companies, f.companyId); ref(self.regions, f.regionId)
        for r in self.routes:
            for k in r.regionIds: ref(self.regions, k)
            for k in r.waypointIds: ref(self.waypoints, k)
        for w in self.waypoints: ref(self.regions, w.regionId)
        for u in self.routeUsage:
            ref(self.companies, u.companyId); ref(self.routes, u.routeId)
        for e in self.commercialEdges:
            ref(self.companies, e.supplierCompanyId); ref(self.companies, e.customerCompanyId)
            for k in e.supplyItemIds:
                ref(self.supplyItems, k)
                item = next(s for s in self.supplyItems if s.id == k)
                if (item.supplierId, item.customerId) != (e.supplierCompanyId, e.customerCompanyId):
                    raise ValueError('Supply-item direction mismatch')
        for s in self.supplyItems:
            ref(self.companies, s.supplierId); ref(self.companies, s.customerId); ref(self.commodities, s.commodityId)
            for k in s.facilityIds: ref(self.facilities, k)
            for k in s.routeIds: ref(self.routes, k)
        for e in self.events:
            for k in e.geographicTargets: ref(self.regions, k)
            for k in e.affectedEntityIds: ref(self.facilities + self.routes + self.waypoints, k)
        for c in self.companies:
            if sum(f.operationalShare or 0 for f in self.facilities if f.companyId == c.id) > 1 + 1e-12:
                raise ValueError(f'Operational shares exceed one: {c.id}')
            usages = [u for u in self.routeUsage if u.companyId == c.id]
            if len({u.routeId for u in usages}) != len(usages):
                raise ValueError(f'Duplicate route mapping: {c.id}')
            if sum(u.shipmentShare or 0 for u in usages) > 1 + 1e-12:
                raise ValueError(f'Shipment shares exceed one: {c.id}')
        return self

class AnalysisRequest(Contract):
    schemaVersion: Literal['1.0.0'] = '1.0.0'
    holdings: Annotated[list[Holding], Field(min_length=1, max_length=1000)]
    scenario: Scenario
    requestId: Identifier
    draftRevision: Annotated[int, Field(ge=0)] = 0

class CompareRequest(Contract):
    runId: Identifier
    fromCompanyId: Identifier
    toCompanyId: Identifier
    amount: Annotated[float, Field(gt=0, allow_inf_nan=False)]
    requestId: Identifier

class HoldingResult(Holding):
    directStress: Fraction | None
    indirectStress: Fraction | None
    totalStress: Fraction | None
    selectedPathIds: list[str]
    selectedCommercialDepth: Annotated[int, Field(ge=0,le=3)] | None
    connected: bool
    recordedPath: bool
    connectedAmount: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    assumedWeightedExposure: Annotated[float, Field(ge=0,allow_inf_nan=False)] | None
    evidenceStatus: str
    missingFields: list[str]

class PathResult(Contract):
    id: str
    seedId: str
    companyIds: list[str]
    edgeIds: list[str]
    commercialDepth: Annotated[int, Field(ge=0,le=3)]
    stress: Fraction | None
    missingFields: list[str]
    evidenceIds: list[str]

class Totals(Contract):
    currency: Literal['INR']
    totalCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    mappedCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    unmappedCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    modeledCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    unmodeledCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    connectedCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    positiveStressConnectedCapital: Annotated[float, Field(ge=0,allow_inf_nan=False)]
    assumedWeightedExposure: Annotated[float, Field(ge=0,allow_inf_nan=False)]

class AnalysisResult(Contract):
    schemaVersion: Literal['1.0.0']
    mode: Literal['demo']
    status: Literal['completed','partial']
    portfolioSnapshot: list[Holding]
    scenarioSnapshot: Scenario
    sourceSnapshot: Dataset
    eventSnapshot: list[Event]
    holdingsResults: list[HoldingResult]
    paths: list[PathResult]
    seeds: list[dict]
    totals: Totals
    warnings: list[str]
    sharedDependencies: list[dict]
    coverage: dict
    assumptions: dict

class RunResponse(AnalysisResult):
    id: Identifier
    runId: Identifier
    requestId: Identifier
    draftRevision: int
    ownerId: str | None
    portfolioId: Identifier
    inputHash: Annotated[str, Field(min_length=64,max_length=64)]
    startedAt: str
    completedAt: str
    storage: str

class ComparisonResponse(Contract):
    schemaVersion: Literal['1.0.0']
    requestId: Identifier
    baselineRunId: Identifier
    label: str
    fixedInputHash: str
    baseline: RunResponse
    proposed: AnalysisResult
    transfer: dict
