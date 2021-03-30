"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeAndParent = void 0;
const typedoc_1 = require("typedoc");
const types_1 = require("typedoc/dist/lib/models/types");
const theme_1 = require("../../theme");
function typeAndParent() {
    if (this instanceof types_1.ReferenceType && this.reflection) {
        const md = [];
        const parentReflection = this.reflection.parent;
        if (this.reflection instanceof typedoc_1.SignatureReflection) {
            if (parentReflection &&
                parentReflection.parent &&
                parentReflection.parent.url) {
                md.push(`[${parentReflection.parent.name}](${theme_1.default.HANDLEBARS.helpers.relativeURL(parentReflection.parent.url)})`);
            }
            else if (parentReflection && parentReflection.parent) {
                md.push(parentReflection.parent.name);
            }
        }
        else {
            if (parentReflection && parentReflection.url) {
                md.push(`[${parentReflection.name}](${theme_1.default.HANDLEBARS.helpers.relativeURL(parentReflection.url)})`);
            }
            else if (parentReflection) {
                md.push(parentReflection.name);
            }
            if (this.reflection.url) {
                md.push(`[${this.reflection.name}](${theme_1.default.HANDLEBARS.helpers.relativeURL(this.reflection.url)})`);
            }
            else {
                md.push(this.reflection.name);
            }
        }
        return md.join('.');
    }
    return 'void';
}
exports.typeAndParent = typeAndParent;
