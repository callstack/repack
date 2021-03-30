"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownPlugin = void 0;
const fs = require("fs");
const path = require("path");
const typedoc_1 = require("typedoc");
const converter_1 = require("typedoc/dist/lib/converter");
const components_1 = require("typedoc/dist/lib/converter/components");
const theme_1 = require("./theme");
let MarkdownPlugin = class MarkdownPlugin extends components_1.ConverterComponent {
    initialize() {
        this.listenTo(this.owner, {
            [converter_1.Converter.EVENT_BEGIN]: this.onBegin,
            [converter_1.Converter.EVENT_RESOLVE_BEGIN]: this.onResolveBegin,
        });
    }
    /**
     * Overide default assets
     */
    onBegin() {
        typedoc_1.Renderer.getDefaultTheme = () => path.join(__dirname, 'resources');
    }
    /**
     * Load markdown theme and perform additional checks
     */
    onResolveBegin() {
        const themeDir = path.join(__dirname);
        if (![themeDir, 'default', 'markdown'].includes(this.theme)) {
            // For custom themes check that the theme is a markdown theme
            // If it is return and pass through to renderer
            const themeFileName = path.resolve(path.join(this.theme, 'theme.js'));
            if (fs.existsSync(themeFileName) && this.isMarkdownTheme(themeFileName)) {
                return;
            }
            this.application.logger.warn(`[typedoc-plugin-markdown] '${this.theme}' is not a recognised markdown theme. If an html theme is required, please disable this plugin.`);
        }
        // Set the default markdown theme
        this.application.options.setValue('theme', themeDir);
    }
    /**
     * Checks if the custom theme class is initiated from markdown theme
     */
    isMarkdownTheme(themeFileName) {
        try {
            const ThemeClass = require(themeFileName).default;
            return ThemeClass.prototype instanceof theme_1.default;
        }
        catch (e) {
            return false;
        }
    }
};
__decorate([
    typedoc_1.BindOption('theme')
], MarkdownPlugin.prototype, "theme", void 0);
MarkdownPlugin = __decorate([
    components_1.Component({ name: 'markdown' })
], MarkdownPlugin);
exports.MarkdownPlugin = MarkdownPlugin;
