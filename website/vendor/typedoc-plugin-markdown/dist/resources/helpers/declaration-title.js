"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declarationTitle = void 0;
const typedoc_1 = require("typedoc");
const escape_1 = require("./escape");
const member_symbol_1 = require("./member-symbol");
const strip_comments_1 = require("./strip-comments");
const strip_line_breaks_1 = require("./strip-line-breaks");
const type_1 = require("./type");
function declarationTitle() {
    var _a;
    const md = [member_symbol_1.memberSymbol.call(this)];
    if (this.flags && this.flags.length > 0 && !this.flags.isRest) {
        md.push(' ' + this.flags.map((flag) => `\`${flag}\``).join(' '));
    }
    md.push(`${this.flags.isRest ? '... ' : ''} **${escape_1.escape(this.name)}**`);
    if (this instanceof typedoc_1.DeclarationReflection && this.typeParameters) {
        md.push(`<${this.typeParameters
            .map((typeParameter) => typeParameter.name)
            .join(', ')}\\>`);
    }
    md.push(`: ${((_a = this.parent) === null || _a === void 0 ? void 0 : _a.kindOf(typedoc_1.ReflectionKind.Enum)) ? '' : getType(this)}`);
    if (this.defaultValue && this.defaultValue !== '...') {
        md.push(`= ${strip_line_breaks_1.stripLineBreaks(escape_1.escape(strip_comments_1.stripComments(this.defaultValue)))}`);
    }
    return md.join('');
}
exports.declarationTitle = declarationTitle;
function getType(reflection) {
    const reflectionType = reflection.type;
    return type_1.type.call(reflectionType ? reflectionType : reflection, 'object');
}
