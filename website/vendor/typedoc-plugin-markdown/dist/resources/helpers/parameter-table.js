"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parameterTable = void 0;
const typedoc_1 = require("typedoc");
const comment_1 = require("./comment");
const escape_1 = require("./escape");
const strip_line_breaks_1 = require("./strip-line-breaks");
const type_1 = require("./type");
function parameterTable(kind) {
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
        var _a, _b, _c, _d;
        const shouldFlatten = ((_b = (_a = current.type) === null || _a === void 0 ? void 0 : _a.declaration) === null || _b === void 0 ? void 0 : _b.kind) === typedoc_1.ReflectionKind.TypeLiteral && ((_d = (_c = current.type) === null || _c === void 0 ? void 0 : _c.declaration) === null || _d === void 0 ? void 0 : _d.children);
        return shouldFlatten
            ? [...acc, current, ...flattenParams(current)]
            : [...acc, current];
    };
    return table(this.reduce((acc, current) => parseParams(current, acc), []), kind);
}
exports.parameterTable = parameterTable;
function table(parameters, kind) {
    const showDefaults = hasDefaultValues(kind, parameters);
    const showTypes = kind === 'parameters' ? true : hasTypes(parameters);
    const comments = parameters.map((param) => { var _a, _b, _c, _d; return !!((_b = (_a = param.comment) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.trim()) || !!((_d = (_c = param.comment) === null || _c === void 0 ? void 0 : _c.shortText) === null || _d === void 0 ? void 0 : _d.trim()); });
    const hasComments = !comments.every((value) => !value);
    const headers = ['Name'];
    if (showTypes) {
        headers.push('Type');
    }
    if (showDefaults) {
        headers.push(kind === 'parameters' ? 'Default value' : 'Default');
    }
    if (hasComments) {
        headers.push('Description');
    }
    const rows = parameters.map((parameter) => {
        const row = [];
        row.push(`\`${parameter.flags.isRest ? '...' : ''}${parameter.name}${parameter.flags.isOptional ? '?' : ''}\``);
        if (showTypes) {
            row.push(parameter.type ? type_1.type.call(parameter.type, 'object') : '-');
        }
        if (showDefaults) {
            row.push(getDefaultValue(parameter));
        }
        if (hasComments) {
            if (parameter.comment) {
                row.push(strip_line_breaks_1.stripLineBreaks(comment_1.comment.call(parameter.comment)).replace(/\|/g, '\\|'));
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
function getDefaultValue(parameter) {
    if (parameter instanceof typedoc_1.TypeParameterReflection) {
        return parameter.default ? type_1.type.call(parameter.default) : '-';
    }
    return parameter.defaultValue && parameter.defaultValue !== '...'
        ? escape_1.escape(parameter.defaultValue)
        : '-';
}
function hasDefaultValues(kind, parameters) {
    const defaultValues = kind === 'parameters'
        ? parameters.map((param) => param.defaultValue !== '...' && !!param.defaultValue)
        : parameters.map((param) => !!param.default);
    return !defaultValues.every((value) => !value);
}
function hasTypes(parameters) {
    const types = parameters.map((param) => !!param.type);
    return !types.every((value) => !value);
}
