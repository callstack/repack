"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escape = void 0;
function escape(str) {
    return str
        .replace(/>/g, '\\>')
        .replace(/_/g, '\\_')
        .replace(/`/g, '\\`')
        .replace(/\|/g, '\\|');
}
exports.escape = escape;
