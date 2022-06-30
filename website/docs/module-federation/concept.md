# Concept

Before diving deep into Module Federation, it's important to understand how [Code Splitting](../code-splitting/concept) works in React Native with Re.Pack
and what are the challenges.

Module Federation is on a high level, more sophisticated, more complex and more challenging [Code Splitting](../code-splitting/concept) and additional benefits,
which shine the most at scale, in big codebase or in very specific use cases.

:::tip

We highly recommend to read and understand [Code Splitting](../code-splitting/concept) first, before trying Module Federation:

- [Concept](../code-splitting/concept)
- [Usage](../code-splitting/usage)
- [Glossary](../code-splitting/glossary)

:::

:::info

Module Federation support in Re.Pack is still at early stages. We believe it should work for many cases, but if there's a use-case, which we don't support,
don't hesitate to reach out and ask about it.

:::

## What is Module Federation?

Module Federation is an architecture, which splits the application into multiple pieces. These pieces are called containers.
Similarly to micro-services, Module Federation splits application into a distributed frontends, sometimes referred to as micro-frontends.

![Monolith vs Module Federation diagram](../../static/img/monolith_vs_mf.svg)


### Benefits

The main benefits or Module Federation are:

- Ability to split application into multiple isolated micro-frontends.
- Ability to customize build configuration and process for each micro-frontend.
- Ability to dynamically load micro-frontends on demand.
- Ability to load different versions of the micro-fontends.
- Ability to use external micro-frontends.

Keep in mind that this list is not exhaustive. It's possible you would benefit from Module Federation in another way.

### Challenges

However, not every project or application is a good fit for Module Federation. Due to nature of Module Federation there's are few challenges and overheads you need to consider:

- It's easy to cause dependency duplication if you're using incompatible versions in micro-frontends.
- It requires coordination when defining (at least) names of the containers - otherwise, your micro-frontends might not be compatible.
- It complicates deployment - each micro-frontend has to be deployed and available to the clients (usually via Internet).
- It complicates release management - you need to make sure containers are as much isolated as possible and not co-dependent on each other, otherwise you need to make sure that dependent containers are released altogether.
- ... - there might be more challenges, depending on your use-case, the company, policies and specifics of your project.

:::tip

We always recommend to create a prototype or a Proof-of-Concept application, to better understand the challenges and forsee potential problems and effort needed to adopt Module Federation.

:::


### Limitations

Here's a list of currently know limitations:

- React Native requires JavaScript to synchronously perform initialization, meaning React and React Native must available in the main bundle. In practice, this means they must be `eager` and a `singleton`.
- The host application (the application usually released to the stores) needs to perform React and React Native initialization - some of the code will have to be baked into the application, it's not possible to load __all__ of the JavaScript code dynamically. If you're using React Native in brownfield setup, this point might not necessarily be true.

:::tip

You should also consider limitations or T&C of the store you would be deploying the application to. You can read more on [Code Splitting page](../code-splitting/concept) - the same limitations and caveats apply.

:::

## How to use Module Federation?

When adopting Module Federation, it' will make it easier to think about it using a [graph](https://en.wikipedia.org/wiki/Graph_(abstract_data_type)) analogy:

- A whole graph is your project - it can be a monorepo and multiple repos.
- Each vertex in a graph is a micro-frontend - you can also think about vertices as containers.
- Each edge between 2 vertices in a graph is an import connection between micro-frontends (or containers) - this import connection can be synchronous or asynchronous.
- The entrypoint into the graph is a `host` (also referred to as `shell`) - it's a special vertex (meaning micro-frontend), which initializes the application environment (sets up React Native).

With this information, an example of such graph could be:

![Module Federation graph](../../static/img/mf_graph.svg)

<!--
graph analogy
vertex is a container
edge is an async import or synchronous import
each container can have a sub graph with chunks

benefits
separate codebase, pipelines, isolation

challenges
deps synchronisation, potential duplication, deployment

limitation
rn needs a host aka shell
-->