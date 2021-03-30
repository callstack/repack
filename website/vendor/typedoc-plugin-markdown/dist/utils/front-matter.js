"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageTitle = exports.prependYAML = void 0;
const reflection_title_1 = require("../resources/helpers/reflection-title");
/**
 * Prepends YAML block to a string
 * @param contents - the string to prepend
 * @param vars - object of required front matter variables
 */
const prependYAML = (contents, vars) => {
    return contents
        .replace(/^/, toYAML(vars) + '\n\n')
        .replace(/[\r\n]{3,}/g, '\n\n');
};
exports.prependYAML = prependYAML;
/**
 * Returns the page title as rendered in the document h1(# title)
 * @param page
 */
const getPageTitle = (page) => {
    return reflection_title_1.reflectionTitle.call(page, false);
};
exports.getPageTitle = getPageTitle;
/**
 * Converts YAML object to a YAML string
 * @param vars
 */
const toYAML = (vars) => {
    const yaml = `---
${Object.entries(vars)
        .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${escapeString(value)}"` : value}`)
        .join('\n')}
---`;
    return yaml;
};
// prettier-ignore
const escapeString = (str) => str.replace(/([^\\])'/g, '$1\\\'');
