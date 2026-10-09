def graph_payload(dataset, holdings=()):
    nodes=[];edges=[]
    groups={'companies':'company','facilities':'facility','routes':'route','waypoints':'waypoint',
            'commodities':'commodity','regions':'region','events':'hazard'}
    for group,kind in groups.items():
        for record in dataset[group]: nodes.append({'id':record['id'],'kind':kind,'label':record.get('name',record.get('hazardType',record['id'])),'record':record})
    def link(source,target,kind,hop=False,key=None):
        edges.append({'id':key or f'{kind}:{source}:{target}','sourceId':source,'targetId':target,'kind':kind,'commercialHop':hop})
    for f in dataset['facilities']:
        link(f['companyId'],f['id'],'operates')
        if f['regionId']: link(f['id'],f['regionId'],'located_in')
    for e in dataset['commercialEdges']: link(e['supplierCompanyId'],e['customerCompanyId'],'supplies',True,e['id'])
    for u in dataset['routeUsage']: link(u['companyId'],u['routeId'],'uses_route',key=u['id'])
    for r in dataset['routes']:
        for w in r['waypointIds']: link(r['id'],w,'passes_through')
        for region in r['regionIds']: link(r['id'],region,'passes_through')
    for s in dataset['supplyItems']:
        if s['commodityId']: link(s['supplierId'],s['commodityId'],'provides',key=s['id'])
    for e in dataset['events']:
        for target in e['affectedEntityIds']+e['geographicTargets']: link(e['id'],target,'exposed_to')
    if holdings:
        nodes.append({'id':'portfolio:current','kind':'portfolio','label':'Portfolio capital','record':{'provenance':'synthetic'}})
        for h in holdings:
            if h['companyId'] and h['matchingStatus']=='matched': link('portfolio:current',h['companyId'],'holds')
    return {'schemaVersion':'1.0.0','datasetVersion':dataset['datasetVersion'],'nodes':nodes,'edges':edges}
