"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.breadcrumbs = void 0;
const theme_1 = require("../../theme");
function breadcrumbs() {
    return theme_1.default.HANDLEBARS.helpers.breadcrumbs(this);
}
exports.breadcrumbs = breadcrumbs;
