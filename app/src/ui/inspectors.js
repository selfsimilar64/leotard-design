// Inspector panels per selection kind ({ kind: Component }). Each phase registers its own.
export const inspectors = {};
export function registerInspector(kind, component) { inspectors[kind] = component; }
