"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexSignatureTitle = void 0;
const type_1 = require("./type");
function indexSignatureTitle() {
    const md = ['▪'];
    const parameters = this.parameters
        ? this.parameters.map((parameter) => {
            return `${parameter.name}: ${type_1.type.call(parameter.type)}`;
        })
        : [];
    md.push(`\[${parameters.join('')}\]: ${type_1.type.call(this.type)}`);
    return md.join(' ');
}
exports.indexSignatureTitle = indexSignatureTitle;
