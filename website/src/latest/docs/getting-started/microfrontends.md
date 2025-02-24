# Microfrontends

Microfrontends (MFEs) are an architectural approach that breaks down a web application’s frontend into smaller, independently deployable pieces that can be downloaded on demand. Think of them as the frontend equivalent of microservices: instead of one massive, tangled codebase, you get modular chunks that different teams can own, develop, and ship on their own timelines. It's important to note that we're not talking about producing a single JS bundle from multiple independent teams. It's about producing many JS bundles that can be later downloaded on demand by a mobile app.

While web MFEs and microservices are often about using independent tech stacks, it's different on mobile iOS and Android ecosystems due to platform constraints and app store rules that typically prevent loading any compiled code.

Re.Pack is largely designed to enable microfrontends on mobile. It's one of the key differences between other React Native bundlers, such as Metro, which don't support this architecture out of the box.

## Use Cases

Mobile microfrontends shine in scenarios where complexity and team size grow beyond what a monolith can handle. Here are some use cases we found compelling for this archiecture:

- **Strong Team Boundaries**: If you’ve got separate teams working on different parts of an app (say, one for product listing, another for user settings), and often at different geographical locations or even company divisions, MFEs let each team own their domain end-to-end without stepping on each other’s toes.
- **Independent Deployments**: While React Native allows for over-the-air updates, MFEs offer a more targeted deployments possibility, instead of replacing the whole JavaScript bundle like all OTA solutions out there.
- **Super Apps**: When building a mobile super app with features loaded on demand, MFEs let you ship lightweight containers that pull in functionality as users need it, without them to be available in the initial app bundle, reducing the overall app size.

It's crucial to be sure about what you want to achieve with microfrontends. Adopting this architecture, as with any other engineering design choice, comes with its own complexity. Make sure the trade-offs are worth it. And avoid using microforntends because it's some trend to follow.

## Module Federation

Re.Pack makes it possible to use Rspack, leveraging whole webpack ecosystem. Thanks to that you can use one of the key features built around this ecosystem, which was designed to solve common pains working with microfrontends: Module Federation. Module Federation is an architectural pattern for the decentralization of JavaScript applications. It allows you to share code and resources among multiple JavaScript applications (or microfrontends).

Re.Pack supports Module Federation since v3 in its own flavor, that was different from using it on the web. However, since then, the Module Federation 2 was released, which adds dynamic type hinting, Manifest, Federation Runtime, and Runtime Plugin System. These new features allowed us to better integrate this architecture into React Native runtime—which differs from the web—while retaining the same API that web developers are used to.

## Limitations

While Module Federation 2 enables Re.Pack to use the same conventions and APIs as on the web, mobile microfrontends are more limited due to native platform and app stores constraints:

- You must use the same React, React Native and native dependencies versions across all MFEs
- All native modules need to be available in the host application (the one that is released to app stores)
- You can only dynamically load JavaScript code from a microfrontend – this code can reference and use native modules that are bundled within the host app

## Challenges

One of the complexities of microfrontends is version management. It’s challenging to handle on your own and can be quite cumbersome based on our experience. If you’re open to third-party services, we recommend Zephyr Cloud, which simplifies this problem, allows for sub-second deploys, and officially [integrates with Re.Pack](https://docs.zephyr-cloud.io/recipes/repack-mf) in a form of a Rspack/webpack plugin.

## Examples

Below you can find open source examples of how you can set up Re.Pack with microfrontends:

- [Super App Showcase](https://github.com/callstack/super-app-showcase) – MFEs versioned using a custom script
- [Zephyr Re.Pack Example](https://github.com/ZephyrCloudIO/zephyr-repack-example) – MFEs versioned using Zephyr Cloud
