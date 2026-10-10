export function HoldingEvidence({evidence,holding}){
 const status=evidence.holding(holding);
 return <div aria-label="Holding evidence"><small title={status.operating.detail}>{status.operating.text}</small><br/><small title={status.dependence.detail}>{status.dependence.text}</small></div>;
}
