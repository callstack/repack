"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ifShowPageTitle = void 0;
const theme_1 = require("../../theme");
function ifShowPageTitle(options) {
    return theme_1.default.HANDLEBARS.helpers.hidePageTitle()
        ? options.inverse(this)
        : options.fn(this);
}
exports.ifShowPageTitle = ifShowPageTitle;
