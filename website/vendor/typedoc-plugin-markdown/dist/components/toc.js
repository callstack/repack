"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableOfContents = void 0;
const typedoc_1 = require("typedoc");
const components_1 = require("typedoc/dist/lib/output/components");
const escape_1 = require("../resources/helpers/escape");
const theme_1 = require("../theme");
let TableOfContents = class TableOfContents extends components_1.ContextAwareRendererComponent {
    initialize() {
        super.initialize();
        theme_1.default.HANDLEBARS.registerHelper('toc', (reflection) => {
            var _a, _b;
            const md = [];
            const isVisible = (_a = reflection.groups) === null || _a === void 0 ? void 0 : _a.some((group) => group.allChildrenHaveOwnDocument());
            if ((!this.hideInPageTOC && reflection.groups) ||
                (isVisible && reflection.groups)) {
                md.push(`## Table of contents\n\n`);
                (_b = reflection.groups) === null || _b === void 0 ? void 0 : _b.forEach((group) => {
                    const groupTitle = group.title;
                    if (group.categories) {
                        group.categories.forEach((category) => {
                            md.push(`### ${category.title} ${groupTitle}\n\n`);
                            pushGroup(category, md);
                            md.push('\n');
                        });
                    }
                    else {
                        if (!this.hideInPageTOC || group.allChildrenHaveOwnDocument()) {
                            md.push(`### ${groupTitle}\n\n`);
                            pushGroup(group, md);
                            md.push('\n');
                        }
                    }
                });
            }
            return md.length > 0 ? md.join('\n') : null;
        });
    }
};
__decorate([
    typedoc_1.BindOption('hideInPageTOC')
], TableOfContents.prototype, "hideInPageTOC", void 0);
TableOfContents = __decorate([
    components_1.Component({ name: 'toc' })
], TableOfContents);
exports.TableOfContents = TableOfContents;
function pushGroup(group, md) {
    const children = group.children.map((child) => `- [${escape_1.escape(child.name)}](${theme_1.default.HANDLEBARS.helpers.relativeURL(child.url)})`);
    md.push(children.join('\n'));
}
