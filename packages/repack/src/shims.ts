// @ts-ignore
import replaceAll from 'string.prototype.replaceall';

// `.replaceAll` has to be shimmed in Node 14
replaceAll.shim();
