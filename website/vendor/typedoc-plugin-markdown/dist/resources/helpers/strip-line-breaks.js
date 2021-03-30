"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripLineBreaks = void 0;
function stripLineBreaks(str) {
    return str
        ? str.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ')
        : '';
}
exports.stripLineBreaks = stripLineBreaks;
