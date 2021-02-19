const b = import('./b');

b.then(({ b }) => console.log(b)).catch(console.error);
