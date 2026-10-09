/** Input edits invalidate in-flight work, even when a service ignores AbortSignal. */
export class LatestRequest {
  revision=0; sequence=0; controller=null;
  invalidate() {this.revision++;this.sequence++;this.controller?.abort();}
  async run(operation,commit) {
    this.controller?.abort();this.controller=new AbortController();
    const sequence=++this.sequence,revision=this.revision;
    let result;
    try {result=await operation({signal:this.controller.signal,revision});}
    catch(error) {if(sequence!==this.sequence||revision!==this.revision)return false;throw error;}
    if (sequence!==this.sequence||revision!==this.revision) return false;
    commit(result);return true;
  }
}
