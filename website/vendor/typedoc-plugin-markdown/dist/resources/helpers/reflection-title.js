"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reflectionTitle = void 0;
const theme_1 = require("../../theme");
const escape_1 = require("./escape");
function reflectionTitle(shouldEscape = true) {
    const title = [''];
    if (this.model && this.model.kindString && this.url !== this.project.url) {
        title.push(`<span>${this.model.kindString}:</span> `);
    }
    if (this.url === this.project.url) {
        title.push('API documentation');
    }
    else {
        title.push(shouldEscape ? escape_1.escape(this.model.name) : this.model.name);
        if (this.model.typeParameters) {
            const typeParameters = this.model.typeParameters
                .map((typeParameter) => typeParameter.name)
                .join(', ');
            title.push(`<${typeParameters}${shouldEscape ? '\\>' : '>'}`);
        }
        title.push(`\n\n<div data-title="${this.model.name}"></div>\n\n`);
    }
    return title.join('');
}
exports.reflectionTitle = reflectionTitle;
