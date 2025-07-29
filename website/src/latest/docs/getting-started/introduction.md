# Introduction

Before diving deep into Re.Pack and introducing it into project, it's important to understand when and why to use Re.Pack and how does it compare with alternatives.

## About Re.Pack

Re.Pack is a modern toolkit that wraps Rspack and webpack to make them work seamlessly with React Native applications.

The toolkit includes:

- **React Native-specific plugins and loaders** that handle platform differences (platform specific files, assets, etc.)
- **Integrated development server** with Hot Module Replacement (HMR) + React Refresh, and debugging capabilities through React Native Devtools
- **Runtime modules** like ScriptManager for advanced features like code splitting and Module Federation

## Design goals

Re.Pack is designed to be a **drop-in replacement for Metro** with the primary goal of making migration as easy as possible. The toolkit aims to:

- Provide seamless integration with existing React Native projects
- Maintain compatibility with Metro's expected behavior while offering enhanced capabilities
- Minimize configuration changes needed during migration
- Offer a smooth transition path from Metro to advanced bundling features

This approach ensures teams can adopt Re.Pack incrementally, starting with basic Metro replacement and gradually leveraging advanced features like Module Federation and custom webpack configurations as needed.

## Why & when

Re.Pack is particularly valuable in these scenarios:

### 1. **Microfrontends with Module Federation**
Re.Pack provides first-class support for Module Federation, enabling you to build microfrontend architectures where different teams can develop and deploy parts of your mobile app independently.

### 2. **High Customizability**
Access to the full Rspack/webpack ecosystem means extensive customization options through loaders, plugins, and advanced configuration. You can implement complex build requirements that aren't possible with Metro.

### 3. **Build Performance**
Rspack's Rust-based architecture provides significant performance improvements for large codebases, especially when combined with advanced caching strategies.

Re.Pack is designed for teams that need these advanced capabilities and have developers willing to familiarize themselves with alternative bundling tools.

:::tip Don't drop Metro just yet!

If you're just starting with React Native, consider sticking with Metro - the default bundler for React Native applications. Re.Pack shines when you have specific requirements that Metro cannot address but is not compatible with tools that assume Metro as a bundler present in the project setup.

:::
