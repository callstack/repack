"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signatureTitle = void 0;
const member_symbol_1 = require("./member-symbol");
const type_1 = require("./type");
function signatureTitle(accessor, standalone = true) {
    const md = [];
    if (standalone) {
        md.push(`${member_symbol_1.memberSymbol.call(this)} `);
    }
    if (this.parent && this.parent.flags) {
        md.push(this.parent.flags.map((flag) => `\`${flag}\``).join(' '));
    }
    if (accessor) {
        md.push(`${accessor} **${this.name}**`);
    }
    else if (this.name !== '__call' && this.name !== '__type') {
        md.push(`**${this.name}**`);
    }
    if (this.typeParameters) {
        md.push(`<${this.typeParameters
            .map((typeParameter) => typeParameter.name)
            .join(', ')}\\>`);
    }
    const params = this.parameters
        ? this.parameters
            .map((param) => {
            const paramsmd = [];
            if (param.flags.isRest) {
                paramsmd.push('...');
            }
            paramsmd.push(`\`${param.name}`);
            if (param.flags.isOptional || param.defaultValue) {
                paramsmd.push('?');
            }
            paramsmd.push(`\`: ${type_1.type.call(param.type, true)}`);
            return paramsmd.join('');
        })
            .join(', ')
        : '';
    md.push(`(${params})`);
    if (this.type) {
        md.push(`: ${type_1.type.call(this.type, 'all')}`);
    }
    return md.join('') + (standalone ? '\n' : '');
}
exports.signatureTitle = signatureTitle;
