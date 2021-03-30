"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumbs = void 0;
const typedoc_1 = require("typedoc");
const components_1 = require("typedoc/dist/lib/output/components");
const theme_1 = require("../theme");
let Breadcrumbs = class Breadcrumbs extends components_1.ContextAwareRendererComponent {
    initialize() {
        super.initialize();
        theme_1.default.HANDLEBARS.registerHelper('breadcrumbs', (page) => {
            const breadcrumbs = [];
            const globalsName = this.entryPoints.length > 1 ? 'Modules' : 'Exports';
            breadcrumbs.push(page.url === this.entryDocument
                ? page.project.name
                : `[${page.project.name}](${theme_1.default.HANDLEBARS.helpers.relativeURL(this.entryDocument)})`);
            if (this.readme !== 'none') {
                breadcrumbs.push(page.url === page.project.url
                    ? globalsName
                    : `[${globalsName}](${theme_1.default.HANDLEBARS.helpers.relativeURL('modules.md')})`);
            }
            const breadcrumbsOut = breadcrumb(page, page.model, breadcrumbs);
            return breadcrumbsOut;
        });
    }
};
__decorate([
    typedoc_1.BindOption('entryPoints')
], Breadcrumbs.prototype, "entryPoints", void 0);
__decorate([
    typedoc_1.BindOption('readme')
], Breadcrumbs.prototype, "readme", void 0);
__decorate([
    typedoc_1.BindOption('entryDocument')
], Breadcrumbs.prototype, "entryDocument", void 0);
Breadcrumbs = __decorate([
    components_1.Component({ name: 'breadcrumbs' })
], Breadcrumbs);
exports.Breadcrumbs = Breadcrumbs;
function breadcrumb(page, model, md) {
    if (model && model.parent) {
        breadcrumb(page, model.parent, md);
        if (model.url) {
            md.push(page.url === model.url
                ? `${escape(model.name)}`
                : `[${escape(model.name)}](${theme_1.default.HANDLEBARS.helpers.relativeURL(model.url)})`);
        }
    }
    return md.join(' / ');
}
