"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchy = void 0;
const spaces_1 = require("./spaces");
const type_1 = require("./type");
function hierarchy(level) {
    const md = [];
    const symbol = level > 0 ? getSymbol(level) : '*';
    this.types.forEach((hierarchyType) => {
        if (this.isTarget) {
            md.push(`${symbol} **${hierarchyType}**`);
        }
        else {
            md.push(`${symbol} ${type_1.type.call(hierarchyType)}`);
        }
    });
    if (this.next) {
        md.push(hierarchy.call(this.next, level + 1));
    }
    return md.join('\n\n');
}
exports.hierarchy = hierarchy;
function getSymbol(level) {
    return spaces_1.spaces(2) + [...Array(level)].map(() => '↳').join('');
}
