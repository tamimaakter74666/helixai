export function test() {
  try {
    console.log(require);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
