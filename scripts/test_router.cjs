const { routeRequest } = require('./dist/server.cjs'); 
async function run() {
  const result = await routeRequest("Hello", [], "You are a helpful assistant");
  console.log(result);
}
run();
