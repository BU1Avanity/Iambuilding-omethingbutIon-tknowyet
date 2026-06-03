const btn = document.getElementById("btn");
const reset = document.getElementById("reset");
const countEl = document.getElementById("count");
const form = document.getElementById("add-goal");
const goalInput = document.getElementById("goal-input");
const goalsList = document.getElementById("goals");

let count = 0;

btn.addEventListener("click", () => {
  count += 1;
  countEl.textContent = String(count);
});

reset.addEventListener("click", () => {
  count = 0;
  countEl.textContent = "0";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = goalInput.value.trim();
  if (!text) return;

  const li = document.createElement("li");
  li.textContent = text;
  goalsList.appendChild(li);
  goalInput.value = "";
});
