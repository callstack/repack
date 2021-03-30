"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reflectionPath = void 0;
const typedoc_1 = require("typedoc");
const relative_url_1 = require("./relative-url");
function reflectionPath() {
    if (this.model) {
        if (this.model.kind && this.model.kind !== typedoc_1.ReflectionKind.Module) {
            const title = [];
            if (this.model.parent && this.model.parent.parent) {
                if (this.model.parent.parent.parent) {
                    title.push(`[${this.model.parent.parent.name}](${relative_url_1.relativeURL(this.model.parent.parent.url)})`);
                }
                title.push(`[${this.model.parent.name}](${relative_url_1.relativeURL(this.model.parent.url)})`);
            }
            title.push(this.model.name);
            return title.length > 1 ? `${title.join('.')}` : null;
        }
    }
    return null;
}
exports.reflectionPath = reflectionPath;
