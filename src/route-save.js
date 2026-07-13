"use strict";
/* The route save envelope and its storage IO. Owns the localStorage key, the
   version gate, and the read/write/clear codecs; storage is injected so the
   codecs are testable without a browser. The envelope shape (routeState + run +
   market/opening/combat) is the v1 payload; R4's later commits add the v2
   aggregate and a v1 to v2 migration behind this same module. */
import {MAP_VERSION} from './map.js';

export const ROUTE_SAVE_VERSION = 1;
export const ROUTE_KEY = 'bb-route-run';

/* read + version-gate; a save from a stale generator or save version is dropped
   so restore falls back to a fresh run rather than trusting an old shape */
export function readRouteSave(storage){
  if(!storage)return null;
  try{
    const d=JSON.parse(storage.getItem(ROUTE_KEY)||'null');
    if(!d||d.saveVersion!==ROUTE_SAVE_VERSION||d.mapVersion!==MAP_VERSION){
      if(d)storage.removeItem(ROUTE_KEY);
      return null;
    }
    return d;
  }catch(e){return null;}
}
export function writeRouteSave(storage,envelope){
  if(!storage)return;
  try{storage.setItem(ROUTE_KEY,JSON.stringify(envelope));}catch(e){}
}
export function clearRouteSave(storage){
  if(!storage)return;
  try{storage.removeItem(ROUTE_KEY);}catch(e){}
}
