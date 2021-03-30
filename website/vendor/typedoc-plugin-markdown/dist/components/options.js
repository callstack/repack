"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextAwareHelpers = void 0;
const typedoc_1 = require("typedoc");
const components_1 = require("typedoc/dist/lib/output/components");
const theme_1 = require("../theme");
let ContextAwareHelpers = class ContextAwareHelpers extends components_1.ContextAwareRendererComponent {
    initialize() {
        super.initialize();
        // plugin options
        theme_1.default.HANDLEBARS.registerHelper('namedAnchors', () => {
            return this.namedAnchors;
        });
        theme_1.default.HANDLEBARS.registerHelper('hideBreadcrumbs', () => {
            return this.hideBreadcrumbs;
        });
        theme_1.default.HANDLEBARS.registerHelper('hidePageTitle', () => {
            return this.hidePageTitle;
        });
        theme_1.default.HANDLEBARS.registerHelper('indexTitle', () => {
            return this.indexTitle;
        });
        // utility helper
        theme_1.default.HANDLEBARS.registerHelper('relativeURL', (url) => {
            return url
                ? this.publicPath
                    ? this.publicPath + url
                    : this.getRelativeUrl(url)
                : url;
        });
    }
};
__decorate([
    typedoc_1.BindOption('publicPath')
], ContextAwareHelpers.prototype, "publicPath", void 0);
__decorate([
    typedoc_1.BindOption('namedAnchors')
], ContextAwareHelpers.prototype, "namedAnchors", void 0);
__decorate([
    typedoc_1.BindOption('hideBreadcrumbs')
], ContextAwareHelpers.prototype, "hideBreadcrumbs", void 0);
__decorate([
    typedoc_1.BindOption('hidePageTitle')
], ContextAwareHelpers.prototype, "hidePageTitle", void 0);
__decorate([
    typedoc_1.BindOption('indexTitle')
], ContextAwareHelpers.prototype, "indexTitle", void 0);
ContextAwareHelpers = __decorate([
    components_1.Component({ name: 'options' })
], ContextAwareHelpers);
exports.ContextAwareHelpers = ContextAwareHelpers;
