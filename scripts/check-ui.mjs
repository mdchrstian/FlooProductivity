import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const nodes = new Map(),
  events = {};
function node(key) {
  if (!nodes.has(key))
    nodes.set(key, {
      innerHTML: "",
      textContent: "",
      dataset: {},
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {},
      open: false,
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
      },
    });
  return nodes.get(key);
}
const sandbox = {
  console,
  structuredClone,
  crypto,
  Date,
  Math,
  JSON,
  String,
  Number,
  Object,
  Array,
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  localStorage: { getItem: () => null, setItem() {} },
  location: { hash: "" },
  window: { scrollTo() {}, addEventListener() {} },
  document: {
    querySelector: node,
    querySelectorAll: () => [],
    addEventListener: (name, fn) => (events[name] = fn),
  },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("dist/app.js", "utf8"), sandbox);
const evaluate = (code) => vm.runInContext(code, sandbox);
for (const page of [
  "dashboard",
  "academic",
  "committee",
  "calendar",
  "notes",
  "settings",
  "focus",
]) {
  evaluate(`navigate('${page}')`);
  assert.ok(node("main").innerHTML.length > 100, `${page} renders`);
  assert.ok(
    !node("main").innerHTML.includes("undefined"),
    `${page} has no unresolved data`,
  );
}
evaluate("selectedContext='c1'; page='board'; render()");
assert.match(node("main").innerHTML, /Sedang dikerjakan/);
assert.equal(evaluate("esc('<img onerror=1>')"), "&lt;img onerror=1&gt;");
assert.equal(evaluate("formatTime()"), "25:00");
evaluate(
  "data.tasks=[]; data.notes=[]; data.courses=[]; data.events=[]; navigate('dashboard')",
);
assert.match(node("main").innerHTML, /Tidak ada tugas/);
assert.ok(!node("main").innerHTML.includes("NaN"));
evaluate("navigate('notes')");
assert.match(node("main").innerHTML, /Belum ada catatan/);
evaluate("data=structuredClone(seed); save(); navigate('dashboard')");
events.change({ target: { dataset: { check: "t1" }, checked: true } });
assert.equal(evaluate("data.tasks.find(t=>t.id==='t1').status"), "done");
events.change({ target: { dataset: { status: "t1" }, value: "todo" } });
assert.equal(evaluate("data.tasks.find(t=>t.id==='t1').status"), "todo");
events.change({
  target: { dataset: { setting: "committee" }, checked: false },
});
assert.equal(evaluate("activeTasks().some(t=>isCommittee(t.context))"), false);
evaluate("form('task')");
assert.equal(node("dialog").open, true);
assert.match(node("#dialog-content").innerHTML, /required/);
evaluate("data=structuredClone(seed); month=11; year=2026; calendar()");
console.log(
  "PASS: 7 pages, Kanban markup, escaping, timer formatting, empty states, task changes, module filtering, form markup. Code-level checks only; no browser click-through.",
);
