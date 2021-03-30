"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyTable = void 0;
const comment_1 = require("./comment");
const escape_1 = require("./escape");
const signature_title_1 = require("./signature-title");
const strip_line_breaks_1 = require("./strip-line-breaks");
const type_1 = require("./type");
function propertyTable() {
    const comments = this.map((param) => { var _a, _b, _c, _d; return !!((_b = (_a = param.comment) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.trim()) || !!((_d = (_c = param.comment) === null || _c === void 0 ? void 0 : _c.shortText) === null || _d === void 0 ? void 0 : _d.trim()); });
    const hasComments = !comments.every((value) => !value);
    const headers = ['Name', 'Type'];
    if (hasComments) {
        headers.push('Description');
    }
    const flattenParams = (current) => {
        var _a, _b, _c;
        return (_c = (_b = (_a = current.type) === null || _a === void 0 ? void 0 : _a.declaration) === null || _b === void 0 ? void 0 : _b.children) === null || _c === void 0 ? void 0 : _c.reduce((acc, child) => {
            const childObj = {
                ...child,
                name: `${current.name}.${child.name}`,
            };
            return parseParams(childObj, acc);
        }, []);
    };
    const parseParams = (current, acc) => {
        var _a, _b;
        const shouldFlatten = (_b = (_a = current.type) === null || _a === void 0 ? void 0 : _a.declaration) === null || _b === void 0 ? void 0 : _b.children;
        return shouldFlatten
            ? [...acc, current, ...flattenParams(current)]
            : [...acc, current];
    };
    const properties = this.reduce((acc, current) => parseParams(current, acc), []);
    const rows = properties.map((property) => {
        const propertyType = property.type ? property.type : property;
        const row = [];
        const nameCol = [];
        const name = property.name.match(/[\\`\\|]/g) !== null
            ? escape_1.escape(getName(property))
            : getName(property);
        nameCol.push(name);
        row.push(nameCol.join(' '));
        row.push(type_1.type.call(propertyType, 'object'));
        if (hasComments) {
            if (property.comment) {
                row.push(strip_line_breaks_1.stripLineBreaks(comment_1.comment.call(property.comment)));
            }
            else {
                row.push('-');
            }
        }
        return `${row.join(' | ')} |\n`;
    });
    const output = `\n${headers.join(' | ')} |\n${headers
        .map(() => ':------')
        .join(' | ')} |\n${rows.join('')}`;
    return output;
}
exports.propertyTable = propertyTable;
function getName(property) {
    const md = [];
    if (property.flags.isRest) {
        md.push('...');
    }
    if (property.getSignature) {
        md.push(signature_title_1.signatureTitle.call(property.getSignature, 'get', false));
    }
    else if (property.setSignature) {
        md.push(signature_title_1.signatureTitle.call(property.setSignature, 'set', false));
    }
    else {
        md.push(`\`${property.name}\``);
    }
    if (property.flags.isOptional) {
        md.push('?');
    }
    return md.join('');
}
