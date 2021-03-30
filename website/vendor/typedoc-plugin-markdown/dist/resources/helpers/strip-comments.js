"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripComments = void 0;
function stripComments(str) {
    return str
        .replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:^\s*\/\/(?:.*)$)/g, ' ')
        .replace(/\n/g, '')
        .replace(/^\s+|\s+$|(\s)+/g, '$1');
}
exports.stripComments = stripComments;
