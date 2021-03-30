"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comment = void 0;
const theme_1 = require("../../theme");
function comment() {
    const md = [];
    if (this.shortText) {
        md.push(theme_1.default.HANDLEBARS.helpers.comment.call(this.shortText));
    }
    if (this.text) {
        md.push(theme_1.default.HANDLEBARS.helpers.comment.call(this.text));
    }
    if (this.tags) {
        const tags = this.tags.map((tag) => `**\`${tag.tagName}\`** ${tag.text
            ? theme_1.default.HANDLEBARS.helpers.comment.call(tag.text)
            : ''}`);
        md.push(tags.join('\n\n'));
    }
    return md.join('\n\n');
}
exports.comment = comment;
