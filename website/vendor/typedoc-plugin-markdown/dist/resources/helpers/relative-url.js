"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.relativeURL = void 0;
const theme_1 = require("../../theme");
function relativeURL(url) {
    return theme_1.default.HANDLEBARS.helpers.relativeURL(url);
}
exports.relativeURL = relativeURL;
