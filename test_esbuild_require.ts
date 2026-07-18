export function doTest() {
  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const executeFn = new AsyncFunction("require", "return require('path').resolve('.');");
  return executeFn(require);
}
console.log("Result:", doTest());
